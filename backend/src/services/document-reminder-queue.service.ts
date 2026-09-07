import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import { DocumentReminderPreviewService } from "./document-reminder-preview.service.js";

interface BlockedReminder {
  documentId: number;
  companyName: string;
  warnings: string[];
}

export class DocumentReminderQueueService {
  constructor(
    private readonly repository = new DocumentReminderRepository(),
    private readonly previewService = new DocumentReminderPreviewService(),
  ) {}

  async listPendingReminders(limit = 20) {
    const [totalCount, reminders] = await Promise.all([
      this.repository.countPending(),
      this.repository.findPending(limit),
    ]);

    return {
      totalCount,
      listedCount: reminders.length,
      reminders,
    };
  }

  async enqueueDueReminders(today: Date = new Date()) {
    const previews = await this.previewService.createPreviews(today);

    let queuedCount = 0;
    let duplicateCount = 0;
    let consultantNotificationCount = 0;
    let duplicateConsultantNotificationCount = 0;
    let missingConsultantCount = 0;
    const blocked: BlockedReminder[] = [];

    for (const preview of previews) {
      if (!preview.canSend) {
        blocked.push({
          documentId: preview.documentId,
          companyName: preview.companyName,
          warnings: preview.warnings,
        });

        if (
          preview.consultantUserId &&
          preview.consultantIsActive &&
          preview.consultantRole === "OPERATION"
        ) {
          const notificationCreated =
            await this.repository.createConsultantNotification({
              documentId: preview.documentId,
              companyId: preview.companyId,
              contactId: preview.contactId,
              consultantUserId: preview.consultantUserId,
              type: preview.type,
              reminderMonth: preview.reminderMonth,
              targetDate: preview.targetDate,
              title: "Belge bildirimi gönderilemedi",
              description: [
                `${preview.companyName} firmasına ait bildirim eksik bilgiler nedeniyle gönderilemedi.`,
                `Eksik bilgiler: ${preview.warnings.join(", ")}`,
              ].join(" "),
            });

          if (notificationCreated) {
            consultantNotificationCount += 1;
          } else {
            duplicateConsultantNotificationCount += 1;
          }
        } else {
          missingConsultantCount += 1;
        }

        continue;
      }

      const queued = await this.repository.enqueue({
        documentId: preview.documentId,
        companyId: preview.companyId,
        contactId: preview.contactId,
        type: preview.type,
        reminderMonth: preview.reminderMonth,
        targetDate: preview.targetDate,
        recipient: preview.recipient,
        subject: preview.subject,
        message: preview.text,
      });

      if (queued) {
        queuedCount += 1;
      } else {
        duplicateCount += 1;
      }
    }

    return {
      totalCount: previews.length,
      queuedCount,
      duplicateCount,
      blockedCount: blocked.length,
      blocked,
      consultantNotificationCount,
      duplicateConsultantNotificationCount,
      missingConsultantCount,
    };
  }
}
