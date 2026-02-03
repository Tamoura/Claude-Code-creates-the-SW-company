import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client
const mockUpsert = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('../prisma', () => ({
  prisma: {
    user: {
      upsert: (...args: any[]) => mockUpsert(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

describe('User Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upsert a user with Clerk data', async () => {
    const mockUser = {
      id: 'cuid_123',
      clerkId: 'user_abc',
      email: 'test@example.com',
      name: 'Test User',
      imageUrl: null,
      plan: 'FREE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUpsert.mockResolvedValue(mockUser);

    const { syncUser } = await import('../user-sync');
    const result = await syncUser({
      userId: 'user_abc',
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { clerkId: 'user_abc' },
      update: {
        email: 'test@example.com',
        name: 'Test User',
        imageUrl: undefined,
      },
      create: {
        clerkId: 'user_abc',
        email: 'test@example.com',
        name: 'Test User',
        imageUrl: undefined,
      },
    });
    expect(result).toEqual(mockUser);
  });

  it('should find a user by Clerk ID', async () => {
    const mockUser = {
      id: 'cuid_123',
      clerkId: 'user_abc',
      email: 'test@example.com',
    };

    mockFindUnique.mockResolvedValue(mockUser);

    const { getUserByClerkId } = await import('../user-sync');
    const result = await getUserByClerkId('user_abc');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { clerkId: 'user_abc' },
    });
    expect(result).toEqual(mockUser);
  });

  it('should return null for unknown Clerk ID', async () => {
    mockFindUnique.mockResolvedValue(null);

    const { getUserByClerkId } = await import('../user-sync');
    const result = await getUserByClerkId('user_unknown');

    expect(result).toBeNull();
  });

  it('should include active projects when fetching user with projects', async () => {
    const mockUserWithProjects = {
      id: 'cuid_123',
      clerkId: 'user_abc',
      email: 'test@example.com',
      projects: [
        { id: 'proj_1', name: 'My App', status: 'ACTIVE' },
      ],
    };

    mockFindUnique.mockResolvedValue(mockUserWithProjects);

    const { getUserWithProjects } = await import('../user-sync');
    const result = await getUserWithProjects('user_abc');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { clerkId: 'user_abc' },
      include: {
        projects: {
          where: { status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    expect(result?.projects).toHaveLength(1);
  });
});
