import { prisma } from './prisma';

interface ClerkUserData {
  userId: string;
  email: string;
  name?: string | null;
  imageUrl?: string | null;
}

export async function syncUser(data: ClerkUserData) {
  return prisma.user.upsert({
    where: { clerkId: data.userId },
    update: {
      email: data.email,
      name: data.name,
      imageUrl: data.imageUrl,
    },
    create: {
      clerkId: data.userId,
      email: data.email,
      name: data.name,
      imageUrl: data.imageUrl,
    },
  });
}

export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
  });
}

export async function getUserWithProjects(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
    include: {
      projects: {
        where: { status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });
}
