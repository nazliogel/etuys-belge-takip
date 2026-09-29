/**
 * Tüm otomatik e-posta türlerini test adresine gönderir.
 *
 * Çalıştırmadan önce backend/.env içinde:
 *   EMAIL_SENDING_ENABLED=false
 *   EMAIL_TEST_SENDING_ENABLED=true
 *   EMAIL_TEST_RECIPIENT=tubabulan@aya.com.tr
 *
 * Çalıştırma (backend klasöründe):
 *   npx tsx src/scripts/send-test-emails.ts
 *
 * Gerçek firmalara hiçbir şey gitmez: sendTest yalnızca EMAIL_TEST_RECIPIENT
 * adresine gönderir ve normal gönderim açıksa çalışmayı reddeder.
 * Veriler örnektir, veritabanından okunmaz.
 */

import { prisma } from "../config/env.js";
import {
  createAuthorizationExpiryEmailTemplate,
  createClosureEmailTemplate,
  createExtensionEmailTemplate,
} from "../services/closure-email-template.service.js";
import { EmailService } from "../services/email.service.js";

const SAMPLE_COMPANY = "ÖRNEK TEST SANAYİ VE TİCARET ANONİM ŞİRKETİ";
const SAMPLE_RECIPIENT = "firma-iletisim@ornek.com";
const SAMPLE_DOCUMENT_NUMBER = "B-123456";
const SAMPLE_ADDRESS = "Örnek OSB 1. Cadde No:10 Gebze / Kocaeli";

const DELAY_BETWEEN_EMAILS_MS = 3000;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const today = new Date();

interface Scenario {
  label: string;
  build: () => {
    subject: string;
    text: string;
    html: string;
    attachments: { filename: string; path: string }[];
  };
}

const scenarios: Scenario[] = [
  {
    label: "Süre uzatma - yetki geçerli",
    build: () =>
      createExtensionEmailTemplate({
        companyName: SAMPLE_COMPANY,
        targetDate: addMonths(today, 4),
        authorizationExpired: false,
      }),
  },
  {
    label: "Süre uzatma - yetki DOLMUŞ (yetkilendirme notu + evraklar)",
    build: () =>
      createExtensionEmailTemplate({
        companyName: SAMPLE_COMPANY,
        targetDate: addMonths(today, 4),
        authorizationExpired: true,
      }),
  },
  {
    label: "Kapatma - yetki geçerli",
    build: () =>
      createClosureEmailTemplate({
        companyName: SAMPLE_COMPANY,
        documentNumber: SAMPLE_DOCUMENT_NUMBER,
        targetDate: addMonths(today, -2),
        investorAddress: SAMPLE_ADDRESS,
        authorizationExpired: false,
      }),
  },
  {
    label: "Kapatma - yetki DOLMUŞ (yetkilendirme notu + evraklar)",
    build: () =>
      createClosureEmailTemplate({
        companyName: SAMPLE_COMPANY,
        documentNumber: SAMPLE_DOCUMENT_NUMBER,
        targetDate: addMonths(today, -2),
        investorAddress: SAMPLE_ADDRESS,
        authorizationExpired: true,
      }),
  },
  {
    label: "Yetkilendirme - süresi DOLACAK",
    build: () =>
      createAuthorizationExpiryEmailTemplate({
        companyName: SAMPLE_COMPANY,
        targetDate: addMonths(today, 3),
      }),
  },
  {
    label: "Yetkilendirme - süresi DOLMUŞ",
    build: () =>
      createAuthorizationExpiryEmailTemplate({
        companyName: SAMPLE_COMPANY,
        targetDate: addMonths(today, -1),
      }),
  },
];

async function main() {
  const emailService = new EmailService();
  const total = scenarios.length;
  let sent = 0;
  let failed = 0;

  console.log(`${total} test e-postası gönderilecek.\n`);

  for (const [index, scenario] of scenarios.entries()) {
    const number = `${index + 1}/${total}`;

    try {
      const template = scenario.build();

      const result = await emailService.sendTest({
        to: SAMPLE_RECIPIENT,
        subject: `(${number} ${scenario.label}) ${template.subject}`,
        text: template.text,
        html: template.html,
        attachments: template.attachments,
      });

      sent += 1;
      console.log(
        `✅ ${number} ${scenario.label} -> ${result.testRecipient} (ek: ${template.attachments.length})`,
      );
    } catch (error) {
      failed += 1;
      console.error(
        `❌ ${number} ${scenario.label}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (index < total - 1) {
      await sleep(DELAY_BETWEEN_EMAILS_MS);
    }
  }

  console.log(`\nBitti. Gönderilen: ${sent}, hatalı: ${failed}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });