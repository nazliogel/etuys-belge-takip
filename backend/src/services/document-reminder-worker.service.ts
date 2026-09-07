import { env } from "../config/env.js";
import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";
import {
  createClosureEmailTemplate,
  createExtensionEmailTemplate,
} from "./closure-email-template.service.js";
import { DEFAULT_CC_RECIPIENTS } from "./document-reminder-preview.service.js";
import { EmailService } from "./email.service.js";

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
    private readonly emailService = new EmailService(),
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

      const [sentLastHour, sentToday, latestAttempt] = await Promise.all([
        this.repository.countSentSince(hourStart),
        this.repository.countSentSince(dayStart),
        this.repository.findLatestAttemptedEmail(),
      ]);

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

      const results = [];

      for (const reminder of reminders) {
        try {
          const template =
            reminder.type === "CLOSURE_APPLICATION"
              ? createClosureEmailTemplate({
                  companyName: reminder.company.name,
                  documentNumber:
                    reminder.document.documentNumber ??
                    "Belge numarası bulunamadı",
                  targetDate: reminder.targetDate,
                  investorAddress: reminder.company.identity?.investorAddress,
                })
              : createExtensionEmailTemplate({
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

          await this.repository.markSent(reminder.id, result.messageId);

          sentCount += 1;

          results.push({
            id: reminder.id,
            status: "SENT",
            messageId: result.messageId,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Bilinmeyen e-posta gönderim hatası.";

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
        results,
      };
    } finally {
      this.isProcessing = false;
    }
  }
}
