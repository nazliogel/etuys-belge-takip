import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import { DocumentReminderPreviewService } from "./document-reminder-preview.service.js";

interface BlockedReminder {
  documentId: number;
  companyName: string;
  warnings: string[];
}

export class DocumentReminderQueueService {
  constructor(
    private readonly repository =
      new DocumentReminderRepository(),
    private readonly previewService =
      new DocumentReminderPreviewService(),
  ) {}

  async enqueueDueReminders(today: Date = new Date()) {
    const previews =
      await this.previewService.createPreviews(today);

    let queuedCount = 0;
    let duplicateCount = 0;

    const blocked: BlockedReminder[] = [];

    for (const preview of previews) {
      if (!preview.canSend) {
        blocked.push({
          documentId: preview.documentId,
          companyName: preview.companyName,
          warnings: preview.warnings,
        });

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
    };
  }
}