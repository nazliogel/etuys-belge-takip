/**
 * GEÇİCİ: Günlük raporun örneğini TEST olarak gönderir.
 * Sadece EMAIL_TEST_RECIPIENT adresine gider; rapor durumunu iş bitince geri yükler.
 * Servis koduna dokunmaz. İş bitince bu dosyayı silebilirsin.
 *
 * Kullanım: npx tsx src/scripts/send-report-preview.ts [gün]
 */
import { prisma } from "../config/env.js";
import { DailyEmailReportService } from "../services/daily-email-report.service.js";
import { EmailService } from "../services/email.service.js";

const SETTING_KEY = "dailyEmailReport.state";
const days = Number(process.argv[2] ?? 30);
const now = new Date();
const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

// Rapor alıcı listesi boşsa servis rapor hazırlamaz; test için bir değer veriyoruz.
// Mail yine sadece EMAIL_TEST_RECIPIENT adresine gider.
process.env.DAILY_REPORT_EMAIL ||= "tubabulan@aya.com.tr";

// Normal gönderim yerine test gönderimi kullanılır
const realEmailService = new EmailService();
const previewEmailService = {
  send: (params: Parameters<EmailService["sendTest"]>[0]) =>
    realEmailService.sendTest(params),
} as unknown as EmailService;

const original = await prisma.systemSetting.findUnique({
  where: { key: SETTING_KEY },
});

try {
  const previewState = {
    lastSentAt: since.toISOString(),
    lastReportDate: "2000-01-01",
  };

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: previewState },
    update: { value: previewState },
  });

  console.log(`Son ${days} günün örnek raporu hazırlanıyor...`);
  await new DailyEmailReportService(previewEmailService).runIfDue(now);
} finally {
  // Rapor durumunu eski hâline getir
  if (original) {
    await prisma.systemSetting.update({
      where: { key: SETTING_KEY },
      data: { value: JSON.parse(JSON.stringify(original.value)) },
    });
  } else {
    await prisma.systemSetting.delete({ where: { key: SETTING_KEY } });
  }
  console.log("Rapor durumu eski hâline getirildi.");
  await prisma.$disconnect();
}