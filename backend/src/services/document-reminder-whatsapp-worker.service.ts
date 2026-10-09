import { env } from "../config/env.js";
import { CompanyRequestRepository } from "../repositories/company-request.repository.js";
import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import {
  normalizeDate,
  resolveReminderDecision,
} from "./document-reminder.service.js";
import {
  collectWhatsAppRecipients,
  getWhatsAppWarnings,
  joinWhatsAppRecipients,
} from "./reminder-contact-check.js";
import {
  createClosureWhatsAppTemplate,
  createExtensionWhatsAppTemplate,
} from "./whatsapp-template.service.js";
import { WhatsAppService } from "./whatsapp.service.js";
import { WhatsAppRateLimitService } from "./whatsapp-rate-limit.service.js";
import { ReminderNotificationService } from "./reminder-notification.service.js";
import { notifySystemAlert } from "./system-alert.service.js";
import {
  MAX_WHATSAPP_ATTEMPTS,
  combineRecipientErrors,
  getPreviousAttempts,
  isTransientWhatsAppError,
  withAttemptPrefix,
} from "../utils/whatsapp-retry.js";

function isSameDate(first: Date, second: Date): boolean {
  return normalizeDate(first).getTime() === normalizeDate(second).getTime();
}

type PendingWhatsAppReminder = Awaited<
  ReturnType<DocumentReminderRepository["findPendingWhatsApp"]>
>[number];

export class DocumentReminderWhatsAppWorkerService {
  private isProcessing = false;

  constructor(
    private readonly repository = new DocumentReminderRepository(),
    private readonly companyRequestRepository = new CompanyRequestRepository(),
    private readonly whatsAppService = new WhatsAppService(),
    private readonly rateLimitService = new WhatsAppRateLimitService(),
    private readonly reminderNotificationService = new ReminderNotificationService(),
  ) {}

