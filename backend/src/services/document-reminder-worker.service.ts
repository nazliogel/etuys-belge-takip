import { env } from "../config/env.js";
import { CompanyRequestRepository } from "../repositories/company-request.repository.js";
import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import { ReminderNotificationService } from "./reminder-notification.service.js";
import {
  createClosureEmailTemplate,
  createExtensionEmailTemplate,
} from "./closure-email-template.service.js";
import { DEFAULT_CC_RECIPIENTS } from "./document-reminder-preview.service.js";
import { EmailService } from "./email.service.js";
import {
  normalizeDate,
  resolveReminderDecision,
} from "./document-reminder.service.js";
import {
  MAX_EMAIL_ATTEMPTS,
  getPreviousAttempts,
  isTransientEmailError,
  withAttemptPrefix,
} from "../utils/email-retry.js";
import { notifySystemAlert } from "./system-alert.service.js";
import { CompanyAuthorizationReminderRepository } from "../repositories/company-authorization-reminder.repository.js";

function isSameDate(first: Date, second: Date): boolean {
  return normalizeDate(first).getTime() === normalizeDate(second).getTime();
}
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

export class DocumentReminderWorkerService {
  private isProcessing = false;
  constructor(
    private readonly repository = new DocumentReminderRepository(),
    private readonly companyRequestRepository = new CompanyRequestRepository(),
    private readonly emailService = new EmailService(),
    private readonly reminderNotificationService = new ReminderNotificationService(),
    private readonly authorizationRepository = new CompanyAuthorizationReminderRepository(),
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
        documentHourCount,
        authorizationHourCount,
        documentDayCount,
        authorizationDayCount,
        documentAttempt,
        authorizationAttempt,
      ] = await Promise.all([
        this.repository.countSentSince(hourStart),
        this.authorizationRepository.countSentSince(hourStart),
        this.repository.countSentSince(dayStart),
        this.authorizationRepository.countSentSince(dayStart),
        this.repository.findLatestAttemptedEmail(),
        this.authorizationRepository.findLatestAttemptedEmail(),
      ]);

      const sentLastHour = documentHourCount + authorizationHourCount;
      const sentToday = documentDayCount + authorizationDayCount;

      const latestAttempt =
        (documentAttempt?.attemptedAt?.getTime() ?? 0) >=
        (authorizationAttempt?.attemptedAt?.getTime() ?? 0)
          ? documentAttempt
          : authorizationAttempt;

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

      if (latestAttempt?.attemptedAt) {
        const nextAllowedAt =
          latestAttempt.attemptedAt.getTime() + env.emailDelaySeconds * 1000;

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

      const results: Record<string, unknown>[] = [];

      for (const reminder of reminders) {
        try {
          // YENİ: Kuyruğa alındıktan sonra koşullar değişmiş olabilir.
          // Göndermeden önce WhatsApp worker'ındaki kontrollerin aynısı yapılır.
          const skip = async (reason: string) => {
            await this.repository.markSkipped(reminder.id, reason);
            skippedCount += 1;
            results.push({ id: reminder.id, status: "SKIPPED", reason });
          };

          const document = reminder.document;

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

          const validationErrors: string[] = [];

          if (!reminder.contact) {
            validationErrors.push("Firma iletişim kaydı bulunamadı.");
          } else if (!reminder.recipient.trim()) {
            validationErrors.push("Firma iletişim e-posta adresi boş.");
          }

          if (
            reminder.type === "CLOSURE_APPLICATION" &&
            !reminder.document.documentNumber?.trim()
          ) {
            validationErrors.push("Belge numarası bulunamadı.");
          }

          if (
            reminder.type === "CLOSURE_APPLICATION" &&
            !reminder.company.identity?.investorAddress?.trim()
          ) {
            validationErrors.push("Firma adresi bulunamadı.");
          }

          if (validationErrors.length > 0) {
            throw new Error(
              `Gönderim öncesi bilgi kontrolü başarısız: ${validationErrors.join(
                ", ",
              )}`,
            );
          }
          // Yetki durumu gönderim anında hesaplanır (findDueCandidates ile aynı mantık).
          const authorizationEndDate =
            reminder.company.authorization?.authorizationEndDate ?? null;

          const authorizationExpired =
            authorizationEndDate === null ||
            normalizeDate(authorizationEndDate) < normalizeDate(now);
          const template =
            reminder.type === "CLOSURE_APPLICATION"
              ? createClosureEmailTemplate({
                  companyName: reminder.company.name,
                  documentNumber:
                    reminder.document.documentNumber ??
                    "Belge numarası bulunamadı",
                  targetDate: reminder.targetDate,
                  investorAddress: reminder.company.identity?.investorAddress,
                  authorizationExpired, // YENİ
                })
              : createExtensionEmailTemplate({
                  companyName: reminder.company.name,
                  targetDate: reminder.targetDate,
                  authorizationExpired, // YENİ
                });

          const result = await this.emailService.send({
            to: reminder.recipient,
            cc: [...DEFAULT_CC_RECIPIENTS],
            subject: reminder.subject ?? template.subject,
            text: template.text,
            html: template.html,
            attachments: template.attachments,
          });

          // YENİ: İletişim alanında birden fazla adres olabilir
          // ("a@x.com; b@x.com"); en az biri kabul edildiyse başarılı sayılır.
          if (!result.anyRecipientAccepted) {
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
            consultant.isActive
          ) {
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
                  title:
                    reminder.type === "CLOSURE_APPLICATION"
                      ? "Kapatma başvurusu için 1 ay kaldı"
                      : "Süre uzatma başvurusu için 1 ay kaldı",
                  description: [
                    `${reminder.company.name} firmasına ait belge için son 1 aylık bildirim gönderildi.`,
                    `Firma alıcısı: ${reminder.recipient}.`,
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

          if (isTransientEmailError(error) && attempt < MAX_EMAIL_ATTEMPTS) {
            await this.repository.markForRetry(reminder.id, errorMessage);
            console.warn(
              `Reminder ${reminder.id} geçici hata aldı, tekrar denenecek: ${errorMessage}`,
            );
            continue;
          }

          await this.repository.markFailed(reminder.id, errorMessage);

          // Sunucu/bağlantı kaynaklı hatalar danışmana gitmez; sistem sorumlusuna mail atılır
          if (isTransientEmailError(error)) {
            await notifySystemAlert({
              kind:
                reminder.type === "CLOSURE_APPLICATION"
                  ? "Kapatma"
                  : "Süre uzatma",
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
                  documentId: reminder.documentId,
                  companyId: reminder.companyId,
                  contactId: reminder.contactId ?? undefined,
                  consultantUserId: consultant.id,
                  type: reminder.type,
                  reminderMonth: reminder.reminderMonth,
                  targetDate: reminder.targetDate,
                  title: "Firma e-postası gönderilemedi",
                  isFailure: true,
                  description: [
                    `${reminder.company.name} firmasına ait belge bildirimi gönderilemedi.`,
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
