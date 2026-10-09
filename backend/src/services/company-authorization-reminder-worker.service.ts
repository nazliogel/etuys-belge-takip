import { env } from "../config/env.js";
import { CompanyAuthorizationReminderRepository } from "../repositories/company-authorization-reminder.repository.js";
import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import { createAuthorizationExpiryEmailTemplate } from "./closure-email-template.service.js";
import {
  CompanyAuthorizationReminderService,
  NO_OPEN_DOCUMENT_SKIP_REASON,
  resolveAuthorizationReminderDecision,
  AUTHORIZATION_CHANGED_SKIP_REASON,
} from "./company-authorization-reminder.service.js";
import { normalizeDate } from "./document-reminder.service.js";
import { DEFAULT_CC_RECIPIENTS } from "./document-reminder-preview.service.js";
import { EmailService } from "./email.service.js";
import { ReminderNotificationService } from "./reminder-notification.service.js";
import {
  MAX_EMAIL_ATTEMPTS,
  getPreviousAttempts,
  isTransientEmailError,
  withAttemptPrefix,
} from "../utils/email-retry.js";
import { notifySystemAlert } from "./system-alert.service.js";
import {
  collectEmailRecipients,
  getEmailWarnings,
  joinEmailRecipients,
} from "./reminder-contact-check.js";
const TURKEY_UTC_OFFSET_HOURS = 3;

/** YENİ: Firma kuyruğa alındıktan sonra pasif yapıldıysa gönderilmez. */
const COMPANY_INACTIVE_SKIP_REASON = "Firma artık aktif değil.";

function getHourStart(now: Date): Date {
  return new Date(now.getTime() - 60 * 60 * 1000);
}

function getTurkeyDayStart(now: Date): Date {
  const turkeyTime = new Date(
    now.getTime() + TURKEY_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  );

  return new Date(
    Date.UTC(
      turkeyTime.getUTCFullYear(),
      turkeyTime.getUTCMonth(),
      turkeyTime.getUTCDate(),
    ) -
      TURKEY_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  );
}

