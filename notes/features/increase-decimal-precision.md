# Increase Decimal Precision for Financial Amounts

## Summary
Change database Decimal precision from Decimal(10,2) to Decimal(18,6)
for all financial amount fields in the stablecoin-gateway schema.

## Rationale
- Decimal(10,2) caps at $99,999,999.99 and cannot represent sub-cent
  precision
- Decimal(18,6) supports up to $999,999,999,999.999999
- USDC/USDT stablecoins use 6 decimal places on-chain
- This change aligns database precision with on-chain token precision

## Affected Models
- `PaymentSession.amount`: line 62 in schema.prisma
- `Refund.amount`: line 122 in schema.prisma

## TDD Plan
1. RED: Test that schema declares Decimal(18,6) for both fields
2. RED: Test that migration SQL file exists with ALTER COLUMN
3. GREEN: Update schema.prisma, create migration SQL
4. REFACTOR: Verify clean state

## Branch
`feature/stablecoin-gateway/increase-decimal-precision`
