import { AppError } from "../errors/app-error.js";
import { CompanyNotificationRepository } from "../repositories/company-notification.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyNotificationService {
  constructor(
    private readonly repository = new CompanyNotificationRepository(),
  ) {}

  private async getCompanyId(userId: number): Promise<number> {
    const user = await this.repository.findCompanyUser(userId);

    if (!user || user.companyId === null) {
      throw new AppError("Firma bildirimlerine erişim yetkiniz bulunmuyor.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "COMPANY_NOTIFICATION_ACCESS_DENIED",
      });
    }

    return user.companyId;
  }

  async listForUser(userId: number, requestedLimit = 50) {
    const companyId = await this.getCompanyId(userId);

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 50;

    const [notifications, unreadCount] = await Promise.all([
      this.repository.findByCompanyId(companyId, userId, limit),
      this.repository.countUnread(companyId, userId),
    ]);

    return {
      listedCount: notifications.length,
      unreadCount,
      notifications,
    };
  }

  async markAsRead(notificationId: number, userId: number) {
    const companyId = await this.getCompanyId(userId);

    return this.repository.markAsRead(notificationId, companyId, userId);
  }

  async markAllAsRead(userId: number) {
    const companyId = await this.getCompanyId(userId);

    return this.repository.markAllAsRead(companyId, userId);
  }
}
