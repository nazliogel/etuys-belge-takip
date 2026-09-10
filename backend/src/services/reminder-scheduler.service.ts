import { env } from "../config/env.js";
import { CompanyAuthorizationReminderQueueService } from "./company-authorization-reminder-queue.service.js";
import { CompanyAuthorizationReminderWorkerService } from "./company-authorization-reminder-worker.service.js";
import { DocumentReminderQueueService } from "./document-reminder-queue.service.js";
import { DocumentReminderWorkerService } from "./document-reminder-worker.service.js";

type WorkerPriority = "DOCUMENT" | "AUTHORIZATION";

export class ReminderSchedulerService {
  private queueTimer?: NodeJS.Timeout;
  private workerTimer?: NodeJS.Timeout;

  private queueCycleRunning = false;
  private workerCycleRunning = false;
  private nextWorkerPriority: WorkerPriority = "DOCUMENT";

  constructor(
    private readonly documentQueueService =
      new DocumentReminderQueueService(),
    private readonly authorizationQueueService =
      new CompanyAuthorizationReminderQueueService(),
    private readonly documentWorkerService =
      new DocumentReminderWorkerService(),
    private readonly authorizationWorkerService =
      new CompanyAuthorizationReminderWorkerService(),
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

    const workerIntervalMilliseconds =
      env.reminderWorkerIntervalSeconds * 1000;

    void this.runQueueCycle();

    this.queueTimer = setInterval(() => {
      void this.runQueueCycle();
    }, queueIntervalMilliseconds);

    if (env.emailSendingEnabled) {
      void this.runWorkerCycle();

      this.workerTimer = setInterval(() => {
        void this.runWorkerCycle();
      }, workerIntervalMilliseconds);
    } else {
      console.log(
        "Reminder queues will be created, but email workers are disabled.",
      );
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
      const [documentResult, authorizationResult] = await Promise.all([
        this.documentQueueService.enqueueDueReminders(),
        this.authorizationQueueService.enqueueDueReminders(),
      ]);

      console.log("Reminder queue cycle completed.", {
        documentQueuedCount: documentResult.queuedCount,
        documentDuplicateCount: documentResult.duplicateCount,
        authorizationQueuedCount: authorizationResult.queuedCount,
        authorizationDuplicateCount:
          authorizationResult.duplicateCount,
      });
    } catch (error) {
      console.error("Reminder queue cycle failed.", error);
    } finally {
      this.queueCycleRunning = false;
    }
  }

  private async runWorkerCycle() {
    if (this.workerCycleRunning || !env.emailSendingEnabled) {
      return;
    }

    this.workerCycleRunning = true;

    try {
      /*
       * İki kuyruktan birinin diğerini sürekli bekletmemesi için
       * her çalışmada öncelik değiştirilir.
       */
      if (this.nextWorkerPriority === "DOCUMENT") {
        await this.documentWorkerService.processPendingReminders(1);
        await this.authorizationWorkerService.processPendingReminders(
          1,
        );

        this.nextWorkerPriority = "AUTHORIZATION";
      } else {
        await this.authorizationWorkerService.processPendingReminders(
          1,
        );
        await this.documentWorkerService.processPendingReminders(1);

        this.nextWorkerPriority = "DOCUMENT";
      }
    } catch (error) {
      console.error("Reminder worker cycle failed.", error);
    } finally {
      this.workerCycleRunning = false;
    }
  }
}

export const reminderSchedulerService =
  new ReminderSchedulerService();