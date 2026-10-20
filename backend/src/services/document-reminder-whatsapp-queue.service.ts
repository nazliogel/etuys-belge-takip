import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import { DocumentReminderWhatsAppPreviewService } from "./document-reminder-whatsapp-preview.service.js";
import { ReminderNotificationService } from "./reminder-notification.service.js";
import { env } from "../config/env.js";

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
    private readonly reminderNotificationService = new ReminderNotificationService(),
  ) {}

  async enqueueDueReminders(today: Date = new Date()) {
    const previews = await this.previewService.createPreviews(today);

    let queuedCount = 0;
    let duplicateCount = 0;
    let consultantNotificationCount = 0;
    let duplicateConsultantNotificationCount = 0;
    let missingConsultantCount = 0;

    const blocked: BlockedWhatsAppReminder[] = [];

    for (const preview of previews) {
      if (!preview.canSend) {
        blocked.push({
          documentId: preview.documentId,
          companyName: preview.companyName,
          warnings: preview.warnings,
        });

        // YENİ: Mail de engelliyse bildirimi mail kuyruğu gönderir ve telefon
        // eksikliğini de yazar (tek bildirim). Burada ayrıca bildirim gönderilmez.
        if (!preview.emailCanSend) {
          continue;
        }

        // YENİ: Mail gidiyor ama WhatsApp gidemiyor: mail kuyruğu ile aynı
        // şekilde danışmana bildirim, danışman yoksa admin'e mail.
        if (preview.consultantUserId && preview.consultantIsActive) {
          const notificationCreated =
            await this.repository.createConsultantNotification({
              documentId: preview.documentId,
              companyId: preview.companyId,
              contactId: preview.contactId,
              consultantUserId: preview.consultantUserId,
              type: preview.type,
              reminderMonth: preview.reminderMonth,
              targetDate: preview.targetDate,
              title: "Belge WhatsApp bildirimi gönderilemedi",
              description: [
                `${preview.companyName} firmasına ait WhatsApp bildirimi eksik bilgiler nedeniyle gönderilemedi (e-posta gönderildi).`,
                `Eksik bilgiler: ${preview.warnings.join(", ")}`,
              ].join(" "),
              channel: "WHATSAPP",
            });

          if (notificationCreated) {
            consultantNotificationCount += 1;
          } else {
            duplicateConsultantNotificationCount += 1;
          }
        } else {
          missingConsultantCount += 1;

          if (!env.adminFallbackEmail) {
            console.error(
              `ADMIN_FALLBACK_EMAIL tanımlı değil. Admin bildirimi oluşturulamadı. Firma: ${preview.companyName}`,
            );
            continue;
          }

          // Firma ve ay başına tek kayıt: mail tarafı aynı ay için zaten
          // admin'e yazdıysa bu çağrı yeni kayıt oluşturmaz, ikinci mail gitmez.
          const adminEmailReminderId =
            await this.repository.createAdminEmailReminder({
              documentId: preview.documentId,
              companyId: preview.companyId,
              contactId: preview.contactId,
              type: preview.type,
              reminderMonth: preview.reminderMonth,
              targetDate: preview.targetDate,
              recipient: env.adminFallbackEmail,
              subject: `${preview.companyName} - Danışman Bilgisi Eksik`,
              message: [
                `${preview.companyName} firmasına ait bildirim işlemi sırasında aktif bir danışman bulunamadı.`,
                "Lütfen firma danışman bilgilerini kontrol ederek gerekli danışman atamasını yapınız.",
                `Firma: ${preview.companyName}`,
                `Firma ID: ${preview.companyId}`,
                `Eksik bilgiler (WhatsApp): ${preview.warnings.join(", ")}`,
              ].join("\n"),
            });

          if (adminEmailReminderId) {
            try {
              await this.reminderNotificationService.notifyMissingConsultant({
                companyName: preview.companyName,
                companyId: preview.companyId,
                errorMessage: `WhatsApp mesajı gönderilemedi: ${preview.warnings.join(", ")}`,
              });

              await this.repository.markSent(adminEmailReminderId);
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : "Admin fallback e-postası gönderilemedi.";

              await this.repository.markFailed(
                adminEmailReminderId,
                errorMessage,
              );
            }
          }
        }

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
      consultantNotificationCount,
      duplicateConsultantNotificationCount,
      missingConsultantCount,
    };
  }
}