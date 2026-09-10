import { prisma } from "../config/env.js";

type ReminderType = "EXTENSION_APPLICATION" | "CLOSURE_APPLICATION";

type ReminderChannel =
  "EMAIL" | "WHATSAPP" | "CONSULTANT_IN_APP" | "ADMIN_EMAIL";

type ReminderStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export class DocumentReminderRepository {
  async findActiveCandidates() {
    return prisma.incentiveDocument.findMany({
      where: {
        isActive: true,
        status: "OPEN",
        documentEndDate: {
          not: null,
        },
        extensionDate: {
          not: null,
        },
      },
      include: {
        company: {
          include: {
            identity: true,
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

  async findExisting(params: {
    documentId: number;
    type: ReminderType;
    targetDate: Date;
    reminderMonth: number;
    channel: ReminderChannel;
  }) {
    return prisma.documentReminder.findFirst({
      where: {
        documentId: params.documentId,
        type: params.type,
        targetDate: params.targetDate,
        reminderMonth: params.reminderMonth,
        channel: params.channel,
      },
    });
  }
  async enqueue(params: {
    documentId: number;
    companyId: number;
    contactId?: number;
    type: ReminderType;
    reminderMonth: number;
    targetDate: Date;
    recipient: string;
    subject?: string;
    message: string;
  }): Promise<boolean> {
    const result = await prisma.documentReminder.createMany({
      data: [
        {
          documentId: params.documentId,
          companyId: params.companyId,
          contactId: params.contactId,
          type: params.type,
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
    documentId: number;
    companyId: number;
    contactId?: number;
    consultantUserId: number;
    type: ReminderType;
    reminderMonth: number;
    targetDate: Date;
    title: string;
    description: string;
  }): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const now = new Date();

      const reminderResult = await transaction.documentReminder.createMany({
        data: [
          {
            documentId: params.documentId,
            companyId: params.companyId,
            contactId: params.contactId,
            type: params.type,
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

      if (reminderResult.count === 0) {
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
    documentId: number;
    companyId: number;
    contactId?: number;
    type: ReminderType;
    reminderMonth: number;
    targetDate: Date;
    recipient: string;
    subject: string;
    message: string;
  }): Promise<number | null> {
    const result = await prisma.documentReminder.createMany({
      data: [
        {
          documentId: params.documentId,
          companyId: params.companyId,
          contactId: params.contactId,
          type: params.type,
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

    const created = await prisma.documentReminder.findFirst({
      where: {
        documentId: params.documentId,
        type: params.type,
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
  async create(params: {
    documentId: number;
    companyId: number;
    contactId?: number;
    type: ReminderType;
    channel: ReminderChannel;
    reminderMonth: number;
    targetDate: Date;
    recipient: string;
    subject?: string;
    message: string;
    status?: ReminderStatus;
    errorMessage?: string;
  }) {
    return prisma.documentReminder.create({
      data: {
        documentId: params.documentId,
        companyId: params.companyId,
        contactId: params.contactId,
        type: params.type,
        channel: params.channel,
        reminderMonth: params.reminderMonth,
        targetDate: params.targetDate,
        recipient: params.recipient,
        subject: params.subject,
        message: params.message,
        status: params.status ?? "PENDING",
        errorMessage: params.errorMessage,
      },
    });
  }
  async findPending(limit = 20) {
    return prisma.documentReminder.findMany({
      where: {
        status: "PENDING",
        channel: "EMAIL",
      },
      include: {
        document: true,
        company: {
          include: {
            identity: true,
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
    return prisma.documentReminder.count({
      where: {
        status: "PENDING",
        channel: "EMAIL",
      },
    });
  }
  async countSentSince(date: Date): Promise<number> {
    return prisma.documentReminder.count({
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
    return prisma.documentReminder.findFirst({
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
    return prisma.documentReminder.update({
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
    return prisma.documentReminder.update({
      where: { id },
      data: {
        status: "FAILED",
        attemptedAt: new Date(),
        errorMessage,
      },
    });
  }
}
