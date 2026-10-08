/**
 * Mail + WhatsApp önizleme (SADECE OKUR)
 *
 * Kuyruk ile aynı kuralları kullanarak, şu an kuyruk çalışsaydı hangi firmaya
 * hangi adreslere mail ve hangi numaralara WhatsApp gideceğini listeler.
 *  - Mesaj veya mail GÖNDERMEZ.
 *  - Veritabanına hiçbir şey YAZMAZ.
 *
 * Sonuç: whatsapp-onizleme.csv (Excel ile açılır) + ekranda özet.
 *
 * Kullanım (backend klasöründe, npm run build sonrası):
 *   node dist/scripts/whatsapp-preview.js
 */
import { writeFileSync } from "node:fs";
import { prisma } from "../config/env.js";
import { DocumentReminderService } from "../services/document-reminder.service.js";
import { CompanyAuthorizationReminderService } from "../services/company-authorization-reminder.service.js";
import {
  collectEmailRecipients,
  collectWhatsAppRecipients,
  getDocumentEmailWarnings,
  getEmailWarnings,
  getWhatsAppWarnings,
} from "../services/reminder-contact-check.js";

type Contact = { fullName: string; email: string; phone: string };

type Row = {
  tur: string;
  firma: string;
  belgeNo: string;
  ay: number;
  hedefTarih: string;
  kisiSayisi: number;
  kisiler: string;
  kayitliTelefonlar: string;
  whatsappNumaralari: string;
  whatsappDurum: string;
  whatsappSebep: string;
  mailAdresleri: string;
  mailDurum: string;
  mailSebep: string;
  danisman: string;
};

