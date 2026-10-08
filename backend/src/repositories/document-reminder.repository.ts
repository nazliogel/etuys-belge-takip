import { prisma } from "../config/env.js";

import { EMAIL_RETRY_DELAY_MINUTES } from "../utils/email-retry.js";
import { WHATSAPP_RETRY_DELAY_MINUTES } from "../utils/whatsapp-retry.js";
type ReminderType = "EXTENSION_APPLICATION" | "CLOSURE_APPLICATION";

type ReminderChannel =
  | "EMAIL"
  | "WHATSAPP"
  | "CONSULTANT_IN_APP"
  | "ADMIN_EMAIL";

type ReminderStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

/** Danışmana giden "gönderilemedi" bildirimlerinin reminderMonth değerine eklenen fark */
const CONSULTANT_FAILURE_MONTH_OFFSET = 100;

/**
 * YENİ: Danışmana giden "WhatsApp gönderilemedi" bildirimlerinin reminderMonth farkı.
 * Mail bildirimleriyle aynı anahtarı paylaşıp birbirinin üzerine yazmasınlar diye ayrıdır.
 */
const WHATSAPP_CONSULTANT_MONTH_OFFSET = 200;

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
            authorization: {
              select: {
                authorizationEndDate: true,
              },
            },
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

  async enqueueWhatsApp(params: {
    documentId: number;
    companyId: number;
    contactId?: number;
    type: ReminderType;
    reminderMonth: number;
    targetDate: Date;
    recipient: string;
    message: string;
  }): Promise<boolean> {
    const result = await prisma.documentReminder.createMany({
      data: [
        {
          documentId: params.documentId,
          companyId: params.companyId,
          contactId: params.contactId,
          type: params.type,
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
    /** "Gönderilemedi" bildirimi: her kesin başarısızlıkta yeniden oluşturulur */
    isFailure?: boolean;
    /** YENİ: "WHATSAPP" ise bildirim WhatsApp'a ait ayrı bir anahtarla tutulur. */
    channel?: "EMAIL" | "WHATSAPP";
  }): Promise<boolean> {
    // YENİ: WhatsApp bildirimleri her zaman "gönderilemedi" bildirimidir ve
    // mail bildirimleriyle karışmasın diye ayrı bir anahtarla tutulur.
    const isWhatsApp = params.channel === "WHATSAPP";
    const isFailure = params.isFailure === true || isWhatsApp;

    const storedReminderMonth = isWhatsApp
      ? params.reminderMonth + WHATSAPP_CONSULTANT_MONTH_OFFSET
      : isFailure
        ? params.reminderMonth + CONSULTANT_FAILURE_MONTH_OFFSET
        : params.reminderMonth;

    return prisma.$transaction(async (transaction) => {
      const now = new Date();

      const reminderData = {
        documentId: params.documentId,
        companyId: params.companyId,
        contactId: params.contactId,
        type: params.type,
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

      if (isFailure) {
        // Kayıt varsa son hatayla güncellenir, bildirim her seferinde yeniden oluşturulur
        // Aynı içerikte bildirim daha önce gittiyse tekrar gönderme
        const existing = await transaction.documentReminder.findUnique({
          where: {
            documentId_type_targetDate_reminderMonth_channel: {
              documentId: params.documentId,
              type: params.type,
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
        await transaction.documentReminder.upsert({
          where: {
            documentId_type_targetDate_reminderMonth_channel: {
              documentId: params.documentId,
              type: params.type,
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
        // "1 ay kaldı" bildirimi belge/ay başına bir kez gider
        const reminderResult = await transaction.documentReminder.createMany({
          data: [reminderData],
          skipDuplicates: true,
        });

        if (reminderResult.count === 0) {
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

  async findPendingWhatsApp(limit = 20) {
    return prisma.documentReminder.findMany({
      where: {
        status: "PENDING",
        channel: "WHATSAPP",
        // YENİ: Geçici hata alan kayıt, son denemeden 15 dk geçmeden tekrar alınmaz
        // (mail kuyruğundaki findPending ile aynı kural).
        OR: [
          { attemptedAt: null },
          {
            attemptedAt: {
              lt: new Date(
                Date.now() - WHATSAPP_RETRY_DELAY_MINUTES * 60 * 1000,
              ),
            },
          },
        ],
      },
      include: {
        document: true,
        company: {
          include: {
            authorization: {
              select: {
                authorizationEndDate: true,
              },
            },
            consultantUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
              },
            },
            // YENİ: Gönderim anında güncel numaralar firmanın bütün
            // iletişim kayıtlarından alınır.
            contacts: {
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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

  async countWhatsAppSentSince(date: Date): Promise<number> {
    return prisma.documentReminder.count({
      where: {
        status: "SENT",
        channel: "WHATSAPP",
        sentAt: {
          gte: date,
        },
      },
    });
  }

  async findLatestAttemptedWhatsApp() {
    return prisma.documentReminder.findFirst({
      where: {
        channel: "WHATSAPP",
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
  async findPending(limit = 20) {
    return prisma.documentReminder.findMany({
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
        document: true,
        company: {
          include: {
            identity: true,
            authorization: {
              // YENİ
              select: {
                // YENİ
                authorizationEndDate: true, // YENİ
              }, // YENİ
            }, // YENİ
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

  async markSkipped(id: number, reason: string) {
    return prisma.documentReminder.update({
      where: { id },
      data: {
        status: "SKIPPED",
        attemptedAt: new Date(),
        errorMessage: reason,
      },
    });
  }
  async markForRetry(id: number, errorMessage: string) {
    return prisma.documentReminder.update({
      where: { id },
      data: {
        status: "PENDING",
        attemptedAt: new Date(),
        errorMessage,
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
