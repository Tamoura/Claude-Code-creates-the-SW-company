/**
 * Auth Type Definitions
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: UserSummary;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  totpEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
