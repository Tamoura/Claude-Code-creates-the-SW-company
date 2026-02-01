import { FastifyRequest, FastifyReply } from 'fastify';
import { registerSchema, loginSchema, refreshSchema } from './schemas';
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
} from './service';
import { BadRequestError } from '../../lib/errors';

export async function register(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.');
      if (!errors[field]) errors[field] = [];
      errors[field].push(issue.message);
    }
    throw new BadRequestError(
      `Validation failed: ${Object.values(errors).flat().join(', ')}`
    );
  }

  const result = await registerUser(request.server.db, parsed.data);

  reply
    .status(201)
    .setCookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    })
    .send({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
}

export async function login(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    throw new BadRequestError('Invalid email or password format');
  }

  const result = await loginUser(request.server.db, parsed.data);

  reply
    .setCookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    })
    .send({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
}

export async function refresh(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Accept from cookie or body
  const cookieToken = request.cookies?.refreshToken;
  const bodyParsed = refreshSchema.safeParse(request.body);
  const refreshToken = cookieToken || (bodyParsed.success ? bodyParsed.data.refreshToken : null);

  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required');
  }

  const tokens = await refreshSession(request.server.db, refreshToken);

  reply
    .setCookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    })
    .send({
      accessToken: tokens.accessToken,
    });
}

export async function logout(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const cookieToken = request.cookies?.refreshToken;
  const bodyParsed = refreshSchema.safeParse(request.body);
  const refreshToken = cookieToken || (bodyParsed.success ? bodyParsed.data.refreshToken : null);

  if (refreshToken) {
    await logoutUser(request.server.db, refreshToken);
  }

  reply
    .clearCookie('refreshToken', { path: '/api/auth' })
    .send({ message: 'Logged out successfully' });
}
