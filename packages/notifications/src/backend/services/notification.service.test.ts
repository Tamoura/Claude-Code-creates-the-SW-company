import { NotificationService } from './notification.service';

function createMockPrisma() {
  return {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
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

  describe('create()', () => {
    it('calls prisma.notification.create with correct data', async () => {
      const input = {
        userId: 'user-1',
        type: 'ALERT',
        title: 'New Alert',
        message: 'Something happened',
        data: { key: 'value' },
      };
      const created = { id: 'notif-1', ...input, read: false, createdAt: new Date() };
      mockPrisma.notification.create.mockResolvedValue(created);

      const result = await service.create(input);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'ALERT',
          title: 'New Alert',
          message: 'Something happened',
          data: { key: 'value' },
        },
      });
      expect(result).toEqual(created);
    });
  });

  describe('list()', () => {
    it('returns paginated results', async () => {
      const notifications = [
        { id: 'notif-1', userId: 'user-1', type: 'ALERT', title: 'A', message: 'Msg', read: false },
        { id: 'notif-2', userId: 'user-1', type: 'INFO', title: 'B', message: 'Msg', read: true },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(notifications);
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await service.list('user-1', { page: 1, limit: 10 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual(notifications);
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 2, pages: 1 });
    });

    it('supports unreadOnly filter', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.list('user-1', { unreadOnly: true });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
    });
  });

  describe('markAsRead()', () => {
    it('updates notification to read', async () => {
      const notification = { id: 'notif-1', userId: 'user-1', read: false };
      mockPrisma.notification.findUnique.mockResolvedValue(notification);
      const updated = { ...notification, read: true };
      mockPrisma.notification.update.mockResolvedValue(updated);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { read: true },
      });
      expect(result).toEqual(updated);
    });

    it('returns null for non-existent notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      const result = await service.markAsRead('nonexistent', 'user-1');

      expect(result).toBeNull();
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('returns null for notification belonging to different user', async () => {
      const notification = { id: 'notif-1', userId: 'user-2', read: false };
      mockPrisma.notification.findUnique.mockResolvedValue(notification);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result).toBeNull();
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead()', () => {
    it('updates all unread notifications', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true },
      });
      expect(result).toBe(5);
    });
  });

  describe('getUnreadCount()', () => {
    it('returns count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
      expect(result).toBe(3);
    });
  });

  describe('delete()', () => {
    it('removes notification', async () => {
      const notification = { id: 'notif-1', userId: 'user-1' };
      mockPrisma.notification.findUnique.mockResolvedValue(notification);
      mockPrisma.notification.delete.mockResolvedValue(notification);

      const result = await service.delete('notif-1', 'user-1');

      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
      expect(result).toBe(true);
    });

    it('returns false for non-existent notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      const result = await service.delete('nonexistent', 'user-1');

      expect(result).toBe(false);
      expect(mockPrisma.notification.delete).not.toHaveBeenCalled();
    });

    it('returns false for notification belonging to different user', async () => {
      const notification = { id: 'notif-1', userId: 'user-2' };
      mockPrisma.notification.findUnique.mockResolvedValue(notification);

      const result = await service.delete('notif-1', 'user-1');

      expect(result).toBe(false);
      expect(mockPrisma.notification.delete).not.toHaveBeenCalled();
    });
  });
});