const STATUS = {
  SEND: "Gönderilecek",
  QUEUED: "Zaten kuyrukta / işlenmiş",
  BLOCKED: "Gönderilemez",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function consultantName(
  user: { firstName: string; lastName: string; isActive: boolean } | null | undefined,
): string {
  if (!user) return "YOK";
  const name = `${user.firstName} ${user.lastName}`.trim();
  return user.isActive ? name : `${name} (pasif)`;
}

function contactColumns(contacts: Contact[]) {
  return {
    kisiSayisi: contacts.length,
    kisiler: contacts.map((c) => c.fullName).join(" | "),
    kayitliTelefonlar: contacts
      .map((c) => c.phone.replace(/\s*\r?\n\s*/g, " / "))
      .join(" | "),
    whatsappNumaralari: collectWhatsAppRecipients(contacts).join(", "),
    mailAdresleri: collectEmailRecipients(contacts).join(", "),
  };
}

async function main() {
  const now = new Date();
  const rows: Row[] = [];

  // ---- Belge hatırlatmaları (süre uzatma / kapatma) ----
  const documentCandidates =
    await new DocumentReminderService().findDueCandidates(now);

  for (const { document, company, decision } of documentCandidates) {
    const contacts = company.contacts;
    const whatsappWarnings = getWhatsAppWarnings(contacts);
    const emailWarnings = getDocumentEmailWarnings({
      contacts,
      type: decision.type,
      documentNumber: document.documentNumber,
      investorAddress: company.identity?.investorAddress,
    });

    const existing = await prisma.documentReminder.findFirst({
      where: {
        documentId: document.id,
        type: decision.type,
        targetDate: decision.targetDate,
        reminderMonth: decision.reminderMonth,
        channel: "WHATSAPP",
      },
      select: { status: true },
    });

    rows.push({
      tur: decision.type === "CLOSURE_APPLICATION" ? "Kapatma" : "Süre uzatma",
      firma: company.name,
      belgeNo: document.documentNumber ?? "",
      ay: decision.reminderMonth,
      hedefTarih: formatDate(decision.targetDate),
      ...contactColumns(contacts),
      whatsappDurum: existing
        ? `${STATUS.QUEUED} (${existing.status})`
        : whatsappWarnings.length > 0
          ? STATUS.BLOCKED
          : STATUS.SEND,
      whatsappSebep: whatsappWarnings.join(" "),
      mailDurum: emailWarnings.length > 0 ? "Gönderilemez" : "Gönderilecek",
      mailSebep: emailWarnings.join(" "),
      danisman: consultantName(company.consultantUser),
    });
  }

  // ---- Yetkilendirme hatırlatmaları ----
  const authorizationCandidates =
    await new CompanyAuthorizationReminderService().findDueCandidates(now);

  for (const { authorization, company, decision } of authorizationCandidates) {
    const contacts = company.contacts;
    const whatsappWarnings = getWhatsAppWarnings(contacts);
    const emailWarnings = getEmailWarnings(contacts);

    const existing = await prisma.companyAuthorizationReminder.findFirst({
      where: {
        authorizationId: authorization.id,
        type: "AUTHORIZATION_EXPIRY",
        targetDate: decision.targetDate,
        reminderMonth: decision.reminderMonth,
        channel: "WHATSAPP",
      },
      select: { status: true },
    });

    rows.push({
      tur: "Yetkilendirme",
      firma: company.name,
      belgeNo: "",
      ay: decision.reminderMonth,
      hedefTarih: formatDate(decision.targetDate),
      ...contactColumns(contacts),
      whatsappDurum: existing
        ? `${STATUS.QUEUED} (${existing.status})`
        : whatsappWarnings.length > 0
          ? STATUS.BLOCKED
          : STATUS.SEND,
      whatsappSebep: whatsappWarnings.join(" "),
      mailDurum: emailWarnings.length > 0 ? "Gönderilemez" : "Gönderilecek",
      mailSebep: emailWarnings.join(" "),
      danisman: consultantName(company.consultantUser),
    });
  }

  // ---- CSV (Excel'de Türkçe karakterler düzgün görünsün diye BOM + ";") ----
  const header = [
    "Tür",
    "Firma",
    "Belge No",
    "Hatırlatma ayı",
    "Hedef tarih",
    "Kişi sayısı",
    "Kişiler",
    "Kayıtlı telefonlar",
    "WhatsApp numaraları",
    "WhatsApp durumu",
    "WhatsApp sebep",
    "Mail adresleri",
    "Mail durumu",
    "Mail sebep",
    "Danışman",
  ];

  const lines = [
    header.join(";"),
    ...rows.map((row) =>
      [
        row.tur,
        row.firma,
        row.belgeNo,
        row.ay,
        row.hedefTarih,
        row.kisiSayisi,
        row.kisiler,
        row.kayitliTelefonlar,
        row.whatsappNumaralari,
        row.whatsappDurum,
        row.whatsappSebep,
        row.mailAdresleri,
        row.mailDurum,
        row.mailSebep,
        row.danisman,
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];

  writeFileSync("whatsapp-onizleme.csv", "\uFEFF" + lines.join("\r\n"), "utf8");

  // ---- Özet ----
  const count = (tur: string, durum: string) =>
    rows.filter((r) => r.tur === tur && r.whatsappDurum.startsWith(durum)).length;

  console.log("\nÖNİZLEME (hiçbir şey gönderilmedi, hiçbir şey yazılmadı)\n");

  for (const tur of ["Süre uzatma", "Kapatma", "Yetkilendirme"]) {
    const ofType = rows.filter((r) => r.tur === tur);
    console.log(`${tur}: toplam ${ofType.length}`);
    console.log(`  WhatsApp gönderilecek   : ${count(tur, STATUS.SEND)}`);
    console.log(`  WhatsApp gönderilemez   : ${count(tur, STATUS.BLOCKED)}`);
    console.log(`  Zaten kuyrukta/işlenmiş : ${count(tur, STATUS.QUEUED)}`);
    console.log(
      `  Mail gönderilecek       : ${ofType.filter((r) => r.mailDurum === "Gönderilecek").length}`,
    );
  }

  const sendRows = rows.filter((r) => r.whatsappDurum === STATUS.SEND);
  const messageCount = sendRows.reduce(
    (sum, r) => sum + (r.whatsappNumaralari ? r.whatsappNumaralari.split(", ").length : 0),
    0,
  );
  const multiContact = rows.filter((r) => r.kisiSayisi > 1).length;

  console.log(`\nToplam WhatsApp mesajı (numara bazında): ${messageCount}`);
  console.log(`Birden fazla iletişim kişisi olan hatırlatma: ${multiContact}`);

  const reasons = new Map<string, number>();
  for (const row of rows.filter((r) => r.whatsappDurum === STATUS.BLOCKED)) {
    reasons.set(row.whatsappSebep, (reasons.get(row.whatsappSebep) ?? 0) + 1);
  }
  if (reasons.size > 0) {
    console.log("\nWhatsApp gönderilemez sebepleri:");
    for (const [reason, n] of reasons) console.log(`  ${n} x ${reason}`);
  }

  console.log(`\nDetaylı liste: whatsapp-onizleme.csv (${rows.length} satır)\n`);
}

main()
  .catch((error) => {
    console.error("Önizleme betiği hata verdi.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });