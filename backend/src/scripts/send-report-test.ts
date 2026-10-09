/**
 * Günlük / haftalık gönderim raporu deneme betiği
 *
 * Raporu mail test modu ile SADECE EMAIL_TEST_RECIPIENT adresine "[TEST]" başlığıyla
 * gönderir. Gerçek rapor alıcılarına gitmez. Veritabanında hiçbir şeyi değiştirmez
 * (günlük/haftalık raporun "son gönderim" bilgisi de değişmez).
 *
 * Kullanım (backend klasöründe, npm run build sonrası):
 *   node dist/scripts/send-report-test.js            -> günlük rapor (son 24 saat)
 *   node dist/scripts/send-report-test.js haftalik   -> haftalık rapor (son 7 gün)
 */
import { prisma } from "../config/env.js";
import { EmailService } from "../services/email.service.js";
import { buildReport } from "../services/daily-email-report.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const weekly = process.argv[2] === "haftalik";
  const now = new Date();
  const since = new Date(now.getTime() - (weekly ? 7 : 1) * DAY_MS);

  const report = await buildReport(since, now, {
    heading: weekly ? "Haftalık gönderim raporu" : "Günlük gönderim raporu",
    includeSentList: !weekly,
  });

  const result = await new EmailService().sendTest({
    to: process.env.DAILY_REPORT_EMAIL ?? "-",
    subject: weekly ? "Haftalık gönderim raporu" : "Günlük gönderim raporu",
    text: report.text,
    html: report.html,
  });

  console.log(
    `Test raporu gönderildi -> ${result.testRecipient} (${weekly ? "haftalık" : "günlük"})`,
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