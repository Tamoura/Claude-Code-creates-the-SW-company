import { NotificationService, CreateNotificationInput } from '../src/backend/services/notification.service';

// Mock Prisma client
function createMockPrisma(overrides: Partial<any> = {}) {
  let idCounter = 0;
  const notifications: any[] = [];

  return {
    notification: {
      create: jest.fn(async ({ data }: { data: any }) => {
        const notification = { id: `notif-${++idCounter}`, ...data, read: false, createdAt: new Date() };
        notifications.push(notification);
        return notification;
      }),
      findMany: jest.fn(async ({ where }: { where: any }) => {
        return notifications.filter(n => n.userId === where.userId);
      }),
      count: jest.fn(async ({ where }: { where: any }) => {
        return notifications.filter(n => n.userId === where.userId).length;
      }),
      update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
        const idx = notifications.findIndex(n => n.id === where.id);
        if (idx !== -1) {
          notifications[idx] = { ...notifications[idx], ...data };
          return notifications[idx];
        }
        throw new Error('Not found');
      }),
      updateMany: jest.fn(async ({ where, data }: { where: any; data: any }) => {
        let count = 0;
        notifications.forEach((n, i) => {
          if (n.userId === where.userId) {
            notifications[i] = { ...n, ...data };
            count++;
          }
        });
        return { count };
      }),
      ...overrides,
    },
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new NotificationService(mockPrisma);
  });

  describe('create', () => {
    it('creates a notification with required fields', async () => {
      const input: CreateNotificationInput = {
        userId: 'user-1',
        type: 'milestone.completed',
        title: 'Milestone Completed!',
        message: 'Ahmed completed Surah Al-Mulk memorisation',
      };

      const notification = await service.create(input);

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe('user-1');
      expect(notification.type).toBe('milestone.completed');
      expect(notification.title).toBe('Milestone Completed!');
      expect(notification.message).toBe('Ahmed completed Surah Al-Mulk memorisation');
    });

    it('creates a notification with optional data field', async () => {
      const input: CreateNotificationInput = {
        userId: 'user-1',
        type: 'payment.completed',
        title: 'Payment Confirmed',
        message: '500 USDC received',
        data: { transactionId: 'tx-123', amount: 500 },
      };

      const notification = await service.create(input);
      expect(notification.data).toBeDefined();
    });

    it('calls prisma.notification.create', async () => {
      await service.create({
        userId: 'user-1',
        type: 'test',
        title: 'Test',
        message: 'Test notification',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Seed some notifications
      await service.create({ userId: 'user-1', type: 'a', title: 'A', message: 'First' });
      await service.create({ userId: 'user-1', type: 'b', title: 'B', message: 'Second' });
      await service.create({ userId: 'user-2', type: 'c', title: 'C', message: 'Other user' });
    });

    it('lists notifications for a specific user', async () => {
      const result = await service.list('user-1');
      expect(result.notifications).toHaveLength(2);
    });

    it('does not return other users notifications', async () => {
      const result = await service.list('user-2');
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].userId).toBe('user-2');
    });
  });
});
