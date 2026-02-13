// Plugins
export { default as authPlugin } from './plugins/auth.js';

// Routes
export { default as authRoutes } from './routes/auth.js';
export type { AuthRoutesOptions } from './routes/auth.js';
export { default as apiKeyRoutes } from './routes/api-keys.js';
export type { ApiKeyRoutesOptions } from './routes/api-keys.js';

// Types
export { AppError } from './types.js';
export type { AuthPluginOptions, AuthUser, AuthApiKey } from './types.js';

// Validation
export {
  signupSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  validateBody,
} from './validation.js';
export type {
  SignupInput,
  LoginInput,
  RefreshInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from './validation.js';
