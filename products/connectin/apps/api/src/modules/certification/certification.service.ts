import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';

interface CreateCertInput {
  name: string;
  issuingOrg: string;
  credentialId?: string;
  credentialUrl?: string;
  issueDate: string;
  expiryDate?: string;
}

export class CertificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async addCertification(userId: string, input: CreateCertInput) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundError('Profile not found');

    if (!input.name || !input.issuingOrg || !input.issueDate) {
      throw new ValidationError('Missing required fields', [
        ...(!input.name ? [{ field: 'name', message: 'Name is required' }] : []),
        ...(!input.issuingOrg ? [{ field: 'issuingOrg', message: 'Issuing organization is required' }] : []),
        ...(!input.issueDate ? [{ field: 'issueDate', message: 'Issue date is required' }] : []),
      ]);
    }

    const cert = await this.prisma.certification.create({
      data: {
        profileId: profile.id,
        name: input.name,
        issuingOrg: input.issuingOrg,
        credentialId: input.credentialId || null,
        credentialUrl: input.credentialUrl || null,
        issueDate: new Date(input.issueDate),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      },
    });

    return this.format(cert);
  }

  async listCertifications(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return [];

    const certs = await this.prisma.certification.findMany({
      where: { profileId: profile.id },
      orderBy: { issueDate: 'desc' },
    });

    return certs.map((c) => this.format(c));
  }

  async deleteCertification(certId: string, userId: string) {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: { profile: { select: { userId: true } } },
    });
    if (!cert) throw new NotFoundError('Certification not found');
    if (cert.profile.userId !== userId) throw new ForbiddenError('Not your certification');

    await this.prisma.certification.delete({ where: { id: certId } });
    return { deleted: true };
  }

  private format(cert: any) {
    return {
      id: cert.id,
      name: cert.name,
      issuingOrg: cert.issuingOrg,
      credentialId: cert.credentialId,
      credentialUrl: cert.credentialUrl,
      issueDate: cert.issueDate instanceof Date ? cert.issueDate.toISOString().split('T')[0] : cert.issueDate,
      expiryDate: cert.expiryDate instanceof Date ? cert.expiryDate.toISOString().split('T')[0] : cert.expiryDate,
      createdAt: cert.createdAt instanceof Date ? cert.createdAt.toISOString() : cert.createdAt,
    };
  }
}
