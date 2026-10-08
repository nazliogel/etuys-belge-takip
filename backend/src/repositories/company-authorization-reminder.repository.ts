import { prisma } from "../config/env.js";
import { EMAIL_RETRY_DELAY_MINUTES } from "../utils/email-retry.js";

type ReminderChannel =
  | "EMAIL"
  | "WHATSAPP"
  | "CONSULTANT_IN_APP"
  | "ADMIN_EMAIL";

/** Danışmana giden "gönderilemedi" bildirimlerinin reminderMonth değerine eklenen fark */
const CONSULTANT_FAILURE_MONTH_OFFSET = 100;

/**
 * Açık belge kontrolü için gereken alanlar. Sadece aktif ve OPEN durumdaki
 * belgeler çekilir; Kapalı Belgeler'deki numaralar ayrıca karşılaştırılır
 * (bkz. hasOpenIncentiveDocument).
 */
const OPEN_DOCUMENT_STATE_SELECT = {
  documents: {
    where: {
      isActive: true,
      status: "OPEN",
    },
    select: {
      externalDocumentId: true,
    },
  },
  closedDocuments: {
    select: {
      externalDocumentId: true,
    },
  },
} as const;

export class CompanyAuthorizationReminderRepository {
  async findPendingWhatsApp(limit = 1) {
    return prisma.companyAuthorizationReminder.findMany({
      where: {
        channel: "WHATSAPP",
        status: "PENDING",
      },
      include: {
        authorization: true,
        company: true,
        contact: true,
      },
      orderBy: {
        id: "asc",
      },
      take: limit,
    });
  }

  async enqueueWhatsApp(params: {
  authorizationId: number;
  companyId: number;
  contactId?: number;
  reminderMonth: number;
  targetDate: Date;
  recipient: string;
  message: string;
}): Promise<boolean> {
  const result = await prisma.companyAuthorizationReminder.createMany({
    data: [
      {
        authorizationId: params.authorizationId,
        companyId: params.companyId,
        contactId: params.contactId,
        type: "AUTHORIZATION_EXPIRY",
        channel: "WHATSAPP",
        status: "PENDING",
        reminderMonth: params.reminderMonth,
        targetDate: params.targetDate,
        recipient: params.recipient,
        message: params.message,
      },
    ],
    skipDuplicates: true,
  });

  return result.count === 1;
}

  async findActiveCandidates() {
    return prisma.companyAuthorization.findMany({
      where: {
        authorizationEndDate: {
          not: null,
        },
        company: {
          isActive: true,
          // En az bir aktif OPEN belgesi olmayan firma hiç gelmez.
          // Kapalı Belgeler ile çakışma kontrolü serviste yapılır.
          documents: {
            some: {
              isActive: true,
              status: "OPEN",
            },
          },
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
            ...OPEN_DOCUMENT_STATE_SELECT,
          },
        },
      },
    });
  }

  /** Gönderim anında firmanın güncel belge durumunu getirir. */
  async findCompanyDocumentState(companyId: number) {
    return prisma.company.findUnique({
      where: { id: companyId },
      select: OPEN_DOCUMENT_STATE_SELECT,
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
    /** "Gönderilemedi" bildirimi: her kesin başarısızlıkta yeniden oluşturulur */
    isFailure?: boolean;
  }): Promise<boolean> {
    const storedReminderMonth = params.isFailure
      ? params.reminderMonth + CONSULTANT_FAILURE_MONTH_OFFSET
      : params.reminderMonth;

    return prisma.$transaction(async (transaction) => {
      const now = new Date();

      const reminderData = {
        authorizationId: params.authorizationId,
        companyId: params.companyId,
        contactId: params.contactId,
        type: "AUTHORIZATION_EXPIRY" as const,
        channel: "CONSULTANT_IN_APP" as const,
        status: "SENT" as const,
        reminderMonth: storedReminderMonth,
        targetDate: params.targetDate,
        recipient: String(params.consultantUserId),
        subject: params.title,
        message: params.description,
        attemptedAt: now,
        sentAt: now,
      };

      if (params.isFailure) {
        // Kayıt varsa son hatayla güncellenir; içerik değiştiyse yeni bildirim oluşturulur

        // Aynı içerikte bildirim daha önce gittiyse tekrar gönderme
        const existing =
          await transaction.companyAuthorizationReminder.findUnique({
            where: {
              authorizationId_type_targetDate_reminderMonth_channel: {
                authorizationId: params.authorizationId,
                type: "AUTHORIZATION_EXPIRY",
                targetDate: params.targetDate,
                reminderMonth: storedReminderMonth,
                channel: "CONSULTANT_IN_APP",
              },
            },
            select: { message: true },
          });

        if (existing?.message === params.description) {
          return false;
        }

        await transaction.companyAuthorizationReminder.upsert({
          where: {
            authorizationId_type_targetDate_reminderMonth_channel: {
              authorizationId: params.authorizationId,
              type: "AUTHORIZATION_EXPIRY",
              targetDate: params.targetDate,
              reminderMonth: storedReminderMonth,
              channel: "CONSULTANT_IN_APP",
            },
          },
          create: reminderData,
          update: {
            subject: params.title,
            message: params.description,
            attemptedAt: now,
            sentAt: now,
          },
        });
      } else {
        // "1 ay kaldı" bildirimi yetki/ay başına bir kez gider
        const result =
          await transaction.companyAuthorizationReminder.createMany({
            data: [reminderData],
            skipDuplicates: true,
          });

        if (result.count === 0) {
          return false;
        }
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
        // Geçici hata alan kayıt, son denemeden 15 dk geçmeden tekrar alınmaz
        OR: [
          { attemptedAt: null },
          {
            attemptedAt: {
              lt: new Date(Date.now() - EMAIL_RETRY_DELAY_MINUTES * 60 * 1000),
            },
          },
        ],
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
        // Atlanan (SKIPPED) kayıtlar gerçekte e-posta göndermez,
        // gönderim aralığı (emailDelaySeconds) hesabına katılmamalı.
        // Geçici hata alıp tekrar denenecek kayıtlar ise gerçek bir denemedir, sayılır.
        OR: [
          { status: { in: ["SENT", "FAILED"] } },
          { status: "PENDING", errorMessage: { startsWith: "[deneme" } },
        ],
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

  /** Geçici hata: kayıt kuyrukta kalır, 15 dk sonra tekrar denenir */
  async markForRetry(id: number, errorMessage: string) {
    return prisma.companyAuthorizationReminder.update({
      where: { id },
      data: {
        status: "PENDING",
        attemptedAt: new Date(),
        errorMessage,
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

  /** Kuyruktaki bildirimi göndermeden kapatır (örn. belge kapandıysa). */
  async markSkipped(id: number, reason: string) {
    return prisma.companyAuthorizationReminder.update({
      where: { id },
      data: {
        status: "SKIPPED",
        attemptedAt: new Date(),
        errorMessage: reason,
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
