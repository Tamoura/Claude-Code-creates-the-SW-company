import bcrypt from 'bcrypt';
import { Student } from '@prisma/client';
import { AuthRepository } from '../repositories/auth.repository';
import { ConflictError, UnauthorizedError } from '../lib/errors';
import {
  generateSessionToken,
  hashSessionToken,
  sessionExpiry,
} from '../lib/session';
import { ACTIVE_TERM } from '../lib/config';
import { SignupInput, LoginInput } from '../schemas/auth.schema';

// 12 rounds in prod/dev (NFR-005); fewer in tests to keep the real-DB suite
// fast without changing the hashing algorithm under test.
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;

export interface StudentView {
  id: string;
  email: string;
  activeTerm: string;
}

export interface AuthResult {
  student: StudentView;
  /** Opaque session token to set in the httpOnly cookie. */
  token: string;
}

export function toStudentView(student: Student): StudentView {
  return {
    id: student.id,
    email: student.email,
    activeTerm: student.activeTerm,
  };
}

/**
 * Auth business logic (US-01): registration, login, session minting/teardown.
 * Errors are non-enumerating (NFR-007): conflict and login failure never reveal
 * whether an email exists.
 */
export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async signup(input: SignupInput): Promise<AuthResult> {
    const existing = await this.repo.findStudentByEmail(input.email);
    if (existing) {
      // Generic, non-enumerating conflict (NFR-007, US-01 AC-2).
      throw new ConflictError('Could not create account with those details');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const student = await this.repo.createStudent({
      email: input.email,
      passwordHash,
      activeTerm: ACTIVE_TERM,
    });

    const token = await this.mintSession(student.id);
    return { student: toStudentView(student), token };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const student = await this.repo.findStudentByEmail(input.email);
    // Always run a bcrypt compare to keep timing uniform whether or not the
    // email exists (non-enumeration, NFR-007).
    const hash =
      student?.passwordHash ??
      '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
    const ok = await bcrypt.compare(input.password, hash);
    if (!student || !ok) {
      throw new UnauthorizedError('Email or password is invalid');
    }

    const token = await this.mintSession(student.id);
    return { student: toStudentView(student), token };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.repo.deleteSession(hashSessionToken(token));
  }

  private async mintSession(studentId: string): Promise<string> {
    const token = generateSessionToken();
    await this.repo.createSession({
      tokenHash: hashSessionToken(token),
      studentId,
      expiresAt: sessionExpiry(),
    });
    return token;
  }
}
