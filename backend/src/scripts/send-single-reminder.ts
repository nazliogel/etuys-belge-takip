/**
 * Kuyruktaki TEK bir süre uzatma / kapatma e-postasını gönderir.
 *
 *   npx tsx src/scripts/send-single-reminder.ts <kayitId>           -> test adresine (EMAIL_TEST_RECIPIENT)
 *   npx tsx src/scripts/send-single-reminder.ts <kayitId> --gercek  -> firmaya gerçek gönderim
 */

import { prisma } from "../config/env.js";
import {
  createClosureEmailTemplate,
  createExtensionEmailTemplate,
} from "../services/closure-email-template.service.js";
import { DEFAULT_CC_RECIPIENTS } from "../services/document-reminder-preview.service.js";
import {
  normalizeDate,
  resolveReminderDecision,
} from "../services/document-reminder.service.js";
import { parseEmailRecipients } from "../services/email-recipients.js";
import { EmailService } from "../services/email.service.js";
import { CompanyRequestRepository } from "../repositories/company-request.repository.js";

async function main() {
  const id = Number(process.argv[2]);
  const real = process.argv.includes("--gercek");

  if (!Number.isInteger(id)) {
    throw new Error(
      "Kullanım: npx tsx src/scripts/send-single-reminder.ts <kayitId> [--gercek]",
    );
  }

  const reminder = await prisma.documentReminder.findUnique({
    where: { id },
    include: {
      document: true,
      contact: true,
      company: { include: { identity: true, authorization: true } },
    },
  });

  if (!reminder) throw new Error(`Kayıt bulunamadı: ${id}`);
  if (reminder.channel !== "EMAIL")
    throw new Error("Bu kayıt bir e-posta kaydı değil.");
  if (reminder.status !== "PENDING") {
    throw new Error(`Kayıt beklemede değil (durum: ${reminder.status}).`);
  }
  // Worker'ın gönderim öncesi yaptığı kontrolün aynısı:
  // kayıt artık geçerli değilse sistem de göndermeyecek.
  const doc = reminder.document;
  const decision =
    doc.isActive &&
    doc.status === "OPEN" &&
    doc.documentEndDate &&
    doc.extensionDate
      ? resolveReminderDecision(
          doc.documentEndDate,
          doc.extensionDate,
          new Date(),
        )
      : null;

  if (
    !decision ||
    decision.type !== reminder.type ||
    decision.reminderMonth !== reminder.reminderMonth ||
    normalizeDate(decision.targetDate).getTime() !==
      normalizeDate(reminder.targetDate).getTime()
  ) {
    throw new Error(
      `Bu kayıt artık geçerli değil, sistem bunu göndermeyip atlayacak. ` +
        `Kayıttaki dönem: ${reminder.reminderMonth}, güncel dönem: ${decision?.reminderMonth ?? "yok"}.`,
    );
  }

  // Worker'daki kapatma başvurusu kontrolünün aynısı.
  const closureRequest =
    await new CompanyRequestRepository().findLatestClosureRequest({
      companyId: reminder.companyId,
      externalDocumentId: doc.externalDocumentId,
    });

  if (reminder.type === "EXTENSION_APPLICATION" && closureRequest) {
    throw new Error(
      "Firma için kapatma başvurusu bulundu, sistem süre uzatma e-postası göndermeyecek.",
    );
  }

  if (reminder.type === "CLOSURE_APPLICATION" && closureRequest) {
    const requestStatus = closureRequest.requestStatus
      ?.trim()
      .toLocaleUpperCase("tr-TR");

    if (requestStatus !== "REDDEDİLDİ") {
      throw new Error(
        `Firmanın kapatma başvurusu var (durum: ${closureRequest.requestStatus}), sistem kapatma e-postası göndermeyecek.`,
      );
    }
  }

  const now = new Date();
  const authorizationEndDate =
    reminder.company.authorization?.authorizationEndDate ?? null;
  const authorizationExpired =
    authorizationEndDate === null ||
    normalizeDate(authorizationEndDate) < normalizeDate(now);

  const template =
    reminder.type === "CLOSURE_APPLICATION"
      ? createClosureEmailTemplate({
          companyName: reminder.company.name,
          documentNumber:
            reminder.document.documentNumber ?? "Belge numarası bulunamadı",
          targetDate: reminder.targetDate,
          investorAddress: reminder.company.identity?.investorAddress,
          authorizationExpired,
        })
      : createExtensionEmailTemplate({
          companyName: reminder.company.name,
          targetDate: reminder.targetDate,
          authorizationExpired,
        });

  console.log("\n--- GÖNDERİLECEK E-POSTA ---");
  console.log(`Firma      : ${reminder.company.name}`);
  console.log(`Belge no   : ${reminder.document.documentNumber ?? "-"}`);
  console.log(
    `Tür        : ${reminder.type === "CLOSURE_APPLICATION" ? "Kapatma" : "Süre uzatma"}`,
  );
  console.log(
    `Alıcı(lar) : ${parseEmailRecipients(reminder.recipient).join(", ") || "GEÇERLİ ADRES YOK"}`,
  );
  console.log(`CC         : ${DEFAULT_CC_RECIPIENTS.join(", ")}`);
  console.log(
    `Yetki      : ${authorizationExpired ? "DOLMUŞ (not eklenecek)" : "geçerli"}`,
  );
  console.log(`Konu       : ${reminder.subject ?? template.subject}`);
  console.log(`Ek sayısı  : ${template.attachments.length}`);
  console.log(
    `Mod        : ${real ? "GERÇEK GÖNDERİM" : "TEST (sadece size)"}\n`,
  );

  const params = {
    to: reminder.recipient,
    cc: [...DEFAULT_CC_RECIPIENTS],
    subject: reminder.subject ?? template.subject,
    text: reminder.message,
    html: template.html,
    attachments: template.attachments,
  };

  const emailService = new EmailService();

  if (!real) {
    const result = await emailService.sendTest(params);
    console.log(`✅ Test e-postası gönderildi: ${result.testRecipient}`);
    console.log("Kayıt durumu değişmedi (hâlâ kuyrukta bekliyor).");
    return;
  }

  const result = await emailService.send(params);

  if (!result.anyRecipientAccepted) {
    throw new Error(
      `SMTP sunucusu firma adresini kabul etmedi. Reddedilenler: ${result.rejected.map(String).join(", ")}`,
    );
  }

  await prisma.documentReminder.update({
    where: { id },
    data: {
      status: "SENT",
      attemptedAt: new Date(),
      sentAt: new Date(),
      providerId: result.messageId,
      errorMessage: null,
    },
  });

  console.log(`✅ Firmaya gönderildi: ${result.recipients.join(", ")}`);
  console.log(
    "Kayıt SENT olarak işaretlendi, sistem aynı e-postayı tekrar göndermeyecek.",
  );
}

main()
  .catch((error) => {
    console.error(
      `❌ ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
