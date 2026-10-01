import { env } from "../config/env.js";
import { CompanyAuthorizationReminderQueueService } from "./company-authorization-reminder-queue.service.js";
import { CompanyAuthorizationReminderWorkerService } from "./company-authorization-reminder-worker.service.js";
import { DocumentReminderQueueService } from "./document-reminder-queue.service.js";
import { DocumentReminderWorkerService } from "./document-reminder-worker.service.js";
import { DocumentReminderWhatsAppQueueService } from "./document-reminder-whatsapp-queue.service.js";
import { DocumentReminderWhatsAppWorkerService } from "./document-reminder-whatsapp-worker.service.js";

type WorkerPriority = "DOCUMENT" | "AUTHORIZATION";

/** Otomatik gönderim yalnızca hafta içi bu saatler arasında yapılır (Europe/Istanbul) */
const SEND_WINDOW_START_HOUR = 8; // dahil
const SEND_WINDOW_END_HOUR = 18; // hariç (17:59'a kadar gönderilir)

export function isWithinSendingWindow(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);

  const isWeekday = weekday !== "Sat" && weekday !== "Sun";

  return (
    isWeekday && hour >= SEND_WINDOW_START_HOUR && hour < SEND_WINDOW_END_HOUR
  );
}

export class ReminderSchedulerService {
  private queueTimer?: NodeJS.Timeout;
  private workerTimer?: NodeJS.Timeout;

  private queueCycleRunning = false;
  private workerCycleRunning = false;
  private nextWorkerPriority: WorkerPriority = "DOCUMENT";
  private outsideWindowLogged = false;

  constructor(
    private readonly documentQueueService = new DocumentReminderQueueService(),
    private readonly documentWhatsAppWorkerService = new DocumentReminderWhatsAppWorkerService(),
    private readonly documentWhatsAppQueueService = new DocumentReminderWhatsAppQueueService(),
    private readonly authorizationQueueService = new CompanyAuthorizationReminderQueueService(),
    private readonly documentWorkerService = new DocumentReminderWorkerService(),
    private readonly authorizationWorkerService = new CompanyAuthorizationReminderWorkerService(),
  ) {}

  start() {
    if (!env.reminderSchedulerEnabled) {
      console.log(
        "Reminder scheduler is disabled: REMINDER_SCHEDULER_ENABLED=false",
      );
      return;
    }

    const queueIntervalMilliseconds =
      env.reminderQueueIntervalMinutes * 60 * 1000;

    const workerIntervalMilliseconds = env.reminderWorkerIntervalSeconds * 1000;

    void this.runQueueCycle();

    this.queueTimer = setInterval(() => {
      void this.runQueueCycle();
    }, queueIntervalMilliseconds);

    if (env.emailSendingEnabled || env.whatsappSendingEnabled) {
      void this.runWorkerCycle();

      this.workerTimer = setInterval(() => {
        void this.runWorkerCycle();
      }, workerIntervalMilliseconds);
    } else {
      console.log("Reminder queues will be created, but workers are disabled.");
    }

    console.log("Reminder scheduler started.");
  }

  stop() {
    if (this.queueTimer) {
      clearInterval(this.queueTimer);
      this.queueTimer = undefined;
    }

    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = undefined;
    }
  }

  private async runQueueCycle() {
    if (this.queueCycleRunning) {
      return;
    }

    this.queueCycleRunning = true;

    try {
      const whatsAppQueuePromise = env.whatsappQueueEnabled
        ? this.documentWhatsAppQueueService.enqueueDueReminders()
        : Promise.resolve(null);

      const [documentResult, authorizationResult, whatsAppResult] =
        await Promise.all([
          this.documentQueueService.enqueueDueReminders(),
          this.authorizationQueueService.enqueueDueReminders(),
          whatsAppQueuePromise,
        ]);

      console.log("Reminder queue cycle completed.", {
        documentQueuedCount: documentResult.queuedCount,
        documentDuplicateCount: documentResult.duplicateCount,
        authorizationQueuedCount: authorizationResult.queuedCount,
        authorizationDuplicateCount: authorizationResult.duplicateCount,
        whatsAppQueuedCount: whatsAppResult?.queuedCount ?? 0,
        whatsAppDuplicateCount: whatsAppResult?.duplicateCount ?? 0,
        whatsAppBlockedCount: whatsAppResult?.blockedCount ?? 0,
      });
    } catch (error) {
      console.error("Reminder queue cycle failed.", error);
    } finally {
      this.queueCycleRunning = false;
    }
  }

  private async runWorkerCycle() {
    if (
      this.workerCycleRunning ||
      (!env.emailSendingEnabled && !env.whatsappSendingEnabled)
    ) {
      return;
    }
    if (!isWithinSendingWindow()) {
      if (!this.outsideWindowLogged) {
        console.log(
          "Reminder workers paused: outside sending window (weekdays 08:00-18:00 Europe/Istanbul).",
        );
        this.outsideWindowLogged = true;
      }
      return;
    }

    if (this.outsideWindowLogged) {
      console.log("Reminder workers resumed: within sending window.");
      this.outsideWindowLogged = false;
    }
    this.workerCycleRunning = true;

    try {
      if (env.emailSendingEnabled) {
        if (this.nextWorkerPriority === "DOCUMENT") {
          await this.documentWorkerService.processPendingReminders(1);
          await this.authorizationWorkerService.processPendingReminders(1);

          this.nextWorkerPriority = "AUTHORIZATION";
        } else {
          await this.authorizationWorkerService.processPendingReminders(1);
          await this.documentWorkerService.processPendingReminders(1);

          this.nextWorkerPriority = "DOCUMENT";
        }
      }

      if (env.whatsappSendingEnabled) {
        await this.documentWhatsAppWorkerService.processPendingReminders(1);
      }
    } catch (error) {
      console.error("Reminder worker cycle failed.", error);
    } finally {
      this.workerCycleRunning = false;
    }
  }
}

export const reminderSchedulerService = new ReminderSchedulerService();
