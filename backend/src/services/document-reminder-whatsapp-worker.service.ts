import { env } from "../config/env.js";
import { CompanyRequestRepository } from "../repositories/company-request.repository.js";
import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import {
  normalizeDate,
  resolveReminderDecision,
} from "./document-reminder.service.js";
import { normalizeWhatsAppRecipient } from "./document-reminder-whatsapp-preview.service.js";
import {
  createClosureWhatsAppTemplate,
  createExtensionWhatsAppTemplate,
} from "./whatsapp-template.service.js";
import { WhatsAppService } from "./whatsapp.service.js";

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

function isSameDate(first: Date, second: Date): boolean {
  return normalizeDate(first).getTime() === normalizeDate(second).getTime();
}

export class DocumentReminderWhatsAppWorkerService {
  private isProcessing = false;

  constructor(
    private readonly repository = new DocumentReminderRepository(),
    private readonly companyRequestRepository = new CompanyRequestRepository(),
    private readonly whatsAppService = new WhatsAppService(),
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
      !env.whatsappAccessToken ||
      !env.whatsappPhoneNumberId ||
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
      const hourStart = getHourStart(now);
      const dayStart = getTurkeyDayStart(now);

      const [sentLastHour, sentToday, latestAttempt] = await Promise.all([
        this.repository.countWhatsAppSentSince(hourStart),
        this.repository.countWhatsAppSentSince(dayStart),
        this.repository.findLatestAttemptedWhatsApp(),
      ]);

      if (sentLastHour >= env.whatsappMaxMessagesPerHour) {
        return {
          processed: false,
          reason: "WHATSAPP_HOURLY_LIMIT_REACHED",
          foundCount: 0,
          sentCount: 0,
          failedCount: 0,
          skippedCount: 0,
          results: [],
        };
      }

      if (sentToday >= env.whatsappMaxMessagesPerDay) {
        return {
          processed: false,
          reason: "WHATSAPP_DAILY_LIMIT_REACHED",
          foundCount: 0,
          sentCount: 0,
          failedCount: 0,
          skippedCount: 0,
          results: [],
        };
      }

      if (latestAttempt?.attemptedAt) {
        const nextAllowedAt =
          latestAttempt.attemptedAt.getTime() + env.whatsappDelaySeconds * 1000;

        const remainingMilliseconds = nextAllowedAt - now.getTime();

        if (remainingMilliseconds > 0) {
          return {
            processed: false,
            reason: "WHATSAPP_DELAY_ACTIVE",
            retryAfterSeconds: Math.ceil(remainingMilliseconds / 1000),
            foundCount: 0,
            sentCount: 0,
            failedCount: 0,
            skippedCount: 0,
            results: [],
          };
        }
      }

      const reminders = await this.repository.findPendingWhatsApp(
        Math.min(limit, 1),
      );

      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      const results = [];

      for (const reminder of reminders) {
        try {
          const document = reminder.document;
          const contact = reminder.contact;

          if (
            !document.isActive ||
            document.status !== "OPEN" ||
            !document.documentEndDate ||
            !document.extensionDate
          ) {
            const reason = "Belge artık aktif ve açık durumda değil.";

            await this.repository.markSkipped(reminder.id, reason);
            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason,
            });
            continue;
          }

          const authorizationEndDate =
            reminder.company.authorization?.authorizationEndDate ?? null;

          if (
            !authorizationEndDate ||
            normalizeDate(authorizationEndDate) < normalizeDate(now)
          ) {
            const reason = "Firmanın geçerli yetkilendirmesi bulunmuyor.";

            await this.repository.markSkipped(reminder.id, reason);
            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason,
            });
            continue;
          }

          if (!contact?.phone.trim()) {
            const reason = "Firma iletişim telefon numarası bulunamadı.";

            await this.repository.markSkipped(reminder.id, reason);
            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason,
            });
            continue;
          }

          const currentRecipient = normalizeWhatsAppRecipient(contact.phone);

          if (
            !/^[1-9]\d{9,14}$/.test(currentRecipient) ||
            currentRecipient !== reminder.recipient
          ) {
            const reason =
              "Firma telefon numarası geçersiz veya kuyruk oluşturulduktan sonra değişmiş.";

            await this.repository.markSkipped(reminder.id, reason);
            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason,
            });
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
            const reason = "Hatırlatma koşulları artık geçerli değil.";

            await this.repository.markSkipped(reminder.id, reason);
            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason,
            });
            continue;
          }

          const closureRequest =
            await this.companyRequestRepository.findLatestClosureRequest({
              companyId: reminder.companyId,
              externalDocumentId: document.externalDocumentId,
            });

          if (reminder.type === "EXTENSION_APPLICATION" && closureRequest) {
            const reason = "Firma için kapatma başvurusu bulundu.";

            await this.repository.markSkipped(reminder.id, reason);
            skippedCount += 1;
            results.push({
              id: reminder.id,
              status: "SKIPPED",
              reason,
            });
            continue;
          }

          if (reminder.type === "CLOSURE_APPLICATION" && closureRequest) {
            const requestStatus = closureRequest.requestStatus
              ?.trim()
              .toLocaleUpperCase("tr-TR");

            if (requestStatus !== "REDDEDİLDİ") {
              const reason =
                "Firma için reddedilmemiş bir kapatma başvurusu bulundu.";

              await this.repository.markSkipped(reminder.id, reason);
              skippedCount += 1;
              results.push({
                id: reminder.id,
                status: "SKIPPED",
                reason,
              });
              continue;
            }
          }

          const template =
            reminder.type === "CLOSURE_APPLICATION"
              ? createClosureWhatsAppTemplate({
                  companyName: reminder.company.name,
                  documentNumber: document.documentNumber,
                  targetDate: reminder.targetDate,
                })
              : createExtensionWhatsAppTemplate({
                  companyName: reminder.company.name,
                  documentNumber: document.documentNumber,
                  targetDate: reminder.targetDate,
                });

          const sendResult = await this.whatsAppService.sendTemplate({
            to: reminder.recipient,
            templateName: template.templateName,
            languageCode: template.languageCode,
            parameters: template.parameters,
          });

          await this.repository.markSent(reminder.id, sendResult.messageId);

          sentCount += 1;
          results.push({
            id: reminder.id,
            status: "SENT",
            messageId: sendResult.messageId,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Bilinmeyen WhatsApp gönderim hatası.";

          await this.repository.markFailed(reminder.id, errorMessage);

          failedCount += 1;
          results.push({
            id: reminder.id,
            status: "FAILED",
            errorMessage,
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
