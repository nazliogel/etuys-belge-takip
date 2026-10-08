import { env } from "../config/env.js";
import { CompanyAuthorizationReminderQueueService } from "./company-authorization-reminder-queue.service.js";
import { CompanyAuthorizationReminderWorkerService } from "./company-authorization-reminder-worker.service.js";
import { DocumentReminderQueueService } from "./document-reminder-queue.service.js";
import { DocumentReminderWorkerService } from "./document-reminder-worker.service.js";
import { DocumentReminderWhatsAppQueueService } from "./document-reminder-whatsapp-queue.service.js";
import { DocumentReminderWhatsAppWorkerService } from "./document-reminder-whatsapp-worker.service.js";
import { DailyEmailReportService } from "./daily-email-report.service.js";
import { CompanyAuthorizationReminderWhatsAppQueueService } from "./company-authorization-reminder-whatsapp-queue.service.js";
import { CompanyAuthorizationReminderWhatsAppWorkerService } from "./company-authorization-reminder-whatsapp-worker.service.js";

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
  private nextWhatsAppWorkerPriority: WorkerPriority = "DOCUMENT";
  private outsideWindowLogged = false;
  private readonly dailyEmailReportService = new DailyEmailReportService();

  constructor(
    private readonly documentQueueService = new DocumentReminderQueueService(),
    private readonly documentWhatsAppWorkerService = new DocumentReminderWhatsAppWorkerService(),
    private readonly documentWhatsAppQueueService = new DocumentReminderWhatsAppQueueService(),
    private readonly authorizationQueueService = new CompanyAuthorizationReminderQueueService(),
    private readonly documentWorkerService = new DocumentReminderWorkerService(),
    private readonly authorizationWorkerService = new CompanyAuthorizationReminderWorkerService(),
    private readonly authorizationWhatsAppQueueService = new CompanyAuthorizationReminderWhatsAppQueueService(),
    private readonly authorizationWhatsAppWorkerService = new CompanyAuthorizationReminderWhatsAppWorkerService(),
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
      // allSettled: bir kuyruk hata verse bile diğerleri tamamlanır ve
      // sonuçları ayrı ayrı loglanır. Mail ve WhatsApp birbirini etkilemez.
      const [
        documentSettled,
        authorizationSettled,
        whatsAppSettled,
        authorizationWhatsAppSettled,
      ] = await Promise.allSettled([
        this.documentQueueService.enqueueDueReminders(),
        this.authorizationQueueService.enqueueDueReminders(),
        env.whatsappQueueEnabled
          ? this.documentWhatsAppQueueService.enqueueDueReminders()
          : Promise.resolve(null),
        env.whatsappQueueEnabled
          ? this.authorizationWhatsAppQueueService.enqueueDueReminders()
          : Promise.resolve(null),
      ]);

      const failedQueues: string[] = [];

      const valueOf = <T>(
        label: string,
        settled: PromiseSettledResult<T>,
      ): T | null => {
        if (settled.status === "fulfilled") {
          return settled.value;
        }

        failedQueues.push(label);
        console.error(`Reminder queue failed: ${label}`, settled.reason);
        return null;
      };

      const documentResult = valueOf("Belge e-posta kuyruğu", documentSettled);
      const authorizationResult = valueOf(
        "Yetkilendirme e-posta kuyruğu",
        authorizationSettled,
      );
      const whatsAppResult = valueOf("Belge WhatsApp kuyruğu", whatsAppSettled);
      const authorizationWhatsAppResult = valueOf(
        "Yetkilendirme WhatsApp kuyruğu",
        authorizationWhatsAppSettled,
      );

      console.log("Reminder queue cycle completed.", {
        documentQueuedCount: documentResult?.queuedCount ?? 0,
        documentDuplicateCount: documentResult?.duplicateCount ?? 0,
        authorizationQueuedCount: authorizationResult?.queuedCount ?? 0,
        authorizationDuplicateCount: authorizationResult?.duplicateCount ?? 0,
        whatsAppQueuedCount: whatsAppResult?.queuedCount ?? 0,
        whatsAppDuplicateCount: whatsAppResult?.duplicateCount ?? 0,
        whatsAppBlockedCount: whatsAppResult?.blockedCount ?? 0,
        authorizationWhatsAppQueuedCount:
          authorizationWhatsAppResult?.queuedCount ?? 0,
        authorizationWhatsAppDuplicateCount:
          authorizationWhatsAppResult?.duplicateCount ?? 0,
        authorizationWhatsAppBlockedCount:
          authorizationWhatsAppResult?.blockedCount ?? 0,
        failedQueues,
      });
    } catch (error) {
      console.error("Reminder queue cycle failed.", error);
    } finally {
      this.queueCycleRunning = false;
    }
  }

  /**
   * Tek bir worker adımını çalıştırır. Hata verirse loglanır ama
   * sonraki adımlar (diğer kanal veya diğer hatırlatma türü) yine çalışır.
   */
  private async runWorkerStep(label: string, step: () => Promise<unknown>) {
    try {
      await step();
    } catch (error) {
      console.error(`Reminder worker step failed: ${label}`, error);
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
      // E-posta: her adım ayrı korunur, hata WhatsApp'ı durdurmaz.
      if (env.emailSendingEnabled) {
        void this.dailyEmailReportService.runIfDue().catch((error) => {
          console.error("Daily email report failed.", error);
        });

        const priority = this.nextWorkerPriority;

        this.nextWorkerPriority =
          priority === "DOCUMENT" ? "AUTHORIZATION" : "DOCUMENT";

        const documentStep = () =>
          this.runWorkerStep("Belge e-posta gönderimi", () =>
            this.documentWorkerService.processPendingReminders(1),
          );
        const authorizationStep = () =>
          this.runWorkerStep("Yetkilendirme e-posta gönderimi", () =>
            this.authorizationWorkerService.processPendingReminders(1),
          );

        if (priority === "DOCUMENT") {
          await documentStep();
          await authorizationStep();
        } else {
          await authorizationStep();
          await documentStep();
        }
      }

      // WhatsApp: e-posta adımlarından bağımsız çalışır.
      if (env.whatsappSendingEnabled) {
        const priority = this.nextWhatsAppWorkerPriority;

        this.nextWhatsAppWorkerPriority =
          priority === "DOCUMENT" ? "AUTHORIZATION" : "DOCUMENT";

        const documentStep = () =>
          this.runWorkerStep("Belge WhatsApp gönderimi", () =>
            this.documentWhatsAppWorkerService.processPendingReminders(1),
          );
        const authorizationStep = () =>
          this.runWorkerStep("Yetkilendirme WhatsApp gönderimi", () =>
            this.authorizationWhatsAppWorkerService.processPendingReminders(1),
          );

        if (priority === "DOCUMENT") {
          await documentStep();
          await authorizationStep();
        } else {
          await authorizationStep();
          await documentStep();
        }
      }
    } finally {
      this.workerCycleRunning = false;
    }
  }
}

export const reminderSchedulerService = new ReminderSchedulerService();
