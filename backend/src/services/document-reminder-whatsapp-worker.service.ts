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
import { WhatsAppRateLimitService } from "./whatsapp-rate-limit.service.js";

function isSameDate(first: Date, second: Date): boolean {
  return normalizeDate(first).getTime() === normalizeDate(second).getTime();
}

export class DocumentReminderWhatsAppWorkerService {
  private isProcessing = false;

  constructor(
    private readonly repository = new DocumentReminderRepository(),
    private readonly companyRequestRepository = new CompanyRequestRepository(),
    private readonly whatsAppService = new WhatsAppService(),
    private readonly rateLimitService = new WhatsAppRateLimitService(),
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

          // Yetki süresi dolmuş olsa da belge hatırlatması gönderilir.
          // Yetkilendirme bildirimi ayrı worker tarafından gönderilir.
          const authorizationEndDate =
            reminder.company.authorization?.authorizationEndDate ?? null;

          const authorizationExpired =
            !authorizationEndDate ||
            normalizeDate(authorizationEndDate) < normalizeDate(now);

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
                  authorizationExpired,
                })
              : createExtensionWhatsAppTemplate({
                  companyName: reminder.company.name,
                  documentNumber: document.documentNumber,
                  targetDate: reminder.targetDate,
                  authorizationExpired,
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
