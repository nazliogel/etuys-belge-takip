import { prisma } from "../config/env.js";

type ReminderType = "EXTENSION_APPLICATION" | "CLOSURE_APPLICATION";

type ReminderChannel = "EMAIL" | "WHATSAPP" | "CONSULTANT_IN_APP";

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