function getLatestAttemptDate(
  first?: Date | null,
  second?: Date | null,
): Date | null {
  const dates = [first, second].filter(
    (date): date is Date => date instanceof Date,
  );

  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

export class CompanyAuthorizationReminderWorkerService {
  private isProcessing = false;

  constructor(
    private readonly repository = new CompanyAuthorizationReminderRepository(),
    private readonly documentRepository = new DocumentReminderRepository(),
    private readonly emailService = new EmailService(),
    private readonly reminderNotificationService = new ReminderNotificationService(),
    private readonly authorizationService = new CompanyAuthorizationReminderService(),
  ) {}

  async processPendingReminders(limit = 20) {
    if (!env.emailSendingEnabled) {
      return {
        processed: false,
        reason: "EMAIL_SENDING_ENABLED=false",
        foundCount: 0,
        sentCount: 0,
        failedCount: 0,
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
        results: [],
      };
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      const hourStart = getHourStart(now);
      const dayStart = getTurkeyDayStart(now);

      const [
        documentSentLastHour,
        authorizationSentLastHour,
        documentSentToday,
        authorizationSentToday,
        latestDocumentAttempt,
        latestAuthorizationAttempt,
      ] = await Promise.all([
        this.documentRepository.countSentSince(hourStart),
        this.repository.countSentSince(hourStart),
        this.documentRepository.countSentSince(dayStart),
        this.repository.countSentSince(dayStart),
        this.documentRepository.findLatestAttemptedEmail(),
        this.repository.findLatestAttemptedEmail(),
      ]);

      const sentLastHour = documentSentLastHour + authorizationSentLastHour;

      const sentToday = documentSentToday + authorizationSentToday;

      const latestAttemptDate = getLatestAttemptDate(
        latestDocumentAttempt?.attemptedAt,
        latestAuthorizationAttempt?.attemptedAt,
      );

      const recipientsPerMessage = 1 + DEFAULT_CC_RECIPIENTS.length;
      const sentRecipientsLastHour = sentLastHour * recipientsPerMessage;

      if (sentLastHour >= env.emailMaxMessagesPerHour) {
        return {
          processed: false,
          reason: "HOURLY_MESSAGE_LIMIT_REACHED",
          foundCount: 0,
          sentCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      if (sentRecipientsLastHour >= env.emailMaxRecipientsPerHour) {
        return {
          processed: false,
          reason: "HOURLY_RECIPIENT_LIMIT_REACHED",
          foundCount: 0,
          sentCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      if (sentToday >= env.emailMaxMessagesPerDay) {
        return {
          processed: false,
          reason: "DAILY_MESSAGE_LIMIT_REACHED",
          foundCount: 0,
          sentCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      if (latestAttemptDate) {
        const nextAllowedAt =
          latestAttemptDate.getTime() + env.emailDelaySeconds * 1000;

        const remainingMilliseconds = nextAllowedAt - now.getTime();

        if (remainingMilliseconds > 0) {
          return {
            processed: false,
            reason: "EMAIL_DELAY_ACTIVE",
            retryAfterSeconds: Math.ceil(remainingMilliseconds / 1000),
            foundCount: 0,
            sentCount: 0,
            failedCount: 0,
            results: [],
          };
        }
      }

      const remainingRecipientCapacity =
        env.emailMaxRecipientsPerHour - sentRecipientsLastHour;

      if (remainingRecipientCapacity < recipientsPerMessage) {
        return {
          processed: false,
          reason: "HOURLY_RECIPIENT_LIMIT_REACHED",
          foundCount: 0,
          sentCount: 0,
          failedCount: 0,
          results: [],
        };
      }

      const reminders = await this.repository.findPending(Math.min(limit, 1));

      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const results = [];

      for (const reminder of reminders) {
        try {
          // YENİ: Firma kuyruğa alındıktan sonra pasif yapıldıysa mail gitmez.
          if (!reminder.company.isActive) {
            await this.repository.markSkipped(
              reminder.id,
              COMPANY_INACTIVE_SKIP_REASON,
            );

            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason: COMPANY_INACTIVE_SKIP_REASON,
            });
            continue;
          }

          // Kuyruğa alındıktan sonra firmanın tüm belgeleri kapanmış
          // veya iptal olmuş olabilir. Göndermeden önce tekrar kontrol et.
          const hasOpenDocument =
            await this.authorizationService.companyHasOpenDocument(
              reminder.companyId,
            );

          if (!hasOpenDocument) {
            await this.repository.markSkipped(
              reminder.id,
              NO_OPEN_DOCUMENT_SKIP_REASON,
            );

            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason: NO_OPEN_DOCUMENT_SKIP_REASON,
            });
            continue;
          }
          // Kuyruğa alındıktan sonra yeni yetkilendirme yapılmış olabilir.
          // Güncel bitiş tarihine göre bu hatırlatma hâlâ geçerli değilse gönderilmez.
          const currentEndDate = reminder.authorization.authorizationEndDate;
          const currentDecision = currentEndDate
            ? resolveAuthorizationReminderDecision(currentEndDate, now)
            : null;

          if (
            !currentDecision ||
            currentDecision.reminderMonth !== reminder.reminderMonth ||
            normalizeDate(currentDecision.targetDate).getTime() !==
              normalizeDate(reminder.targetDate).getTime()
          ) {
            await this.repository.markSkipped(
              reminder.id,
              AUTHORIZATION_CHANGED_SKIP_REASON,
            );

            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason: AUTHORIZATION_CHANGED_SKIP_REASON,
            });
            continue;
          }

          // YENİ: Alıcılar gönderim anında firmanın GÜNCEL AKTİF iletişim
          // kişilerinden yeniden alınır. Kuyruğa alındıktan sonra pasif yapılan
          // kişiye mail gitmez; yeni eklenen aktif kişiye gider.
          const contacts = reminder.company.contacts;
          const currentRecipients = collectEmailRecipients(contacts);

          const validationErrors: string[] = [];

          if (currentRecipients.length === 0) {
            validationErrors.push(...getEmailWarnings(contacts));
          }

          if (!reminder.authorization.authorizationEndDate) {
            validationErrors.push("Firma yetki bitiş tarihi bulunamadı.");
          }

          if (validationErrors.length > 0) {
            throw new Error(
              `Gönderim öncesi bilgi kontrolü başarısız: ${validationErrors.join(
                ", ",
              )}`,
            );
          }

          const recipient = joinEmailRecipients(currentRecipients);

          if (recipient !== reminder.recipient) {
            console.warn(
              `Authorization reminder ${reminder.id}: alıcılar kuyruğa alındıktan sonra değişti (${reminder.recipient} -> ${recipient}). Güncel aktif adreslere gönderiliyor.`,
            );
            await this.repository.updateRecipient(reminder.id, recipient);
            reminder.recipient = recipient;
          }

          const template = createAuthorizationExpiryEmailTemplate({
            companyName: reminder.company.name,
            targetDate: reminder.targetDate,
          });

          const result = await this.emailService.send({
            to: recipient,
            cc: [...DEFAULT_CC_RECIPIENTS],
            subject: reminder.subject ?? template.subject,
            text: reminder.message,
            html: template.html,
            attachments: template.attachments,
          });

          // İletişim alanında birden fazla adres olabilir
          // ("a@x.com; b@x.com"); en az biri kabul edildiyse başarılı sayılır.
          if (!result.anyRecipientAccepted) {
            const rejectedRecipients = result.rejected.map((address) =>
              String(address),
            );

            throw new Error(
              [
                "Firma e-posta adresi SMTP sunucusu tarafından kabul edilmedi.",
                `Alıcı: ${recipient}.`,
                rejectedRecipients.length > 0
                  ? `Reddedilenler: ${rejectedRecipients.join(", ")}`
                  : "",
              ]
                .filter(Boolean)
                .join(" "),
            );
          }

          await this.repository.markSent(reminder.id, result.messageId);

          let consultantNotificationCreated = false;
          let consultantNotificationError: string | undefined;

          const consultant = reminder.company.consultantUser;

          if (
            reminder.reminderMonth === 1 &&
            consultant &&
            consultant.isActive
          ) {
            try {
              consultantNotificationCreated =
                await this.repository.createConsultantNotification({
                  authorizationId: reminder.authorizationId,
                  companyId: reminder.companyId,
                  contactId: reminder.contactId ?? undefined,
                  consultantUserId: consultant.id,
                  reminderMonth: reminder.reminderMonth,
                  targetDate: reminder.targetDate,
                  title: "Firma yetki süresinin dolmasına 1 ay kaldı",
                  description: [
                    `${reminder.company.name} firmasının yetki süresinin dolmasına son 1 ay kaldı.`,
                    `Firma alıcısına yetki yenileme e-postası gönderildi: ${recipient}.`,
                  ].join(" "),
                });
            } catch (notificationError) {
              consultantNotificationError =
                notificationError instanceof Error
                  ? notificationError.message
                  : "Danışman bildirimi oluşturulamadı.";
            }
          }

          sentCount += 1;

          results.push({
            id: reminder.id,
            status: "SENT",
            messageId: result.messageId,
            consultantNotificationCreated,
            consultantNotificationError,
          });
        } catch (error) {
          const rawErrorMessage =
            error instanceof Error
              ? error.message
              : "Bilinmeyen e-posta gönderim hatası.";

          const attempt = getPreviousAttempts(reminder.errorMessage) + 1;
          const errorMessage = withAttemptPrefix(attempt, rawErrorMessage);

          // Geçici hata: kayıt kuyrukta kalır, 15 dk sonra tekrar denenir
          if (isTransientEmailError(error) && attempt < MAX_EMAIL_ATTEMPTS) {
            await this.repository.markForRetry(reminder.id, errorMessage);
            console.warn(
              `Authorization reminder ${reminder.id} geçici hata aldı, tekrar denenecek: ${errorMessage}`,
            );
            continue;
          }

          await this.repository.markFailed(reminder.id, errorMessage);

          // Sunucu/bağlantı kaynaklı hatalar danışmana gitmez; sistem sorumlusuna mail atılır
          if (isTransientEmailError(error)) {
            await notifySystemAlert({
              kind: "Yetkilendirme",
              reminderId: reminder.id,
              companyName: reminder.company.name,
              recipient: reminder.recipient,
              errorMessage,
            });
            failedCount += 1;
            results.push({
              id: reminder.id,
              status: "FAILED",
              errorMessage,
              systemAlert: true,
            });
            continue;
          }
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
                  title: "Yetki süresi e-postası gönderilemedi",
                  isFailure: true,
                  description: [
                    `${reminder.company.name} firmasının yetki süresi dolmak üzeredir.`,
                    `Alıcı: ${reminder.recipient}.`,
                    `Hata: ${errorMessage}`,
                  ].join(" "),
                });
            } catch (notificationError) {
              consultantNotificationError =
                notificationError instanceof Error
                  ? notificationError.message
                  : "Danışman bildirimi oluşturulamadı.";
            }
          } else {
            if (!env.adminFallbackEmail) {
              consultantNotificationError =
                "ADMIN_FALLBACK_EMAIL tanımlı değil. Admin bildirimi gönderilemedi.";
            } else {
              const adminEmailReminderId =
                await this.repository.createAdminEmailReminder({
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
                    `Hata: ${errorMessage}`,
                  ].join("\n"),
                });

              if (adminEmailReminderId) {
                try {
                  await this.reminderNotificationService.notifyMissingConsultant(
                    {
                      companyName: reminder.company.name,
                      companyId: reminder.companyId,
                      errorMessage,
                    },
                  );

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
            }
          }

          failedCount += 1;

          results.push({
            id: reminder.id,
            status: "FAILED",
            errorMessage,
            consultantNotificationCreated,
            consultantNotificationError,
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
}