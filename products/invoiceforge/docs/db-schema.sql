-- InvoiceForge Database Schema
-- PostgreSQL 15+
-- All monetary values stored as integers (cents)
-- Tax rates stored as integers (basis points: 850 = 8.50%)
--
-- Generated: 2026-02-01
-- Version: 1.0 (MVP)

-- ─── Extensions ─────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ──────────────────────────────────────────────────────────

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'team');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- ─── Users ──────────────────────────────────────────────────────────

CREATE TABLE users (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                     VARCHAR(255) NOT NULL UNIQUE,
    name                      VARCHAR(255) NOT NULL,
    business_name             VARCHAR(255),
    password_hash             VARCHAR(255),
    google_id                 VARCHAR(255) UNIQUE,
    subscription_tier         subscription_tier NOT NULL DEFAULT 'free',
    invoice_count_this_month  INTEGER NOT NULL DEFAULT 0,
    counter_reset_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invoice_counter           INTEGER NOT NULL DEFAULT 0,
    stripe_customer_id        VARCHAR(255),
    stripe_account_id         VARCHAR(255),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Either password or Google OAuth must be present
    CONSTRAINT users_auth_check CHECK (
        password_hash IS NOT NULL OR google_id IS NOT NULL
    )
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_stripe_customer ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ─── Clients ────────────────────────────────────────────────────────

CREATE TABLE clients (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    address     VARCHAR(500),
    city        VARCHAR(100),
    state       VARCHAR(100),
    zip         VARCHAR(20),
    country     VARCHAR(100) DEFAULT 'US',
    phone       VARCHAR(50),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_user_id ON clients (user_id);
CREATE INDEX idx_clients_user_name ON clients (user_id, name);

-- ─── Invoices ───────────────────────────────────────────────────────

CREATE TABLE invoices (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
    invoice_number    VARCHAR(20) NOT NULL,
    status            invoice_status NOT NULL DEFAULT 'draft',
    invoice_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date          DATE NOT NULL,
    subtotal          INTEGER NOT NULL DEFAULT 0,
    tax_rate          INTEGER NOT NULL DEFAULT 0,
    tax_amount        INTEGER NOT NULL DEFAULT 0,
    total             INTEGER NOT NULL DEFAULT 0,
    currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes             TEXT,
    ai_prompt         TEXT,
    share_token       UUID UNIQUE,
    payment_link      VARCHAR(500),
    stripe_session_id VARCHAR(255),
    paid_at           TIMESTAMPTZ,
    sent_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Total must equal subtotal + tax_amount
    CONSTRAINT invoices_total_check CHECK (total = subtotal + tax_amount),

    -- Monetary values must be non-negative
    CONSTRAINT invoices_amounts_check CHECK (
        subtotal >= 0 AND tax_amount >= 0 AND total >= 0
    ),

    -- Tax rate in basis points (0-10000 = 0%-100%)
    CONSTRAINT invoices_tax_rate_check CHECK (
        tax_rate >= 0 AND tax_rate <= 10000
    )
);

CREATE INDEX idx_invoices_user_id ON invoices (user_id);
CREATE INDEX idx_invoices_user_status ON invoices (user_id, status);
CREATE INDEX idx_invoices_share_token ON invoices (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_invoices_stripe_session ON invoices (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX idx_invoices_client_id ON invoices (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_invoices_due_date ON invoices (due_date) WHERE status = 'sent';

-- ─── Invoice Items ──────────────────────────────────────────────────

CREATE TABLE invoice_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    unit_price  INTEGER NOT NULL,
    amount      INTEGER NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,

    -- Quantity must be positive
    CONSTRAINT items_quantity_check CHECK (quantity > 0),

    -- Unit price must be positive
    CONSTRAINT items_unit_price_check CHECK (unit_price > 0),

    -- Amount must equal quantity * unit_price
    CONSTRAINT items_amount_check CHECK (amount = quantity * unit_price)
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);

-- ─── Sessions ───────────────────────────────────────────────────────

CREATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions (token);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- ─── Password Reset Tokens ─────────────────────────────────────────

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_token ON password_reset_tokens (token);

-- ─── Updated-At Trigger ─────────────────────────────────────────────
-- Automatically update updated_at on row modification

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Overdue Invoice Detection ──────────────────────────────────────
-- This can be run as a scheduled job (cron) or on-demand query.
-- Updates "sent" invoices past their due date to "overdue".

-- Example cron query (run daily):
-- UPDATE invoices
-- SET status = 'overdue', updated_at = NOW()
-- WHERE status = 'sent'
--   AND due_date < CURRENT_DATE;
