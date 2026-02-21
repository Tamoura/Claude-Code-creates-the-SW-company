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
}

export interface RegisterResponse {
  userId: string;
  email: string;
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserResponse;
}
