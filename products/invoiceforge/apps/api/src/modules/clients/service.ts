import { PrismaClient } from '@prisma/client';
import Fuse from 'fuse.js';
import { NotFoundError } from '../../lib/errors';
import { paginatedResult, PaginatedResult } from '../../lib/pagination';
import type { CreateClientInput, UpdateClientInput } from './schemas';

interface ListClientsParams {
  search?: string;
  page: number;
  limit: number;
}

export async function listClients(
  db: PrismaClient,
  userId: string,
  params: ListClientsParams
): Promise<PaginatedResult<Record<string, unknown>>> {
  const { search, page, limit } = params;

  const where: Record<string, unknown> = { userId };
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.client.count({ where }),
  ]);

  return paginatedResult(data, total, { page, limit });
}

export async function getClient(
  db: PrismaClient,
  userId: string,
  clientId: string
) {
  const client = await db.client.findFirst({
    where: { id: clientId, userId },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          invoiceDate: true,
          dueDate: true,
        },
      },
    },
  });

  if (!client) {
    throw new NotFoundError('Client not found');
  }

  return client;
}

export async function createClient(
  db: PrismaClient,
  userId: string,
  input: CreateClientInput
) {
  return db.client.create({
    data: {
      userId,
      ...input,
    },
  });
}

export async function updateClient(
  db: PrismaClient,
  userId: string,
  clientId: string,
  input: UpdateClientInput
) {
  const existing = await db.client.findFirst({
    where: { id: clientId, userId },
  });

  if (!existing) {
    throw new NotFoundError('Client not found');
  }

  return db.client.update({
    where: { id: clientId },
    data: input,
  });
}

export async function deleteClient(
  db: PrismaClient,
  userId: string,
  clientId: string
) {
  const existing = await db.client.findFirst({
    where: { id: clientId, userId },
  });

  if (!existing) {
    throw new NotFoundError('Client not found');
  }

  await db.client.delete({ where: { id: clientId } });
}

const COMPANY_SUFFIXES = /\s+(Inc\.?|LLC\.?|Corp\.?|Ltd\.?|Co\.?)$/i;

function stripSuffix(name: string): string {
  return name.replace(COMPANY_SUFFIXES, '').trim();
}

export async function fuzzyMatchClient(
  db: PrismaClient,
  userId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const clients = await db.client.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  if (clients.length === 0) return null;

  const strippedName = stripSuffix(name);
  const items = clients.map((c) => ({
    ...c,
    searchName: stripSuffix(c.name),
  }));

  const fuse = new Fuse(items, {
    keys: ['searchName'],
    threshold: 0.2, // 80%+ match
    includeScore: true,
  });

  const results = fuse.search(strippedName);

  if (results.length > 0 && results[0].score !== undefined
      && results[0].score <= 0.2) {
    return { id: results[0].item.id, name: results[0].item.name };
  }

  return null;
}
