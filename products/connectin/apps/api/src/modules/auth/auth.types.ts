export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
  languagePreference: string;
  status: string;
  createdAt: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}
