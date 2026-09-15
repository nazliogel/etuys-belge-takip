import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import { DocumentReminderWhatsAppPreviewService } from "./document-reminder-whatsapp-preview.service.js";

interface BlockedWhatsAppReminder {
  documentId: number;
  companyName: string;
  warnings: string[];
}

export class DocumentReminderWhatsAppQueueService {
  constructor(
    private readonly repository = new DocumentReminderRepository(),
    private readonly previewService =
      new DocumentReminderWhatsAppPreviewService(),
  ) {}

  async enqueueDueReminders(today: Date = new Date()) {
    const previews = await this.previewService.createPreviews(today);

    let queuedCount = 0;
    let duplicateCount = 0;

    const blocked: BlockedWhatsAppReminder[] = [];

    for (const preview of previews) {
      if (!preview.canSend) {
        blocked.push({
          documentId: preview.documentId,
          companyName: preview.companyName,
          warnings: preview.warnings,
        });

        continue;
      }

      const queued = await this.repository.enqueueWhatsApp({
        documentId: preview.documentId,
        companyId: preview.companyId,
        contactId: preview.contactId,
        type: preview.type,
        reminderMonth: preview.reminderMonth,
        targetDate: preview.targetDate,
        recipient: preview.recipient,
        message: preview.message,
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
    };
  }
}