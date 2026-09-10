import { prisma } from "../config/env.js";

type ReminderChannel =
  "EMAIL" | "WHATSAPP" | "CONSULTANT_IN_APP" | "ADMIN_EMAIL";

export class CompanyAuthorizationReminderRepository {
  async findActiveCandidates() {
    return prisma.companyAuthorization.findMany({
      where: {
        authorizationEndDate: {
          not: null,
        },
        company: {
          isActive: true,
        },
      },
      include: {
        company: {
          include: {
            consultantUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
              },
            },
            contacts: {
              orderBy: [
                {
                  createdAt: "desc",
                },
                {
                  id: "desc",
                },
              ],
              take: 1,
            },
          },
        },
      },
    });
  }

  async enqueue(params: {
    authorizationId: number;
    companyId: number;
    contactId?: number;
    reminderMonth: number;
    targetDate: Date;
    recipient: string;
    subject?: string;
    message: string;
  }): Promise<boolean> {
    const result = await prisma.companyAuthorizationReminder.createMany({
      data: [
        {
          authorizationId: params.authorizationId,
          companyId: params.companyId,
          contactId: params.contactId,
          type: "AUTHORIZATION_EXPIRY",
          channel: "EMAIL",
          status: "PENDING",
          reminderMonth: params.reminderMonth,
          targetDate: params.targetDate,
          recipient: params.recipient,
          subject: params.subject,
          message: params.message,
        },
      ],
      skipDuplicates: true,
    });

    return result.count === 1;
  }

  async createConsultantNotification(params: {
    authorizationId: number;
    companyId: number;
    contactId?: number;
    consultantUserId: number;
    reminderMonth: number;
    targetDate: Date;
    title: string;
    description: string;
  }): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const now = new Date();

      const result = await transaction.companyAuthorizationReminder.createMany({
        data: [
          {
            authorizationId: params.authorizationId,
            companyId: params.companyId,
            contactId: params.contactId,
            type: "AUTHORIZATION_EXPIRY",
            channel: "CONSULTANT_IN_APP",
            status: "SENT",
            reminderMonth: params.reminderMonth,
            targetDate: params.targetDate,
            recipient: String(params.consultantUserId),
            subject: params.title,
            message: params.description,
            attemptedAt: now,
            sentAt: now,
          },
        ],
        skipDuplicates: true,
      });

      if (result.count === 0) {
        return false;
      }

      await transaction.notification.create({
        data: {
          userId: params.consultantUserId,
          companyId: params.companyId,
          title: params.title,
          description: params.description,
          type: "SYSTEM",
        },
      });

      return true;
    });
  }
  async createAdminEmailReminder(params: {
    authorizationId: number;
    companyId: number;
    contactId?: number;
    reminderMonth: number;
    targetDate: Date;
    recipient: string;
    subject: string;
    message: string;
  }): Promise<number | null> {
    const result = await prisma.companyAuthorizationReminder.createMany({
      data: [
        {
          authorizationId: params.authorizationId,
          companyId: params.companyId,
          contactId: params.contactId,
          type: "AUTHORIZATION_EXPIRY",
          channel: "ADMIN_EMAIL",
          status: "PENDING",
          reminderMonth: params.reminderMonth,
          targetDate: params.targetDate,
          recipient: params.recipient,
          subject: params.subject,
          message: params.message,
        },
      ],
      skipDuplicates: true,
    });

    if (result.count === 0) {
      return null;
    }

    const created = await prisma.companyAuthorizationReminder.findFirst({
      where: {
        authorizationId: params.authorizationId,
        type: "AUTHORIZATION_EXPIRY",
        targetDate: params.targetDate,
        reminderMonth: params.reminderMonth,
        channel: "ADMIN_EMAIL",
      },
      select: {
        id: true,
      },
    });

    return created?.id ?? null;
  }

  async findPending(limit = 20) {
    return prisma.companyAuthorizationReminder.findMany({
      where: {
        status: "PENDING",
        channel: "EMAIL",
      },
      include: {
        authorization: true,
        company: {
          include: {
            consultantUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
              },
            },
          },
        },
        contact: true,
      },
      orderBy: {
        id: "asc",
      },
      take: limit,
    });
  }

  async countPending(): Promise<number> {
    return prisma.companyAuthorizationReminder.count({
      where: {
        status: "PENDING",
        channel: "EMAIL",
      },
    });
  }

  async countSentSince(date: Date): Promise<number> {
    return prisma.companyAuthorizationReminder.count({
      where: {
        status: "SENT",
        channel: "EMAIL",
        sentAt: {
          gte: date,
        },
      },
    });
  }

  async findLatestAttemptedEmail() {
    return prisma.companyAuthorizationReminder.findFirst({
      where: {
        channel: "EMAIL",
        attemptedAt: {
          not: null,
        },
      },
      orderBy: {
        attemptedAt: "desc",
      },
      select: {
        attemptedAt: true,
      },
    });
  }

  async markSent(id: number, providerId?: string) {
    return prisma.companyAuthorizationReminder.update({
      where: { id },
      data: {
        status: "SENT",
        attemptedAt: new Date(),
        sentAt: new Date(),
        providerId,
        errorMessage: null,
      },
    });
  }

  async markFailed(id: number, errorMessage: string) {
    return prisma.companyAuthorizationReminder.update({
      where: { id },
      data: {
        status: "FAILED",
        attemptedAt: new Date(),
        errorMessage,
      },
    });
  }

  async create(params: {
    authorizationId: number;
    companyId: number;
    contactId?: number;
    channel: ReminderChannel;
    reminderMonth: number;
    targetDate: Date;
    recipient: string;
    subject?: string;
    message: string;
  }) {
    return prisma.companyAuthorizationReminder.create({
      data: {
        authorizationId: params.authorizationId,
        companyId: params.companyId,
        contactId: params.contactId,
        type: "AUTHORIZATION_EXPIRY",
        channel: params.channel,
        reminderMonth: params.reminderMonth,
        targetDate: params.targetDate,
        recipient: params.recipient,
        subject: params.subject,
        message: params.message,
      },
    });
  }
}
