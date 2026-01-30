-- Increase decimal precision for financial amounts
-- From Decimal(10, 2) to Decimal(18, 6)
ALTER TABLE "payment_sessions" ALTER COLUMN "amount" TYPE DECIMAL(18, 6);
ALTER TABLE "refunds" ALTER COLUMN "amount" TYPE DECIMAL(18, 6);
