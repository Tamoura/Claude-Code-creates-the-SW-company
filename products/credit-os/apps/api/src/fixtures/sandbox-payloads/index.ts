/**
 * Sandbox payload catalogue — ADR-005.
 *
 * v1 connectors are all sandbox-stubbed (addendum Clarifications): every
 * connector capability type uses a mock provider returning a realistic
 * response. This catalogue is the source of those stub responses — one
 * realistic payload per the 10 capability types.
 *
 * Consumed by `SandboxConnectorProvider` (Phase 4) and the seed script.
 */

/** The 10 connector capability types (addendum Key References). */
export type CapabilityType =
  | 'KYC'
  | 'AML'
  | 'SANCTIONS'
  | 'CREDIT_BUREAU'
  | 'BUSINESS_REGISTRY'
  | 'OPEN_BANKING'
  | 'E_SIGNATURE'
  | 'DMS'
  | 'PAYMENT'
  | 'CORE_BANKING';

export interface SandboxPayload {
  capabilityType: CapabilityType;
  /** Human-readable description of what this stub represents. */
  description: string;
  /** A realistic stub response body the sandbox provider returns. */
  response: Readonly<Record<string, unknown>>;
}

/** One realistic sandbox response per capability type. */
export const SANDBOX_PAYLOADS: Readonly<Record<CapabilityType, SandboxPayload>> = {
  KYC: {
    capabilityType: 'KYC',
    description: 'Know-Your-Customer identity verification result.',
    response: {
      status: 'VERIFIED',
      matchScore: 0.97,
      verifiedName: 'Acme Trading LLC',
      documentType: 'COMMERCIAL_REGISTRATION',
      checkedAt: '2026-05-17T10:00:00Z',
    },
  },
  AML: {
    capabilityType: 'AML',
    description: 'Anti-Money-Laundering risk screening result.',
    response: {
      status: 'CLEAR',
      riskRating: 'LOW',
      riskScore: 12,
      alerts: [],
      checkedAt: '2026-05-17T10:00:01Z',
    },
  },
  SANCTIONS: {
    capabilityType: 'SANCTIONS',
    description: 'Sanctions / watchlist screening result.',
    response: {
      status: 'NO_MATCH',
      listsChecked: ['OFAC', 'UN', 'EU'],
      matches: [],
      checkedAt: '2026-05-17T10:00:02Z',
    },
  },
  CREDIT_BUREAU: {
    capabilityType: 'CREDIT_BUREAU',
    description: 'Credit bureau report for a corporate borrower.',
    response: {
      status: 'FOUND',
      creditScore: 720,
      scoreBand: 'GOOD',
      outstandingFacilities: 3,
      totalExposure: 4_500_000,
      delinquencies: 0,
      reportDate: '2026-05-17',
    },
  },
  BUSINESS_REGISTRY: {
    capabilityType: 'BUSINESS_REGISTRY',
    description: 'Government business-registry lookup.',
    response: {
      status: 'ACTIVE',
      registrationNumber: 'CR-1009876',
      legalName: 'Acme Trading LLC',
      incorporationDate: '2014-03-12',
      legalForm: 'LLC',
      registeredCapital: 1_000_000,
    },
  },
  OPEN_BANKING: {
    capabilityType: 'OPEN_BANKING',
    description: 'Open-banking account + transaction aggregation.',
    response: {
      status: 'CONNECTED',
      accounts: [
        { accountId: 'acc_001', type: 'CURRENT', balance: 832_450, currency: 'USD' },
      ],
      averageMonthlyInflow: 410_000,
      transactionCount: 1_284,
    },
  },
  E_SIGNATURE: {
    capabilityType: 'E_SIGNATURE',
    description: 'Electronic signature envelope status.',
    response: {
      status: 'COMPLETED',
      envelopeId: 'env_77ac21',
      signers: [{ name: 'Authorised Signatory', signedAt: '2026-05-17T11:30:00Z' }],
      documentHash: 'sha256:9f2b...stub',
    },
  },
  DMS: {
    capabilityType: 'DMS',
    description: 'Document Management System storage confirmation.',
    response: {
      status: 'STORED',
      documentId: 'dms_4521',
      uri: 'sandbox://dms/4521',
      sizeBytes: 248_512,
      contentType: 'application/pdf',
    },
  },
  PAYMENT: {
    capabilityType: 'PAYMENT',
    description: 'Payment / disbursement instruction result.',
    response: {
      status: 'SETTLED',
      paymentId: 'pay_9931',
      amount: 250_000,
      currency: 'USD',
      valueDate: '2026-05-18',
    },
  },
  CORE_BANKING: {
    capabilityType: 'CORE_BANKING',
    description: 'Core-banking loan-account creation result.',
    response: {
      status: 'ACCOUNT_OPENED',
      accountNumber: 'LN-300045581',
      productCode: 'CORP-TERM-LOAN',
      principal: 5_000_000,
      openedAt: '2026-05-18T09:00:00Z',
    },
  },
};

/** Convenience array of all 10 sandbox payloads. */
export const SANDBOX_PAYLOAD_LIST: readonly SandboxPayload[] =
  Object.values(SANDBOX_PAYLOADS);
