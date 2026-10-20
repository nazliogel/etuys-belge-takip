import { CompanyAuthorizationReminderRepository } from "../repositories/company-authorization-reminder.repository.js";
import { CompanyAuthorizationReminderPreviewService } from "./company-authorization-reminder-preview.service.js";
import { ReminderNotificationService } from "./reminder-notification.service.js";
import { createAuthorizationWhatsAppTemplate } from "./whatsapp-template.service.js";
import { env } from "../config/env.js";

interface BlockedReminder {
  authorizationId: number;
  companyName: string;
  warnings: string[];
}

/**
 * Yetkilendirme WhatsApp kuyruğu.
 *
 * Firma, ay, iletişim kişisi ve telefon kontrolü mail kuyruğuyla aynı
 * kaynaktan (CompanyAuthorizationReminderPreviewService) gelir. Böylece
 * hangi firmaya hangi dönemde hatırlatma gideceği mail ile birebir aynıdır.
 */
export class CompanyAuthorizationReminderWhatsAppQueueService {
  constructor(
    private readonly repository = new CompanyAuthorizationReminderRepository(),
    private readonly previewService = new CompanyAuthorizationReminderPreviewService(),
    private readonly reminderNotificationService = new ReminderNotificationService(),
  ) {}

  async enqueueDueReminders(now: Date = new Date()) {
    // Mail kuyruğu ile aynı çağrı (aynı "now" değeri, aynı aday listesi).
    const previews = await this.previewService.createPreviews(now);

    let queuedCount = 0;
    let duplicateCount = 0;
    let consultantNotificationCount = 0;
    let duplicateConsultantNotificationCount = 0;
    let missingConsultantCount = 0;

    const blocked: BlockedReminder[] = [];

    // Yetki süresi dolmadan önce de (mail ile aynı dönemlerde) WhatsApp gider.
    for (const preview of previews) {
      if (!preview.whatsappCanSend) {
        blocked.push({
          authorizationId: preview.authorizationId,
          companyName: preview.companyName,
          warnings: preview.whatsappWarnings,
        });

        // Mail de engelliyse bildirimi mail kuyruğu gönderir ve telefon
        // eksikliğini de yazar (tek bildirim). Burada ayrıca bildirim gönderilmez.
        if (!preview.canSend) {
          continue;
        }

        // Mail gidiyor ama WhatsApp gidemiyor: mail kuyruğu ile aynı
        // şekilde danışmana bildirim, danışman yoksa admin'e mail.
        if (preview.consultantUserId && preview.consultantIsActive) {
          const notificationCreated =
            await this.repository.createConsultantNotification({
              authorizationId: preview.authorizationId,
              companyId: preview.companyId,
              contactId: preview.contactId,
              consultantUserId: preview.consultantUserId,
              reminderMonth: preview.reminderMonth,
              targetDate: preview.targetDate,
              title: "Yetki süresi WhatsApp bildirimi gönderilemedi",
              description: [
                `${preview.companyName} firmasına ait yetki süresi WhatsApp bildirimi eksik bilgiler nedeniyle gönderilemedi (e-posta gönderildi).`,
                `Eksik bilgiler: ${preview.whatsappWarnings.join(", ")}`,
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
              authorizationId: preview.authorizationId,
              companyId: preview.companyId,
              contactId: preview.contactId,
              reminderMonth: preview.reminderMonth,
              targetDate: preview.targetDate,
              recipient: env.adminFallbackEmail,
              subject: `${preview.companyName} - Danışman Bilgisi Eksik`,
              message: [
                `${preview.companyName} firmasına ait bildirim işlemi sırasında aktif bir danışman bulunamadı.`,
                "Lütfen firma danışman bilgilerini kontrol ederek gerekli danışman atamasını yapınız.",
                `Firma: ${preview.companyName}`,
                `Firma ID: ${preview.companyId}`,
                `Eksik bilgiler (WhatsApp): ${preview.whatsappWarnings.join(", ")}`,
              ].join("\n"),
            });

          if (adminEmailReminderId) {
            try {
              await this.reminderNotificationService.notifyMissingConsultant({
                companyName: preview.companyName,
                companyId: preview.companyId,
                errorMessage: `WhatsApp mesajı gönderilemedi: ${preview.whatsappWarnings.join(", ")}`,
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

      // Şablon hazırlanamazsa bu firma atlanır, diğerleri işlenmeye devam eder.
      let message: string;

      try {
        const template = createAuthorizationWhatsAppTemplate({
          companyName: preview.companyName,
          targetDate: preview.targetDate,
          today: now,
        });

        message = template.previewText;
      } catch (error) {
        blocked.push({
          authorizationId: preview.authorizationId,
          companyName: preview.companyName,
          warnings: [
            error instanceof Error
              ? error.message
              : "Yetkilendirme WhatsApp şablonu hazırlanamadı.",
          ],
        });
        continue;
      }

      const queued = await this.repository.enqueueWhatsApp({
        authorizationId: preview.authorizationId,
        companyId: preview.companyId,
        contactId: preview.contactId,
        reminderMonth: preview.reminderMonth,
        targetDate: preview.targetDate,
        recipient: preview.whatsappRecipient,
        message,
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