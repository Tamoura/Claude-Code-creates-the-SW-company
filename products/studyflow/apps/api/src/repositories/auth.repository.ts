import { PrismaClient, Student, Session } from '@prisma/client';

/**
 * Data access for students and sessions. Prisma is confined to this layer
 * (architecture.md §4.2). No business logic here.
 */
export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findStudentByEmail(email: string): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { email } });
  }

  findStudentById(id: string): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { id } });
  }

  createStudent(data: {
    email: string;
    passwordHash: string;
    activeTerm: string;
  }): Promise<Student> {
    return this.prisma.student.create({ data });
  }

  createSession(data: {
    tokenHash: string;
    studentId: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  findValidSession(tokenHash: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }
}
