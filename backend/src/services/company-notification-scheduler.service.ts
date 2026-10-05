import { CompanyNotificationGeneratorService } from "./company-notification-generator.service.js";

export class CompanyNotificationSchedulerService {
  private timer?: NodeJS.Timeout;
  private runningCycle?: Promise<void>;
  private stopping = false;

  constructor(
    private readonly generator = new CompanyNotificationGeneratorService(),
  ) {}

  start() {
    if (this.timer) return;

    this.stopping = false;

    void this.runCycle();

    this.timer = setInterval(
      () => {
        void this.runCycle();
      },
      24 * 60 * 60 * 1000,
    );

    console.log("Firma bildirim scheduler'ı başlatıldı.");
  }

  async stop() {
    this.stopping = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    // Veritabanı kapanmadan devam eden işlemin bitmesini bekle.
    await this.runningCycle;
  }

  private async runCycle(): Promise<void> {
    if (this.stopping || this.runningCycle) return;

    const cycle = this.generate();
    this.runningCycle = cycle;

    try {
      await cycle;
    } finally {
      this.runningCycle = undefined;
    }
  }

  private async generate(): Promise<void> {
    try {
      const result = await this.generator.generateDueNotifications();

      console.log("Firma bildirim kontrolü tamamlandı.", result);
    } catch (error) {
      console.error("Firma bildirim kontrolü başarısız.", error);
    }
  }
}

export const companyNotificationSchedulerService =
  new CompanyNotificationSchedulerService();
