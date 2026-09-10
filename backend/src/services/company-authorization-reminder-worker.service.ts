import { env } from "../config/env.js";
import { CompanyAuthorizationReminderRepository } from "../repositories/company-authorization-reminder.repository.js";
import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import { createAuthorizationExpiryEmailTemplate } from "./closure-email-template.service.js";
import { DEFAULT_CC_RECIPIENTS } from "./document-reminder-preview.service.js";
import { EmailService } from "./email.service.js";
import { ReminderNotificationService } from "./reminder-notification.service.js";

const TURKEY_UTC_OFFSET_HOURS = 3;

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
      const results = [];

      for (const reminder of reminders) {
        try {
          const validationErrors: string[] = [];

          if (!reminder.contact) {
            validationErrors.push("Firma iletişim kaydı bulunamadı.");
          } else if (!reminder.recipient.trim()) {
            validationErrors.push("Firmanın iletişim e-posta adresi boştur.");
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

          const template = createAuthorizationExpiryEmailTemplate({
            companyName: reminder.company.name,
            targetDate: reminder.targetDate,
          });

          const result = await this.emailService.send({
            to: reminder.recipient,
            cc: [...DEFAULT_CC_RECIPIENTS],
            subject: reminder.subject ?? template.subject,
            text: reminder.message,
            html: template.html,
            attachments: template.attachments,
          });

          const normalizedRecipient = reminder.recipient.trim().toLowerCase();

          const primaryRecipientAccepted = result.accepted.some(
            (address) =>
              String(address).trim().toLowerCase() === normalizedRecipient,
          );

          if (!primaryRecipientAccepted) {
            const rejectedRecipients = result.rejected.map((address) =>
              String(address),
            );

            throw new Error(
              [
                "Firma e-posta adresi SMTP sunucusu tarafından kabul edilmedi.",
                `Alıcı: ${reminder.recipient}.`,
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
            consultant.isActive &&
            consultant.role === "OPERATION"
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
                    `Firma alıcısına yetki yenileme e-postası gönderildi: ${reminder.recipient}.`,
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
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Bilinmeyen e-posta gönderim hatası.";

          await this.repository.markFailed(reminder.id, errorMessage);

          let consultantNotificationCreated = false;
          let consultantNotificationError: string | undefined;

          const consultant = reminder.company.consultantUser;

          if (
            consultant &&
            consultant.isActive &&
            consultant.role === "OPERATION"
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
                  title: "Yetki süresi e-postası gönderilemedi",
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
            const adminEmailReminderId =
              await this.repository.createAdminEmailReminder({
                authorizationId: reminder.authorizationId,
                companyId: reminder.companyId,
                contactId: reminder.contactId ?? undefined,
                reminderMonth: reminder.reminderMonth,
                targetDate: reminder.targetDate,
                recipient: "salihsahin@akkasgroup.com",
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
                await this.reminderNotificationService.notifyMissingConsultant({
                  companyName: reminder.company.name,
                  companyId: reminder.companyId,
                  errorMessage,
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
        results,
      };
    } finally {
      this.isProcessing = false;
    }
  }
}