  async processPendingReminders(limit = 20) {
    if (!env.whatsappSendingEnabled) {
      return {
        processed: false,
        reason: "WHATSAPP_SENDING_ENABLED=false",
        foundCount: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: [],
      };
    }

    if (
      !env.kapsoApiKey ||
      !env.kapsoPhoneNumberId ||
      !env.whatsappApiVersion
    ) {
      return {
        processed: false,
        reason: "WHATSAPP_CONFIGURATION_MISSING",
        foundCount: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: [],
      };
    }

    if (this.isProcessing) {
      return {
        processed: false,
        reason: "WORKER_ALREADY_RUNNING",
        foundCount: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: [],
      };
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      const rateLimit = await this.rateLimitService.check(now);

      if (!rateLimit.allowed) {
        return {
          processed: false,
          reason: rateLimit.reason ?? "WHATSAPP_RATE_LIMIT",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
          foundCount: 0,
          sentCount: 0,
          failedCount: 0,
          skippedCount: 0,
          results: [],
        };
      }
      const reminders = await this.repository.findPendingWhatsApp(
        Math.min(limit, 1),
      );

      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      const results: Record<string, unknown>[] = [];

      for (const reminder of reminders) {
        try {
          const skip = async (reason: string) => {
            await this.repository.markSkipped(reminder.id, reason);
            skippedCount += 1;
            results.push({ id: reminder.id, status: "SKIPPED", reason });
          };
          // Firma kuyruğa alındıktan sonra pasif yapıldıysa mesaj gitmez.
          if (!reminder.company.isActive) {
            await skip("Firma artık aktif değil.");
            continue;
          }
          const document = reminder.document;

          // 1) Hatırlatma hâlâ geçerli mi? (Mail worker'ı ile aynı sıra ve aynı kontroller.)
          if (
            !document.isActive ||
            document.status !== "OPEN" ||
            !document.documentEndDate ||
            !document.extensionDate
          ) {
            await skip("Belge artık aktif ve açık durumda değil.");
            continue;
          }

          const currentDecision = resolveReminderDecision(
            document.documentEndDate,
            document.extensionDate,
            now,
          );

          if (
            !currentDecision ||
            currentDecision.type !== reminder.type ||
            currentDecision.reminderMonth !== reminder.reminderMonth ||
            !isSameDate(currentDecision.targetDate, reminder.targetDate)
          ) {
            await skip("Hatırlatma koşulları artık geçerli değil.");
            continue;
          }

          const closureRequest =
            await this.companyRequestRepository.findLatestClosureRequest({
              companyId: reminder.companyId,
              externalDocumentId: document.externalDocumentId,
            });

          if (reminder.type === "EXTENSION_APPLICATION" && closureRequest) {
            await skip("Firma için kapatma başvurusu bulundu.");
            continue;
          }

          if (reminder.type === "CLOSURE_APPLICATION" && closureRequest) {
            const requestStatus = closureRequest.requestStatus
              ?.trim()
              .toLocaleUpperCase("tr-TR");

            if (requestStatus !== "REDDEDİLDİ") {
              await skip(
                "Firma için reddedilmemiş bir kapatma başvurusu bulundu.",
              );
              continue;
            }
          }

          // 2) İletişim bilgisi: firmanın BÜTÜN iletişim kayıtlarındaki GÜNCEL
          // cep numaraları. Kuyruğa eklendikten sonra numara eklendi/değiştiyse
          // güncel numaralara gönderilir (eski numaralara gönderilmez).
          // Mail worker'ı gibi, hiç numara yoksa kalıcı hatadır ve danışmana bildirilir.
          const contacts = reminder.company.contacts;
          const currentRecipients = collectWhatsAppRecipients(contacts);

          if (currentRecipients.length === 0) {
            throw new Error(getWhatsAppWarnings(contacts).join(" "));
          }

          if (
            joinWhatsAppRecipients(currentRecipients) !== reminder.recipient
          ) {
            console.warn(
              `WhatsApp reminder ${reminder.id}: numaralar kuyruktan sonra değişmiş, güncel numaralara gönderiliyor.`,
            );
          }

          // Yetki süresi dolmuş olsa da belge hatırlatması gönderilir.
          // Yetkilendirme bildirimi ayrı worker tarafından gönderilir.
          const authorizationEndDate =
            reminder.company.authorization?.authorizationEndDate ?? null;

          const authorizationExpired =
            !authorizationEndDate ||
            normalizeDate(authorizationEndDate) < normalizeDate(now);

          const template =
            reminder.type === "CLOSURE_APPLICATION"
              ? createClosureWhatsAppTemplate({
                  companyName: reminder.company.name,
                  documentNumber: document.documentNumber,
                  targetDate: reminder.targetDate,
                  authorizationExpired,
                })
              : createExtensionWhatsAppTemplate({
                  companyName: reminder.company.name,
                  documentNumber: document.documentNumber,
                  targetDate: reminder.targetDate,
                  authorizationExpired,
                });

          // Firmanın bütün cep numaralarına gönderilir.
          // Mailde olduğu gibi en az birine gittiyse başarılı sayılır.
          const { sent, failed } =
            await this.whatsAppService.sendTemplateToRecipients(
              currentRecipients,
              {
                templateName: template.templateName,
                languageCode: template.languageCode,
                parameters: template.parameters,
              },
            );

          if (sent.length === 0) {
            throw combineRecipientErrors(failed);
          }

          const messageIds = sent.map((item) => item.messageId).join(",");
          await this.repository.markSent(reminder.id, messageIds);

          if (failed.length > 0) {
            console.warn(
              `WhatsApp reminder ${reminder.id}: ${sent.length} numaraya gönderildi, ${failed.length} numaraya gönderilemedi.`,
              failed.map((item) => item.to),
            );
          }

          sentCount += 1;
          results.push({
            id: reminder.id,
            status: "SENT",
            messageId: messageIds,
            sentTo: sent.map((item) => item.to),
            failedTo: failed.map((item) => item.to),
          });
        } catch (error) {
          // Mail worker'ı ile birebir aynı hata mantığı.
          const rawErrorMessage =
            error instanceof Error
              ? error.message
              : "Bilinmeyen WhatsApp gönderim hatası.";

          const attempt = getPreviousAttempts(reminder.errorMessage) + 1;
          const errorMessage = withAttemptPrefix(attempt, rawErrorMessage);

          // Geçici hata: kayıt kuyrukta kalır, 15 dk sonra tekrar denenir.
          if (
            isTransientWhatsAppError(error) &&
            attempt < MAX_WHATSAPP_ATTEMPTS
          ) {
            await this.repository.markForRetry(reminder.id, errorMessage);
            console.warn(
              `WhatsApp reminder ${reminder.id} geçici hata aldı, tekrar denenecek: ${errorMessage}`,
            );
            continue;
          }

          await this.repository.markFailed(reminder.id, errorMessage);
          failedCount += 1;

          // 3 denemenin sonunda hâlâ geçici hata: danışmana değil sistem sorumlusuna.
          if (isTransientWhatsAppError(error)) {
            await notifySystemAlert({
              kind:
                reminder.type === "CLOSURE_APPLICATION"
                  ? "Kapatma (WhatsApp)"
                  : "Süre uzatma (WhatsApp)",
              reminderId: reminder.id,
              companyName: reminder.company.name,
              recipient: reminder.recipient,
              errorMessage,
              channel: "WHATSAPP",
            });

            results.push({
              id: reminder.id,
              status: "FAILED",
              errorMessage,
              systemAlert: true,
            });
            continue;
          }

          // Kalıcı hata: danışmana bildirim, danışman yoksa admin'e mail.
          const notification = await this.notifyPermanentFailure(
            reminder,
            errorMessage,
          );

          results.push({
            id: reminder.id,
            status: "FAILED",
            errorMessage,
            ...notification,
          });
        }
      }

      return {
        processed: true,
        foundCount: reminders.length,
        sentCount,
        failedCount,
        skippedCount,
        results,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /** Mail worker'ındaki kalıcı hata bildiriminin WhatsApp karşılığı. */
  private async notifyPermanentFailure(
    reminder: PendingWhatsAppReminder,
    errorMessage: string,
  ) {
    let consultantNotificationCreated = false;
    let consultantNotificationError: string | undefined;

    const consultant = reminder.company.consultantUser;

    if (consultant && consultant.isActive) {
      try {
        consultantNotificationCreated =
          await this.repository.createConsultantNotification({
            documentId: reminder.documentId,
            companyId: reminder.companyId,
            contactId: reminder.contactId ?? undefined,
            consultantUserId: consultant.id,
            type: reminder.type,
            reminderMonth: reminder.reminderMonth,
            targetDate: reminder.targetDate,
            title: "Firma WhatsApp mesajı gönderilemedi",
            description: [
              `${reminder.company.name} firmasına ait belge WhatsApp bildirimi gönderilemedi.`,
              `Alıcı: ${reminder.recipient || "-"}.`,
              `Hata: ${errorMessage}`,
            ].join(" "),
            channel: "WHATSAPP",
          });
      } catch (notificationError) {
        consultantNotificationError =
          notificationError instanceof Error
            ? notificationError.message
            : "Danışman bildirimi oluşturulamadı.";
      }

      return { consultantNotificationCreated, consultantNotificationError };
    }

    if (!env.adminFallbackEmail) {
      return {
        consultantNotificationCreated,
        consultantNotificationError:
          "ADMIN_FALLBACK_EMAIL tanımlı değil. Admin bildirimi gönderilemedi.",
      };
    }

    // Firma ve ay başına tek kayıt: mail tarafı aynı ay için zaten admin'e
    // yazdıysa yeni kayıt oluşmaz, ikinci mail gitmez.
    const adminEmailReminderId = await this.repository.createAdminEmailReminder(
      {
        documentId: reminder.documentId,
        companyId: reminder.companyId,
        contactId: reminder.contactId ?? undefined,
        type: reminder.type,
        reminderMonth: reminder.reminderMonth,
        targetDate: reminder.targetDate,
        recipient: env.adminFallbackEmail,
        subject: `${reminder.company.name} - Danışman Bilgisi Eksik`,
        message: [
          `${reminder.company.name} firmasına ait bildirim işlemi sırasında aktif bir danışman bulunamadı.`,
          "Lütfen firma danışman bilgilerini kontrol ederek gerekli danışman atamasını yapınız.",
          `Firma: ${reminder.company.name}`,
          `Firma ID: ${reminder.companyId}`,
          `Hata (WhatsApp): ${errorMessage}`,
        ].join("\n"),
      },
    );

    if (adminEmailReminderId) {
      try {
        await this.reminderNotificationService.notifyMissingConsultant({
          companyName: reminder.company.name,
          companyId: reminder.companyId,
          errorMessage: `WhatsApp mesajı gönderilemedi: ${errorMessage}`,
        });

        await this.repository.markSent(adminEmailReminderId);
      } catch (notificationError) {
        const adminErrorMessage =
          notificationError instanceof Error
            ? notificationError.message
            : "Eksik danışman bildirimi gönderilemedi.";

        consultantNotificationError = adminErrorMessage;

        await this.repository.markFailed(
          adminEmailReminderId,
          adminErrorMessage,
        );
      }
    }

    return { consultantNotificationCreated, consultantNotificationError };
  }
}
