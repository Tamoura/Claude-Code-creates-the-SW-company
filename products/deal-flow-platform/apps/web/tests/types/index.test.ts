import {
  DealType,
  DealStatus,
  ShariaCompliance,
  InvestorClassification,
  UserRole,
  SubscriptionStatus,
} from '@/types';

describe('Type Enums', () => {
  describe('DealType', () => {
    it('has all 7 deal types', () => {
      const types = Object.values(DealType);
      expect(types).toHaveLength(7);
      expect(types).toContain('IPO');
      expect(types).toContain('MUTUAL_FUND');
      expect(types).toContain('SUKUK');
      expect(types).toContain('PE_VC');
      expect(types).toContain('PRIVATE_PLACEMENT');
      expect(types).toContain('REAL_ESTATE');
      expect(types).toContain('SAVINGS');
    });
  });

  describe('DealStatus', () => {
    it('has all 8 statuses', () => {
      const statuses = Object.values(DealStatus);
      expect(statuses).toHaveLength(8);
      expect(statuses).toContain('DRAFT');
      expect(statuses).toContain('UNDER_REVIEW');
      expect(statuses).toContain('ACTIVE');
      expect(statuses).toContain('SUBSCRIPTION_OPEN');
      expect(statuses).toContain('SUBSCRIPTION_CLOSED');
      expect(statuses).toContain('ALLOCATION');
      expect(statuses).toContain('SETTLED');
      expect(statuses).toContain('CANCELLED');
    });
  });

  describe('ShariaCompliance', () => {
    it('has 3 compliance levels', () => {
      const levels = Object.values(ShariaCompliance);
      expect(levels).toHaveLength(3);
      expect(levels).toContain('CERTIFIED');
      expect(levels).toContain('NON_CERTIFIED');
      expect(levels).toContain('PENDING');
    });
  });

  describe('InvestorClassification', () => {
    it('has 5 classifications including QFC', () => {
      const classifications = Object.values(InvestorClassification);
      expect(classifications).toHaveLength(5);
      expect(classifications).toContain('RETAIL');
      expect(classifications).toContain('PROFESSIONAL');
      expect(classifications).toContain('INSTITUTIONAL');
      expect(classifications).toContain('QFC');
      expect(classifications).toContain('FOREIGN');
    });
  });

  describe('UserRole', () => {
    it('has 4 roles', () => {
      const roles = Object.values(UserRole);
      expect(roles).toHaveLength(4);
      expect(roles).toContain('INVESTOR');
      expect(roles).toContain('ISSUER');
      expect(roles).toContain('TENANT_ADMIN');
      expect(roles).toContain('SUPER_ADMIN');
    });
  });

  describe('SubscriptionStatus', () => {
    it('has 5 statuses', () => {
      const statuses = Object.values(SubscriptionStatus);
      expect(statuses).toHaveLength(5);
      expect(statuses).toContain('PENDING');
      expect(statuses).toContain('CONFIRMED');
      expect(statuses).toContain('ALLOCATED');
      expect(statuses).toContain('REJECTED');
      expect(statuses).toContain('CANCELLED');
    });
  });
});
