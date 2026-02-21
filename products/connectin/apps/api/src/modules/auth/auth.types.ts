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
  verificationToken: string;
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}
