/**
 * Mock data: Guarantee Portal (Guarantees & Claims)
 * QDB One Unified Portal Prototype
 */

export interface Guarantee {
  id: string;
  orgId: string;
  type: string;
  amount: number;
  currency: string;
  status: 'active' | 'pending_signature' | 'expired' | 'claimed';
  issuedDate?: string;
  expiryDate: string;
  beneficiary: string;
  signatories: { personId: string; signed: boolean; signedAt?: string }[];
  relatedLoanId?: string;
  collateral?: { type: string; value: number; description: string }[];
}

export interface Claim {
  id: string;
  guaranteeId: string;
  amount: number;
  status: 'filed' | 'under_review' | 'approved' | 'rejected';
  filedAt: string;
}

// Mock Guarantees
export const guarantees: Guarantee[] = [
  {
    id: 'GR-2024-789',
    orgId: 'org-002', // Qatar Tech Ventures
    type: 'Bank Guarantee',
    amount: 1000000,
    currency: 'QAR',
    status: 'pending_signature',
    expiryDate: '2027-03-15T00:00:00Z',
    beneficiary: 'Qatar National Bank',
    relatedLoanId: 'LN-2024-001',
    signatories: [
      {
        personId: 'person-001', // Fatima Al-Kuwari
        signed: false
      }
    ],
    collateral: [
      {
        type: 'Real Estate',
        value: 1500000,
        description: 'Commercial property in West Bay, Plot 245'
      }
    ]
  },
  {
    id: 'GR-2023-456',
    orgId: 'org-002', // Qatar Tech Ventures
    type: 'Performance Guarantee',
    amount: 500000,
    currency: 'QAR',
    status: 'active',
    issuedDate: '2023-09-15T00:00:00Z',
    expiryDate: '2026-09-15T00:00:00Z',
    beneficiary: 'Ministry of Transport and Communications',
    signatories: [
      {
        personId: 'person-001', // Fatima Al-Kuwari
        signed: true,
        signedAt: '2023-09-12T14:30:00Z'
      }
    ],
    collateral: [
      {
        type: 'Equipment',
        value: 650000,
        description: 'IT infrastructure and servers'
      }
    ]
  },
  {
    id: 'GR-2024-100',
    orgId: 'org-001', // Al-Kuwari Trading
    type: 'Bid Bond',
    amount: 200000,
    currency: 'QAR',
    status: 'active',
    issuedDate: '2024-01-20T00:00:00Z',
    expiryDate: '2026-01-20T00:00:00Z',
    beneficiary: 'Public Works Authority (Ashghal)',
    signatories: [
      {
        personId: 'person-001', // Fatima Al-Kuwari
        signed: true,
        signedAt: '2024-01-18T10:15:00Z'
      }
    ],
    collateral: [
      {
        type: 'Cash Deposit',
        value: 200000,
        description: 'Fixed deposit account at QDB'
      }
    ]
  }
];

// Mock Claims
export const claims: Claim[] = [
  {
    id: 'CLM-2025-001',
    guaranteeId: 'GR-2023-456',
    amount: 125000,
    status: 'under_review',
    filedAt: '2025-02-01T09:45:00Z'
  }
];

// Helper functions
export function getGuaranteesByOrg(orgId: string): Guarantee[] {
  return guarantees.filter(g => g.orgId === orgId);
}

export function getGuaranteeById(id: string): Guarantee | undefined {
  return guarantees.find(g => g.id === id);
}

export function getPendingSignatures(personId: string): Guarantee[] {
  return guarantees.filter(g =>
    g.status === 'pending_signature' &&
    g.signatories.some(s => s.personId === personId && !s.signed)
  );
}

export function getClaimsByGuarantee(guaranteeId: string): Claim[] {
  return claims.filter(c => c.guaranteeId === guaranteeId);
}

export function getTotalGuaranteeValue(orgId: string): number {
  return guarantees
    .filter(g => g.orgId === orgId && (g.status === 'active' || g.status === 'pending_signature'))
    .reduce((sum, g) => sum + g.amount, 0);
}

export function getActiveGuarantees(orgId: string): Guarantee[] {
  return guarantees.filter(g => g.orgId === orgId && g.status === 'active');
}

export function getExpiringGuarantees(orgId: string, daysAhead: number = 90): Guarantee[] {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return guarantees.filter(g => {
    if (g.orgId !== orgId || g.status !== 'active') return false;
    const expiry = new Date(g.expiryDate);
    return expiry > now && expiry <= futureDate;
  });
}
