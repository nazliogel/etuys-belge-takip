import { env } from "../config/env.js";
import { CompanyAuthorizationReminderRepository } from "../repositories/company-authorization-reminder.repository.js";
import {
  hasOpenIncentiveDocument,
  resolveAuthorizationReminderDecision,
  NO_OPEN_DOCUMENT_SKIP_REASON,
  AUTHORIZATION_CHANGED_SKIP_REASON,
} from "./company-authorization-reminder.service.js";
import { normalizeDate } from "./document-reminder.service.js";
import {
  collectWhatsAppRecipients,
  getWhatsAppWarnings,
  joinWhatsAppRecipients,
} from "./reminder-contact-check.js";
import { createAuthorizationWhatsAppTemplate } from "./whatsapp-template.service.js";
import { WhatsAppService } from "./whatsapp.service.js";
import { WhatsAppRateLimitService } from "./whatsapp-rate-limit.service.js";
import { ReminderNotificationService } from "./reminder-notification.service.js";
import { notifySystemAlert } from "./system-alert.service.js";
import { getTurkeyDay } from "../utils/turkey-date.js";
import {
  MAX_WHATSAPP_ATTEMPTS,
  combineRecipientErrors,
  getPreviousAttempts,
  isTransientWhatsAppError,
  withAttemptPrefix,
} from "../utils/whatsapp-retry.js";

type PendingWhatsAppReminder = Awaited<
  ReturnType<CompanyAuthorizationReminderRepository["findPendingWhatsApp"]>
>[number];

export class CompanyAuthorizationReminderWhatsAppWorkerService {
  private isProcessing = false;

  constructor(
    private readonly repository = new CompanyAuthorizationReminderRepository(),

    private readonly whatsAppService = new WhatsAppService(),
    private readonly rateLimitService = new WhatsAppRateLimitService(),
    private readonly reminderNotificationService = new ReminderNotificationService(),
  ) {}

  async processPendingReminders(limit = 1) {
    const paused = (reason: string, retryAfterSeconds?: number) => ({
      processed: false,
      reason,
      retryAfterSeconds,
      foundCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: [],
    });

    if (!env.whatsappSendingEnabled) {
      return paused("WHATSAPP_SENDING_ENABLED=false");
    }

    if (
      !env.kapsoApiKey ||
      !env.kapsoPhoneNumberId ||
      !env.whatsappApiVersion
    ) {
      return paused("WHATSAPP_CONFIGURATION_MISSING");
    }

    if (this.isProcessing) {
      return paused("WORKER_ALREADY_RUNNING");
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      return paused("INVALID_LIMIT");
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      const today = getTurkeyDay(now);
      const rateLimit = await this.rateLimitService.check(now);

      if (!rateLimit.allowed) {
        return paused(
          rateLimit.reason ?? "WHATSAPP_RATE_LIMIT",
          rateLimit.retryAfterSeconds,
        );
      }

      const reminders = await this.repository.findPendingWhatsApp(1);

      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      const results: Record<string, unknown>[] = [];

      for (const reminder of reminders) {
        try {
          let skipReason: string | undefined;

          // 1) Hatırlatma hâlâ geçerli mi?
          if (!reminder.company.isActive) {
            skipReason = "Firma artık aktif değil.";
          }

          const documentState = skipReason
            ? null
            : await this.repository.findCompanyDocumentState(
                reminder.companyId,
              );

          if (
            !skipReason &&
            (!documentState || !hasOpenIncentiveDocument(documentState))
          ) {
            skipReason = NO_OPEN_DOCUMENT_SKIP_REASON;
          }

          const currentEndDate = reminder.authorization.authorizationEndDate;

          const currentDecision = currentEndDate
            ? resolveAuthorizationReminderDecision(currentEndDate, today)
            : null;

          if (
            !skipReason &&
            (!currentEndDate ||
              !currentDecision ||
              currentDecision.reminderMonth !== reminder.reminderMonth ||
              normalizeDate(currentDecision.targetDate).getTime() !==
                normalizeDate(reminder.targetDate).getTime())
          ) {
            skipReason = AUTHORIZATION_CHANGED_SKIP_REASON;
          }

          if (skipReason) {
            await this.repository.markSkipped(reminder.id, skipReason);
            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason: skipReason,
            });
            continue;
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

          if (joinWhatsAppRecipients(currentRecipients) !== reminder.recipient) {
            console.warn(
              `WhatsApp authorization reminder ${reminder.id}: numaralar kuyruktan sonra değişmiş, güncel numaralara gönderiliyor.`,
            );
          }

          const template = createAuthorizationWhatsAppTemplate({
            companyName: reminder.company.name,
            targetDate: reminder.targetDate,
            today: now,
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
              `WhatsApp authorization reminder ${reminder.id}: ${sent.length} numaraya gönderildi, ${failed.length} numaraya gönderilemedi.`,
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
              `WhatsApp authorization reminder ${reminder.id} geçici hata aldı, tekrar denenecek: ${errorMessage}`,
            );
            continue;
          }

          await this.repository.markFailed(reminder.id, errorMessage);
          failedCount += 1;

          // 3 denemenin sonunda hâlâ geçici hata: danışmana değil sistem sorumlusuna.
          if (isTransientWhatsAppError(error)) {
            await notifySystemAlert({
              kind: "Yetkilendirme (WhatsApp)",
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
            authorizationId: reminder.authorizationId,
            companyId: reminder.companyId,
            contactId: reminder.contactId ?? undefined,
            consultantUserId: consultant.id,
            reminderMonth: reminder.reminderMonth,
            targetDate: reminder.targetDate,
            title: "Firma WhatsApp mesajı gönderilemedi",
            description: [
              `${reminder.company.name} firmasına ait yetki süresi WhatsApp bildirimi gönderilemedi.`,
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
        authorizationId: reminder.authorizationId,
        companyId: reminder.companyId,
        contactId: reminder.contactId ?? undefined,
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