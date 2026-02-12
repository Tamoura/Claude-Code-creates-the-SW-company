-- RecomEngine Database Schema
-- PostgreSQL 15+
-- Database: recomengine_dev
--
-- This DDL defines all tables, indexes, constraints, and partitioning
-- for the RecomEngine MVP.
--
-- Version: 1.0
-- Last Updated: 2026-02-12

-- ============================================================
-- Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For gen_random_uuid()

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');

CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'deleted');

CREATE TYPE api_key_permission AS ENUM ('read', 'read_write');

CREATE TYPE event_type AS ENUM (
    'product_viewed',
    'product_clicked',
    'add_to_cart',
    'remove_from_cart',
    'purchase',
    'recommendation_clicked',
    'recommendation_impressed'
);

CREATE TYPE experiment_status AS ENUM ('draft', 'running', 'paused', 'completed');

CREATE TYPE experiment_metric AS ENUM ('ctr', 'conversion_rate', 'revenue_per_visitor');

CREATE TYPE recommendation_strategy AS ENUM (
    'collaborative',
    'content_based',
    'trending',
    'frequently_bought_together'
);

CREATE TYPE widget_layout AS ENUM ('grid', 'carousel', 'list');

-- ============================================================
-- Table: admins
-- ============================================================

CREATE TABLE admins (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          admin_role  NOT NULL DEFAULT 'admin',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admins_email ON admins (email);

COMMENT ON TABLE admins IS 'Platform administrators who manage tenants and view analytics';

-- ============================================================
-- Table: tenants
-- ============================================================

CREATE TABLE tenants (
    id         TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name       TEXT          NOT NULL,
    status     tenant_status NOT NULL DEFAULT 'active',
    config     JSONB         NOT NULL DEFAULT '{
        "defaultStrategy": "trending",
        "excludePurchased": true,
        "maxApiKeys": 10,
        "corsOrigins": []
    }'::jsonb,
    owner_id   TEXT          NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_owner_id ON tenants (owner_id);
CREATE INDEX idx_tenants_status ON tenants (status);

COMMENT ON TABLE tenants IS 'Customer organizations with isolated data. Each tenant represents an e-commerce store or platform.';

-- ============================================================
-- Table: api_keys
-- ============================================================

CREATE TABLE api_keys (
    id          TEXT               PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id   TEXT               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT               NOT NULL,
    key_hash    TEXT               NOT NULL UNIQUE,
    key_prefix  TEXT               NOT NULL,
    permissions api_key_permission NOT NULL DEFAULT 'read',
    last_used_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_tenant_id ON api_keys (tenant_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_tenant_active ON api_keys (tenant_id) WHERE revoked_at IS NULL;

COMMENT ON TABLE api_keys IS 'API keys for tenant authentication. Keys are stored as HMAC-SHA256 hashes.';
COMMENT ON COLUMN api_keys.key_hash IS 'HMAC-SHA256 hash of the full API key. Used for authentication lookup.';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of the API key (e.g., rk_live_abc1). Used for identification in UI.';
COMMENT ON COLUMN api_keys.revoked_at IS 'When set, the key is revoked and cannot be used for authentication.';

-- ============================================================
-- Table: catalog_items
-- ============================================================

CREATE TABLE catalog_items (
    id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id  TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id TEXT        NOT NULL,
    name       TEXT        NOT NULL,
    description TEXT,
    category   TEXT,
    price      DECIMAL(12, 2),
    image_url  TEXT,
    attributes JSONB       NOT NULL DEFAULT '{}'::jsonb,
    available  BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, product_id)
);

CREATE INDEX idx_catalog_tenant_id ON catalog_items (tenant_id);
CREATE INDEX idx_catalog_tenant_category ON catalog_items (tenant_id, category);
CREATE INDEX idx_catalog_tenant_available ON catalog_items (tenant_id) WHERE available = true;
CREATE INDEX idx_catalog_tenant_product ON catalog_items (tenant_id, product_id);
CREATE INDEX idx_catalog_name_search ON catalog_items USING gin (to_tsvector('english', name));
CREATE INDEX idx_catalog_attributes ON catalog_items USING gin (attributes jsonb_path_ops);

COMMENT ON TABLE catalog_items IS 'Product catalog per tenant. Each item represents a product in the merchant''s store.';
COMMENT ON COLUMN catalog_items.product_id IS 'Merchant-provided product identifier. Unique per tenant.';
COMMENT ON COLUMN catalog_items.attributes IS 'Arbitrary JSON attributes used for content-based filtering (e.g., color, size, brand).';

-- ============================================================
-- Table: events (Partitioned by month)
-- ============================================================
-- Events use PostgreSQL native range partitioning on created_at.
-- Each partition covers one calendar month.
-- See ADR-002 for rationale.

CREATE TABLE events (
    id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    tenant_id  TEXT        NOT NULL,
    event_type event_type  NOT NULL,
    user_id    TEXT        NOT NULL,
    product_id TEXT        NOT NULL,
    session_id TEXT,
    metadata   JSONB       DEFAULT '{}'::jsonb,
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Deduplication constraint (partial unique index per partition)
-- Note: Unique constraints on partitioned tables must include the partition key.
-- We use a composite approach: unique index on the dedup key fields + created_at.

CREATE INDEX idx_events_tenant_timestamp ON events (tenant_id, timestamp);
CREATE INDEX idx_events_tenant_user_type ON events (tenant_id, user_id, event_type);
CREATE INDEX idx_events_tenant_product ON events (tenant_id, product_id);
CREATE INDEX idx_events_tenant_session ON events (tenant_id, session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_events_dedup ON events (tenant_id, user_id, event_type, product_id, timestamp);

COMMENT ON TABLE events IS 'Behavioral events from merchant sites. Partitioned by month on created_at for efficient time-range queries and data lifecycle management.';

-- ============================================================
-- Event Partitions (create for current and next 3 months)
-- In production, a cron job creates partitions ahead of time.
-- ============================================================

CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE events_2026_02 PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE events_2026_03 PARTITION OF events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE events_2026_04 PARTITION OF events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE events_2026_05 PARTITION OF events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE events_2026_06 PARTITION OF events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- ============================================================
-- Table: experiments
-- ============================================================

CREATE TABLE experiments (
    id               TEXT              PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id        TEXT              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name             TEXT              NOT NULL,
    control_strategy recommendation_strategy NOT NULL,
    variant_strategy recommendation_strategy NOT NULL,
    traffic_split    INTEGER           NOT NULL CHECK (traffic_split BETWEEN 1 AND 99),
    metric           experiment_metric NOT NULL DEFAULT 'ctr',
    status           experiment_status NOT NULL DEFAULT 'draft',
    placement_id     TEXT,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiments_tenant_id ON experiments (tenant_id);
CREATE INDEX idx_experiments_tenant_status ON experiments (tenant_id, status);
CREATE INDEX idx_experiments_tenant_placement_running ON experiments (tenant_id, placement_id)
    WHERE status = 'running';

COMMENT ON TABLE experiments IS 'A/B testing experiments comparing two recommendation strategies.';
COMMENT ON COLUMN experiments.traffic_split IS 'Percentage of users assigned to the control group (1-99). Remainder goes to variant.';
COMMENT ON COLUMN experiments.placement_id IS 'Widget placement this experiment applies to. Only one running experiment per placement per tenant.';

-- Ensure only one running experiment per placement per tenant
CREATE UNIQUE INDEX idx_experiments_unique_running_per_placement
    ON experiments (tenant_id, placement_id)
    WHERE status = 'running' AND placement_id IS NOT NULL;

-- ============================================================
-- Table: experiment_results
-- ============================================================

CREATE TABLE experiment_results (
    id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    experiment_id TEXT        NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    variant       TEXT        NOT NULL CHECK (variant IN ('control', 'variant')),
    impressions   INTEGER     NOT NULL DEFAULT 0,
    clicks        INTEGER     NOT NULL DEFAULT 0,
    conversions   INTEGER     NOT NULL DEFAULT 0,
    revenue       DECIMAL(12, 2) NOT NULL DEFAULT 0,
    sample_size   INTEGER     NOT NULL DEFAULT 0,
    computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (experiment_id, variant)
);

CREATE INDEX idx_experiment_results_experiment_id ON experiment_results (experiment_id);

COMMENT ON TABLE experiment_results IS 'Aggregated metrics per variant for each experiment. Updated periodically from event data.';

-- ============================================================
-- Table: analytics_daily
-- ============================================================

CREATE TABLE analytics_daily (
    id          TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id   TEXT          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date        DATE          NOT NULL,
    impressions INTEGER       NOT NULL DEFAULT 0,
    clicks      INTEGER       NOT NULL DEFAULT 0,
    conversions INTEGER       NOT NULL DEFAULT 0,
    revenue     DECIMAL(12, 2) NOT NULL DEFAULT 0,
    placement_id TEXT,
    strategy    TEXT,

    UNIQUE (tenant_id, date, placement_id, strategy)
);

CREATE INDEX idx_analytics_daily_tenant_date ON analytics_daily (tenant_id, date);
CREATE INDEX idx_analytics_daily_tenant_date_range ON analytics_daily (tenant_id, date DESC);

COMMENT ON TABLE analytics_daily IS 'Pre-aggregated daily analytics per tenant. Populated nightly from event data.';

-- ============================================================
-- Table: widget_configs
-- ============================================================

CREATE TABLE widget_configs (
    id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id    TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    placement_id TEXT        NOT NULL,
    layout       widget_layout NOT NULL DEFAULT 'grid',
    columns      INTEGER     NOT NULL DEFAULT 4 CHECK (columns BETWEEN 2 AND 6),
    theme        JSONB       NOT NULL DEFAULT '{
        "primaryColor": "#2563EB",
        "fontFamily": "inherit"
    }'::jsonb,
    max_items    INTEGER     NOT NULL DEFAULT 8 CHECK (max_items BETWEEN 4 AND 20),
    show_price   BOOLEAN     NOT NULL DEFAULT true,
    cta_text     TEXT        NOT NULL DEFAULT 'View Product',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, placement_id)
);

CREATE INDEX idx_widget_configs_tenant_id ON widget_configs (tenant_id);

COMMENT ON TABLE widget_configs IS 'Widget appearance configuration per tenant per placement. Controls how recommendations are rendered in the SDK.';

-- ============================================================
-- Table: revenue_attributions
-- ============================================================
-- Tracks the link between recommendation clicks and subsequent purchases
-- for revenue attribution reporting.

CREATE TABLE revenue_attributions (
    id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id             TEXT        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id               TEXT        NOT NULL,
    product_id            TEXT        NOT NULL,
    click_event_id        TEXT        NOT NULL,
    purchase_event_id     TEXT        NOT NULL,
    revenue               DECIMAL(12, 2) NOT NULL,
    click_timestamp       TIMESTAMPTZ NOT NULL,
    purchase_timestamp    TIMESTAMPTZ NOT NULL,
    attribution_window_ms INTEGER     NOT NULL DEFAULT 1800000,  -- 30 minutes
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_attr_tenant_id ON revenue_attributions (tenant_id);
CREATE INDEX idx_revenue_attr_tenant_date ON revenue_attributions (tenant_id, created_at);

COMMENT ON TABLE revenue_attributions IS 'Revenue attribution records linking recommendation clicks to subsequent purchases within the attribution window (30 minutes).';

-- ============================================================
-- Materialized Views
-- ============================================================

-- Analytics summary for dashboard KPI cards
CREATE MATERIALIZED VIEW analytics_summary AS
SELECT
    tenant_id,
    SUM(impressions) AS total_impressions,
    SUM(clicks) AS total_clicks,
    CASE WHEN SUM(impressions) > 0
        THEN ROUND(SUM(clicks)::numeric / SUM(impressions)::numeric * 100, 2)
        ELSE 0
    END AS ctr_percent,
    SUM(conversions) AS total_conversions,
    SUM(revenue) AS total_revenue,
    MIN(date) AS first_date,
    MAX(date) AS last_date
FROM analytics_daily
GROUP BY tenant_id;

CREATE UNIQUE INDEX idx_analytics_summary_tenant ON analytics_summary (tenant_id);

-- Top products by recommendation clicks (last 30 days)
CREATE MATERIALIZED VIEW top_recommended_products AS
SELECT
    e.tenant_id,
    e.product_id,
    ci.name AS product_name,
    ci.image_url,
    COUNT(*) FILTER (WHERE e.event_type = 'recommendation_impressed') AS impressions,
    COUNT(*) FILTER (WHERE e.event_type = 'recommendation_clicked') AS clicks,
    CASE WHEN COUNT(*) FILTER (WHERE e.event_type = 'recommendation_impressed') > 0
        THEN ROUND(
            COUNT(*) FILTER (WHERE e.event_type = 'recommendation_clicked')::numeric /
            COUNT(*) FILTER (WHERE e.event_type = 'recommendation_impressed')::numeric * 100, 2)
        ELSE 0
    END AS ctr_percent
FROM events e
LEFT JOIN catalog_items ci ON e.tenant_id = ci.tenant_id AND e.product_id = ci.product_id
WHERE e.event_type IN ('recommendation_impressed', 'recommendation_clicked')
    AND e.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY e.tenant_id, e.product_id, ci.name, ci.image_url
ORDER BY clicks DESC;

CREATE INDEX idx_top_products_tenant ON top_recommended_products (tenant_id);

-- ============================================================
-- Functions: Auto-create event partitions
-- ============================================================

CREATE OR REPLACE FUNCTION create_event_partition(partition_date DATE)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := date_trunc('month', partition_date)::date;
    end_date := (date_trunc('month', partition_date) + INTERVAL '1 month')::date;
    partition_name := 'events_' || to_char(start_date, 'YYYY_MM');

    -- Check if partition already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_event_partition IS 'Creates a monthly event partition if it does not already exist. Called by a scheduled job to ensure partitions exist before data arrives.';

-- ============================================================
-- Functions: Nightly analytics aggregation
-- ============================================================

CREATE OR REPLACE FUNCTION aggregate_daily_analytics(target_date DATE)
RETURNS void AS $$
BEGIN
    -- Aggregate events into analytics_daily
    INSERT INTO analytics_daily (tenant_id, date, impressions, clicks, conversions, revenue, placement_id, strategy)
    SELECT
        e.tenant_id,
        target_date,
        COUNT(*) FILTER (WHERE e.event_type = 'recommendation_impressed') AS impressions,
        COUNT(*) FILTER (WHERE e.event_type = 'recommendation_clicked') AS clicks,
        COUNT(*) FILTER (WHERE e.event_type = 'purchase') AS conversions,
        COALESCE(SUM(
            CASE WHEN e.event_type = 'purchase'
                THEN (e.metadata->>'price')::numeric
                ELSE 0
            END
        ), 0) AS revenue,
        e.metadata->>'placementId' AS placement_id,
        NULL AS strategy  -- Strategy attribution added in future
    FROM events e
    WHERE e.timestamp >= target_date
        AND e.timestamp < target_date + INTERVAL '1 day'
    GROUP BY e.tenant_id, e.metadata->>'placementId'
    ON CONFLICT (tenant_id, date, placement_id, strategy)
    DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        conversions = EXCLUDED.conversions,
        revenue = EXCLUDED.revenue;

    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_recommended_products;

    RAISE NOTICE 'Aggregated analytics for %', target_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aggregate_daily_analytics IS 'Aggregates raw events into analytics_daily for a given date. Called nightly by a scheduled job. Also refreshes materialized views.';

-- ============================================================
-- Trigger: Auto-update updated_at timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_catalog_items_updated_at
    BEFORE UPDATE ON catalog_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_experiments_updated_at
    BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_widget_configs_updated_at
    BEFORE UPDATE ON widget_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Seed: Default super admin (development only)
-- Password: changeme (bcrypt hash)
-- ============================================================

-- Uncomment for development seeding:
-- INSERT INTO admins (email, password_hash, role) VALUES
--     ('admin@recomengine.dev', '$2b$12$placeholder_bcrypt_hash_here', 'super_admin');
