import { prisma } from "../config/env.js";
import type { Prisma } from "../generated/prisma/client.js";

export class CompanyNotificationRepository {
  async findCompanyUser(userId: number) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        role: "COMPANY",
        isActive: true,
        companyId: { not: null },
      },
      select: {
        id: true,
        companyId: true,
      },
    });
  }

  // Kullanıcı hesabı gerektirmez; bildirim companyId ile kaydedilir.
  async createOnce(data: Prisma.CompanyNotificationCreateManyInput) {
    const result = await prisma.companyNotification.createMany({
      data: [data],
      skipDuplicates: true,
    });

    return result.count === 1;
  }

  async findByCompanyId(companyId: number, userId: number, limit = 50) {
    const notifications = await prisma.companyNotification.findMany({
      where: { companyId },
      include: {
        reads: {
          where: { userId },
          select: { readAt: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });

    return notifications.map(({ reads, ...notification }) => ({
      ...notification,
      isRead: reads.length > 0,
      readAt: reads[0]?.readAt ?? null,
    }));
  }

  async countUnread(companyId: number, userId: number) {
    return prisma.companyNotification.count({
      where: {
        companyId,
        reads: {
          none: { userId },
        },
      },
    });
  }

  async markAsRead(
    notificationId: number,
    companyId: number,
    userId: number,
  ): Promise<boolean> {
    const notification = await prisma.companyNotification.findFirst({
      where: {
        id: notificationId,
        companyId,
      },
      select: { id: true },
    });

    if (!notification) return false;

    const result = await prisma.companyNotificationRead.createMany({
      data: [
        {
          notificationId: notification.id,
          userId,
        },
      ],
      skipDuplicates: true,
    });

    return result.count === 1;
  }

  async markAllAsRead(companyId: number, userId: number): Promise<number> {
    const notifications = await prisma.companyNotification.findMany({
      where: {
        companyId,
        reads: {
          none: { userId },
        },
      },
      select: { id: true },
    });

    if (notifications.length === 0) return 0;

    const result = await prisma.companyNotificationRead.createMany({
      data: notifications.map((notification) => ({
        notificationId: notification.id,
        userId,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }
}
