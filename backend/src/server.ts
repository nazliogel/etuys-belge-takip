import app from "./app.js";
import { env, prisma } from "./config/env.js";
import { reminderSchedulerService } from "./services/reminder-scheduler.service.js";
import { companyNotificationSchedulerService } from "./services/company-notification-scheduler.service.js";

const server = app.listen(env.port, () => {
  console.log(`🚀 E-TUYS Backend running on http://localhost:${env.port}`);

  reminderSchedulerService.start();

  // Firma bildirim zamanlayıcısı bağımsız kontrol edilir.
  if (process.env.COMPANY_NOTIFICATION_SCHEDULER_ENABLED !== "false") {
    companyNotificationSchedulerService.start();
  } else {
    console.log("Firma bildirim scheduler'ı devre dışı.");
  }
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Server is shutting down.`);

  await Promise.all([
    reminderSchedulerService.stop(),
    companyNotificationSchedulerService.stop(),
  ]);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
