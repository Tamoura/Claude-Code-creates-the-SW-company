export type RiskStatus =
  | 'IDENTIFIED'
  | 'ASSESSED'
  | 'MITIGATING'
  | 'ACCEPTED'
  | 'CLOSED';

export type RiskCategory =
  | 'Security'
  | 'Operational'
  | 'Compliance'
  | 'Financial'
  | 'Strategic'
  | 'Reputational';

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  riskScore: number; // likelihood × impact
  status: RiskStatus;
  mitigationPlan?: string;
  ownerId?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  controls?: Array<{
    control: {
      id: string;
      code: string;
      title: string;
      status: string;
    };
  }>;
  assets?: Array<{
    asset: {
      id: string;
      name: string;
      type: string;
      status: string;
    };
  }>;
}

export interface RiskListResponse {
  risks: Risk[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RiskDetailResponse {
  risk: Risk;
}

export interface CreateRiskInput {
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  status?: RiskStatus;
  mitigationPlan?: string;
}

export interface UpdateRiskInput {
  title?: string;
  description?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  status?: RiskStatus;
  mitigationPlan?: string;
}

export interface RiskFilters {
  page?: number;
  limit?: number;
  sort?: 'title' | 'created' | 'updated' | 'riskScore';
  order?: 'asc' | 'desc';
  status?: RiskStatus;
  category?: string;
  minScore?: number;
  maxScore?: number;
  owner?: string;
}

export const RISK_STATUSES: { value: RiskStatus; label: string }[] = [
  { value: 'IDENTIFIED', label: 'Identified' },
  { value: 'ASSESSED', label: 'Assessed' },
  { value: 'MITIGATING', label: 'Mitigating' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'CLOSED', label: 'Closed' },
];

export const RISK_CATEGORIES: RiskCategory[] = [
  'Security',
  'Operational',
  'Compliance',
  'Financial',
  'Strategic',
  'Reputational',
];

/**
 * Get color class for risk score badge
 */
export function getRiskScoreColor(score: number): string {
  if (score >= 15) return 'bg-red-100 text-red-800 border-red-200';
  if (score >= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-green-100 text-green-800 border-green-200';
}

/**
 * Get risk level label
 */
export function getRiskLevel(score: number): string {
  if (score >= 15) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
}

/**
 * Get status badge color
 */
export function getStatusColor(status: RiskStatus): string {
  switch (status) {
    case 'IDENTIFIED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ASSESSED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'MITIGATING':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'ACCEPTED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'CLOSED':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
