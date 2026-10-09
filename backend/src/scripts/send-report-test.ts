/**
 * Haftalık / günlük gönderim raporu deneme betiği
 *
 * Raporu mail test modu ile SADECE EMAIL_TEST_RECIPIENT adresine "[TEST]" başlığıyla
 * gönderir. Gerçek rapor alıcılarına gitmez. Veritabanında hiçbir şeyi değiştirmez
 * (raporun "son gönderim" bilgisi de değişmez).
 *
 * Kullanım (backend klasöründe, npm run build sonrası):
 *   node dist/scripts/send-report-test.js           -> haftalık rapor (son 7 gün)
 *   node dist/scripts/send-report-test.js gunluk    -> günlük rapor (son 24 saat; normalde kapalı)
 *
 * Gerekli .env ayarları: EMAIL_SENDING_ENABLED=false, EMAIL_TEST_SENDING_ENABLED=true,
 * EMAIL_TEST_RECIPIENT=<test adresi> ve SMTP ayarları.
 */
import { prisma } from "../config/env.js";
import { EmailService } from "../services/email.service.js";
import { buildReport } from "../services/daily-email-report.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const daily = process.argv[2] === "gunluk";
  const now = new Date();
  const since = new Date(now.getTime() - (daily ? 1 : 7) * DAY_MS);
  const heading = daily ? "Günlük gönderim raporu" : "Haftalık gönderim raporu";

  const report = await buildReport(since, now, {
    heading,
    includeSentList: true,
  });

  const result = await new EmailService().sendTest({
    to: process.env.WEEKLY_REPORT_EMAIL ?? process.env.DAILY_REPORT_EMAIL ?? "-",
    subject: heading,
    text: report.text,
    html: report.html,
  });

  console.log(
    `Test raporu gönderildi -> ${result.testRecipient} (${daily ? "günlük" : "haftalık"})`,
  );
  console.log(
    `Mail: ${report.emailReport.sentRows.length} gönderilen, ${report.emailReport.failedRows.length} gönderilemeyen | ` +
      `WhatsApp bölümü: ${report.includeWhatsApp ? "var" : "yok"}`,
  );
}

main()
  .catch((error) => {
    console.error("Test raporu gönderilemedi.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });