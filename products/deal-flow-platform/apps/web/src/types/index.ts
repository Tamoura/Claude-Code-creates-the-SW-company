// Core Enums
export enum UserRole {
  INVESTOR = 'INVESTOR',
  ISSUER = 'ISSUER',
  TENANT_ADMIN = 'TENANT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum DealType {
  IPO = 'IPO',
  MUTUAL_FUND = 'MUTUAL_FUND',
  SUKUK = 'SUKUK',
  PE_VC = 'PE_VC',
  PRIVATE_PLACEMENT = 'PRIVATE_PLACEMENT',
  REAL_ESTATE = 'REAL_ESTATE',
  SAVINGS = 'SAVINGS',
}

export enum DealStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTIVE = 'ACTIVE',
  SUBSCRIPTION_OPEN = 'SUBSCRIPTION_OPEN',
  SUBSCRIPTION_CLOSED = 'SUBSCRIPTION_CLOSED',
  ALLOCATION = 'ALLOCATION',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export enum ShariaCompliance {
  CERTIFIED = 'CERTIFIED',
  NON_CERTIFIED = 'NON_CERTIFIED',
  PENDING = 'PENDING',
}

export enum InvestorClassification {
  RETAIL = 'RETAIL',
  PROFESSIONAL = 'PROFESSIONAL',
  INSTITUTIONAL = 'INSTITUTIONAL',
  QFC = 'QFC',
  FOREIGN = 'FOREIGN',
}

export enum SubscriptionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ALLOCATED = 'ALLOCATED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// User Types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorProfile {
  id: string;
  userId: string;
  classification: InvestorClassification;
  qid: string;
  fullNameEn: string;
  fullNameAr: string;
  phoneNumber: string;
  address: string;
  kycVerified: boolean;
  accreditationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssuerProfile {
  id: string;
  userId: string;
  companyNameEn: string;
  companyNameAr: string;
  commercialRegistration: string;
  taxId: string;
  sector: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Deal Types
export interface Deal {
  id: string;
  tenantId: string;
  issuerId: string;
  dealType: DealType;
  status: DealStatus;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  shariaCompliance: ShariaCompliance;
  sector: string;
  targetAmount: number;
  minSubscription: number;
  maxSubscription: number;
  currency: string;
  openDate: string;
  closeDate: string;
  expectedReturnRate?: number;
  riskRating?: string;
  documentUrls?: string[];
  createdAt: string;
  updatedAt: string;
  issuer?: IssuerProfile;
}

export interface Subscription {
  id: string;
  dealId: string;
  investorId: string;
  amount: number;
  status: SubscriptionStatus;
  allocatedAmount?: number;
  allocatedShares?: number;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  deal?: Deal;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    nextCursor?: string;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  fullNameEn?: string;
  fullNameAr?: string;
  companyNameEn?: string;
  companyNameAr?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

// Utility Types
export type Locale = 'en' | 'ar';

export interface LocalizedContent {
  en: string;
  ar: string;
}
