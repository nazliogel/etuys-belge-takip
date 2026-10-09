/**
 * WhatsApp şablon testi
 *
 * Onaylı şablonları örnek verilerle WHATSAPP_TEST_RECIPIENT numarasına gönderir.
 * Mail test modu gibi çalışır: normal gönderim (WHATSAPP_SENDING_ENABLED) kapalı,
 * test gönderimi açık olmalıdır. Veritabanına dokunmaz, kuyruğa kayıt eklemez.
 *
 * Kullanım (backend klasöründe, npm run build sonrası):
 *   $env:WHATSAPP_TEST_SENDING_ENABLED="true"; $env:WHATSAPP_TEST_RECIPIENT="905XXXXXXXXX"; node dist/scripts/whatsapp-test-send.js
 */
import { WhatsAppService } from "../services/whatsapp.service.js";
import {
  createAuthorizationWhatsAppTemplate,
  createClosureWhatsAppTemplate,
  createExtensionWhatsAppTemplate,
} from "../services/whatsapp-template.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const now = new Date();
  // Şablonlar @db.Date alanlarıyla çalıştığı için tarihleri UTC gün başına sabitliyoruz.
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const daysFromToday = (days: number) =>
    new Date(today.getTime() + days * DAY_MS);

  const cases = [
    {
      label: "Süre uzatma (süre henüz dolmamış)",
      build: () =>
        createExtensionWhatsAppTemplate({
          companyName: "TEST FİRMA",
          documentNumber: "TEST-001",
          targetDate: daysFromToday(30),
          today: now,
        }),
    },
    {
      label: "Kapatma",
      build: () =>
        createClosureWhatsAppTemplate({
          companyName: "TEST FİRMA",
          documentNumber: "TEST-001",
          targetDate: daysFromToday(-10),
          today: now,
        }),
    },
    {
      label: "Yetkilendirme (süresi henüz dolmamış)",
      build: () =>
        createAuthorizationWhatsAppTemplate({
          companyName: "TEST FİRMA",
          targetDate: daysFromToday(180),
          today: now,
        }),
    },
    {
      label: "Yetkilendirme (süresi dolmuş)",
      build: () =>
        createAuthorizationWhatsAppTemplate({
          companyName: "TEST FİRMA",
          targetDate: daysFromToday(-5),
          today: now,
        }),
    },
  ];

  const service = new WhatsAppService();

  for (const testCase of cases) {
    try {
      const template = testCase.build();
      const result = await service.sendTest({
        to: "TEST FİRMA (örnek)",
        templateName: template.templateName,
        languageCode: template.languageCode,
        parameters: template.parameters,
      });

      console.log(`OK   ${testCase.label}`);
      console.log(`     Şablon: ${template.templateName}`);
      console.log(`     Parametreler: ${JSON.stringify(template.parameters)}`);
      console.log(`     Gönderilen numara: ${result.testRecipient}`);
      console.log(`     Mesaj ID: ${result.messageId}\n`);
    } catch (error) {
      console.error(`HATA ${testCase.label}`);
      console.error(
        `     ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }
}

main().catch((error) => {
  console.error("Test betiği beklenmedik şekilde durdu.", error);
  process.exit(1);
});