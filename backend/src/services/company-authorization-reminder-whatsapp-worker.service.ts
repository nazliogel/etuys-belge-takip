import { env } from "../config/env.js";
import { CompanyAuthorizationReminderRepository } from "../repositories/company-authorization-reminder.repository.js";
import {
  hasOpenIncentiveDocument,
  resolveAuthorizationReminderDecision,
  NO_OPEN_DOCUMENT_SKIP_REASON,
  AUTHORIZATION_CHANGED_SKIP_REASON,
} from "./company-authorization-reminder.service.js";
import { normalizeDate } from "./document-reminder.service.js";
import { normalizeWhatsAppRecipient } from "./document-reminder-whatsapp-preview.service.js";
import { createAuthorizationWhatsAppTemplate } from "./whatsapp-template.service.js";
import { WhatsAppService } from "./whatsapp.service.js";
import { WhatsAppRateLimitService } from "./whatsapp-rate-limit.service.js";

function getTurkeyDay(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const getPart = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(getPart("year"), getPart("month") - 1, getPart("day")),
  );
}

export class CompanyAuthorizationReminderWhatsAppWorkerService {
  private isProcessing = false;

  constructor(
    private readonly repository = new CompanyAuthorizationReminderRepository(),

    private readonly whatsAppService = new WhatsAppService(),
    private readonly rateLimitService = new WhatsAppRateLimitService(),
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

      const results: Array<{
        id: number;
        status: "SENT" | "FAILED" | "SKIPPED";
        messageId?: string;
        reason?: string;
        errorMessage?: string;
      }> = [];

      for (const reminder of reminders) {
        try {
          let skipReason: string | undefined;

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
              normalizeDate(currentEndDate).getTime() >= today.getTime() ||
              !currentDecision ||
              currentDecision.reminderMonth !== reminder.reminderMonth ||
              normalizeDate(currentDecision.targetDate).getTime() !==
                normalizeDate(reminder.targetDate).getTime())
          ) {
            skipReason = AUTHORIZATION_CHANGED_SKIP_REASON;
          }

          const currentRecipient = reminder.contact
            ? normalizeWhatsAppRecipient(reminder.contact.phone)
            : "";

          if (
            !skipReason &&
            (!reminder.contact?.phone.trim() ||
              reminder.contact.companyId !== reminder.companyId ||
              !/^[1-9]\d{9,14}$/.test(currentRecipient) ||
              currentRecipient !== reminder.recipient)
          ) {
            skipReason =
              "Firma iletişim telefonu eksik, geçersiz veya kuyruk oluşturulduktan sonra değişmiş.";
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

          const template = createAuthorizationWhatsAppTemplate({
            companyName: reminder.company.name,
            targetDate: reminder.targetDate,
            today: now,
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
