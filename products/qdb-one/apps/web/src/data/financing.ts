/**
 * Mock data: Financing Portal (Loans & Applications)
 * QDB One Unified Portal Prototype
 */

export interface LoanApplication {
  id: string;
  orgId: string;
  type: string;
  amount: number;
  currency: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  statusTimeline: { status: string; date: string; note?: string }[];
  relatedGuaranteeId?: string;
}

export interface Loan {
  id: string;
  orgId: string;
  type: string;
  originalAmount: number;
  outstandingBalance: number;
  currency: string;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  status: 'active' | 'closed' | 'defaulted';
  payments: { id: string; date: string; amount: number; status: string }[];
  relatedGuaranteeId?: string;
  relatedAdvisorySessionId?: string;
}

// Mock Loan Applications
export const loanApplications: LoanApplication[] = [
  {
    id: 'LA-2025-042',
    orgId: 'org-001', // Al-Kuwari Trading
    type: 'Equipment Finance',
    amount: 750000,
    currency: 'QAR',
    status: 'under_review',
    submittedAt: '2025-02-10T09:30:00Z',
    statusTimeline: [
      { status: 'draft', date: '2025-02-08T14:20:00Z' },
      { status: 'submitted', date: '2025-02-10T09:30:00Z' },
      {
        status: 'under_review',
        date: '2025-02-12T11:15:00Z',
        note: 'Assigned to Credit Analysis Team'
      }
    ]
  },
  {
    id: 'LA-2025-038',
    orgId: 'org-001', // Al-Kuwari Trading
    type: 'Trade Finance',
    amount: 1200000,
    currency: 'QAR',
    status: 'approved',
    submittedAt: '2025-01-28T10:45:00Z',
    statusTimeline: [
      { status: 'draft', date: '2025-01-25T13:00:00Z' },
      { status: 'submitted', date: '2025-01-28T10:45:00Z' },
      { status: 'under_review', date: '2025-01-30T09:00:00Z' },
      {
        status: 'approved',
        date: '2025-02-14T16:30:00Z',
        note: 'Approved by Credit Committee. Disbursement pending signature.'
      }
    ]
  }
];

// Mock Loans
export const loans: Loan[] = [
  {
    id: 'LN-2024-001',
    orgId: 'org-001', // Al-Kuwari Trading
    type: 'Business Expansion Loan',
    originalAmount: 2000000,
    outstandingBalance: 1650000,
    currency: 'QAR',
    interestRate: 4.5,
    startDate: '2024-03-15T00:00:00Z',
    maturityDate: '2029-03-15T00:00:00Z',
    nextPaymentDate: '2026-03-15T00:00:00Z',
    nextPaymentAmount: 42500,
    status: 'active',
    relatedGuaranteeId: 'GR-2024-789',
    payments: [
      {
        id: 'PAY-001-001',
        date: '2024-04-15T00:00:00Z',
        amount: 42500,
        status: 'completed'
      },
      {
        id: 'PAY-001-002',
        date: '2024-05-15T00:00:00Z',
        amount: 42500,
        status: 'completed'
      },
      {
        id: 'PAY-001-003',
        date: '2024-06-15T00:00:00Z',
        amount: 42500,
        status: 'completed'
      },
      {
        id: 'PAY-001-004',
        date: '2024-07-15T00:00:00Z',
        amount: 42500,
        status: 'completed'
      }
    ]
  },
  {
    id: 'LN-2023-015',
    orgId: 'org-001', // Al-Kuwari Trading
    type: 'Working Capital',
    originalAmount: 500000,
    outstandingBalance: 215000,
    currency: 'QAR',
    interestRate: 5.25,
    startDate: '2023-08-01T00:00:00Z',
    maturityDate: '2026-08-01T00:00:00Z',
    nextPaymentDate: '2026-03-01T00:00:00Z',
    nextPaymentAmount: 18750,
    status: 'active',
    payments: [
      {
        id: 'PAY-015-001',
        date: '2023-09-01T00:00:00Z',
        amount: 18750,
        status: 'completed'
      },
      {
        id: 'PAY-015-002',
        date: '2023-10-01T00:00:00Z',
        amount: 18750,
        status: 'completed'
      },
      {
        id: 'PAY-015-003',
        date: '2023-11-01T00:00:00Z',
        amount: 18750,
        status: 'completed'
      },
      {
        id: 'PAY-015-004',
        date: '2023-12-01T00:00:00Z',
        amount: 18750,
        status: 'completed'
      }
    ]
  },
  {
    id: 'LN-2024-055',
    orgId: 'org-002', // Qatar Tech Ventures
    type: 'Startup Funding',
    originalAmount: 3000000,
    outstandingBalance: 2850000,
    currency: 'QAR',
    interestRate: 3.75,
    startDate: '2024-06-01T00:00:00Z',
    maturityDate: '2029-06-01T00:00:00Z',
    nextPaymentDate: '2026-03-01T00:00:00Z',
    nextPaymentAmount: 55000,
    status: 'active',
    relatedAdvisorySessionId: 'ADV-SES-001',
    payments: [
      {
        id: 'PAY-055-001',
        date: '2024-07-01T00:00:00Z',
        amount: 55000,
        status: 'completed'
      },
      {
        id: 'PAY-055-002',
        date: '2024-08-01T00:00:00Z',
        amount: 55000,
        status: 'completed'
      },
      {
        id: 'PAY-055-003',
        date: '2024-09-01T00:00:00Z',
        amount: 55000,
        status: 'completed'
      }
    ]
  }
];

// Helper functions
export function getLoansByOrg(orgId: string): Loan[] {
  return loans.filter(l => l.orgId === orgId);
}

export function getApplicationsByOrg(orgId: string): LoanApplication[] {
  return loanApplications.filter(a => a.orgId === orgId);
}

export function getLoanById(id: string): Loan | undefined {
  return loans.find(l => l.id === id);
}

export function getApplicationById(id: string): LoanApplication | undefined {
  return loanApplications.find(a => a.id === id);
}

export function getTotalOutstanding(orgId: string): number {
  return loans
    .filter(l => l.orgId === orgId && l.status === 'active')
    .reduce((sum, l) => sum + l.outstandingBalance, 0);
}

export function getUpcomingPayments(orgId: string): Array<{loan: Loan; paymentDate: string; amount: number}> {
  return loans
    .filter(l => l.orgId === orgId && l.status === 'active')
    .map(loan => ({
      loan,
      paymentDate: loan.nextPaymentDate,
      amount: loan.nextPaymentAmount
    }))
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
}
