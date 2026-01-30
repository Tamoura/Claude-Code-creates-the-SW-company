import * as fs from 'fs';
import * as path from 'path';

describe('Decimal precision for financial amounts', () => {
  const schemaPath = path.resolve(
    __dirname,
    '../../prisma/schema.prisma',
  );
  const migrationsDir = path.resolve(
    __dirname,
    '../../prisma/migrations',
  );

  let schemaContent: string;

  beforeAll(() => {
    schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  });

  describe('PaymentSession model', () => {
    it('should declare amount as Decimal(18, 6)', () => {
      // Extract the PaymentSession model block
      const modelMatch = schemaContent.match(
        /model\s+PaymentSession\s*\{([\s\S]*?)\n\}/,
      );
      expect(modelMatch).not.toBeNull();

      const modelBody = modelMatch![1];

      // The amount field should use Decimal(18, 6)
      expect(modelBody).toMatch(
        /amount\s+Decimal\s+@db\.Decimal\(18,\s*6\)/,
      );

      // It should NOT use the old Decimal(10, 2)
      expect(modelBody).not.toMatch(
        /amount\s+Decimal\s+@db\.Decimal\(10,\s*2\)/,
      );
    });
  });

  describe('Refund model', () => {
    it('should declare amount as Decimal(18, 6)', () => {
      // Extract the Refund model block
      const modelMatch = schemaContent.match(
        /model\s+Refund\s*\{([\s\S]*?)\n\}/,
      );
      expect(modelMatch).not.toBeNull();

      const modelBody = modelMatch![1];

      // The amount field should use Decimal(18, 6)
      expect(modelBody).toMatch(
        /amount\s+Decimal\s+@db\.Decimal\(18,\s*6\)/,
      );

      // It should NOT use the old Decimal(10, 2)
      expect(modelBody).not.toMatch(
        /amount\s+Decimal\s+@db\.Decimal\(10,\s*2\)/,
      );
    });
  });

  describe('Migration file', () => {
    it('should have a migration for increasing decimal precision', () => {
      // Find migration directories that match our naming
      const migrationDirs = fs
        .readdirSync(migrationsDir)
        .filter((entry) =>
          entry.includes('increase_decimal_precision'),
        );

      expect(migrationDirs.length).toBeGreaterThanOrEqual(1);

      // Read the migration SQL
      const migrationDir = migrationDirs[0];
      const sqlPath = path.join(
        migrationsDir,
        migrationDir,
        'migration.sql',
      );
      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

      // Should ALTER payment_sessions amount column
      expect(sqlContent).toMatch(
        /ALTER\s+TABLE\s+"payment_sessions"\s+ALTER\s+COLUMN\s+"amount"\s+TYPE\s+DECIMAL\(18,\s*6\)/i,
      );

      // Should ALTER refunds amount column
      expect(sqlContent).toMatch(
        /ALTER\s+TABLE\s+"refunds"\s+ALTER\s+COLUMN\s+"amount"\s+TYPE\s+DECIMAL\(18,\s*6\)/i,
      );
    });
  });
});
