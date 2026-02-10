import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../types/index';

/**
 * Resolve tenant from X-Tenant-ID header or subdomain.
 * Sets request.tenantId for downstream use.
 */
export async function resolveTenant(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // Priority 1: X-Tenant-ID header
  const headerTenantId = request.headers['x-tenant-id'] as string | undefined;
  if (headerTenantId) {
    request.tenantId = headerTenantId;
    return;
  }

  // Priority 2: From JWT payload (authenticated requests)
  if (request.currentUser?.tenantId) {
    request.tenantId = request.currentUser.tenantId;
    return;
  }

  // Priority 3: Subdomain extraction
  const host = request.headers.host || '';
  const parts = host.split('.');
  if (parts.length > 2) {
    const subdomain = parts[0];
    // Look up tenant by slug
    const tenant = await request.server.prisma.tenant.findUnique({
      where: { slug: subdomain },
    });
    if (tenant) {
      request.tenantId = tenant.id;
      return;
    }
  }

  // Fallback: use default tenant
  const defaultTenant = await request.server.prisma.tenant.findFirst({
    where: { slug: 'dealgate' },
  });
  if (defaultTenant) {
    request.tenantId = defaultTenant.id;
    return;
  }

  throw new AppError(400, 'TENANT_NOT_FOUND', 'Could not resolve tenant');
}
