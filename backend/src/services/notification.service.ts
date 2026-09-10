import { NotificationRepository } from "../repositories/notification.repository.js";

export class NotificationService {
  constructor(private readonly repository = new NotificationRepository()) {}

  async listForUser(userId: number, requestedLimit = 50) {
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 50;

    const [notifications, unreadCount] = await Promise.all([
      this.repository.findByUserId(userId, limit),
      this.repository.countUnread(userId),
    ]);

    return {
      listedCount: notifications.length,
      unreadCount,
      notifications,
    };
  }

  async markAsRead(notificationId: number, userId: number) {
    return this.repository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: number) {
    return this.repository.markAllAsRead(userId);
  }
}
