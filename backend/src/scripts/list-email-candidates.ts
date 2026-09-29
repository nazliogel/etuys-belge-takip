/**
 * Otomatik e-posta sisteminin BUGÜN hangi firmalara hangi e-postayı
 * hazırlayacağını listeler. HİÇBİR E-POSTA GÖNDERMEZ, kuyruğa da eklemez.
 *
 * Çalıştırma (backend klasöründe):
 *   npx tsx src/scripts/list-email-candidates.ts
 *
 * Çıktı:
 *   - Terminalde özet
 *   - backend/mail-adaylari-YYYY-MM-DD.csv (Excel ile açılır)
 *
 * Not: Liste, e-posta önizleme servislerinin gördüğü adaylardır. Aynı dönem
 * için daha önce gönderilmiş bir e-posta varsa kuyruk onu tekrar göndermez;
 * bu durum "Durum" sütununda ayrıca işaretlenir.
 */

import fs from "node:fs";
import path from "node:path";

import { prisma } from "../config/env.js";
import { CompanyAuthorizationReminderPreviewService } from "../services/company-authorization-reminder-preview.service.js";
import { DocumentReminderPreviewService } from "../services/document-reminder-preview.service.js";

type Row = {
  tur: string;
  firma: string;
  belgeNo: string;
  hedefTarih: string;
  kalanAy: string;
  yetkiDolmus: string;
  alici: string;
  gonderilebilir: string;
  durum: string;
  uyarilar: string;
};

const TYPE_LABELS: Record<string, string> = {
  EXTENSION_APPLICATION: "Süre uzatma",
  CLOSURE_APPLICATION: "Kapatma",
  AUTHORIZATION_EXPIRY: "Yetkilendirme",
};

function formatDate(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function findAlreadySentKeys() {
  const [documentSent, authorizationSent] = await Promise.all([
    prisma.documentReminder.findMany({
      where: { channel: "EMAIL", status: { in: ["SENT", "PENDING"] } },
      select: {
        documentId: true,
        type: true,
        targetDate: true,
        reminderMonth: true,
        status: true,
      },
    }),
    prisma.companyAuthorizationReminder.findMany({
      where: { channel: "EMAIL", status: { in: ["SENT", "PENDING"] } },
      select: {
        authorizationId: true,
        targetDate: true,
        reminderMonth: true,
        status: true,
      },
    }),
  ]);

  const documentKeys = new Map<string, string>();
  for (const item of documentSent) {
    documentKeys.set(
      `${item.documentId}|${item.type}|${formatDate(item.targetDate)}|${item.reminderMonth}`,
      item.status,
    );
  }

  const authorizationKeys = new Map<string, string>();
  for (const item of authorizationSent) {
    authorizationKeys.set(
      `${item.authorizationId}|${formatDate(item.targetDate)}|${item.reminderMonth}`,
      item.status,
    );
  }

  return { documentKeys, authorizationKeys };
}

function statusLabel(canSend: boolean, existing?: string): string {
  if (existing === "SENT") return "Bu dönem için zaten gönderildi";
  if (existing === "PENDING") return "Kuyrukta bekliyor";
  if (!canSend) return "Eksik bilgi - firmaya gitmez, danışmana bildirim";
  return "Gönderilecek";
}

async function main() {
  const today = new Date();

  const [documentPreviews, authorizationPreviews, sentKeys] =
    await Promise.all([
      new DocumentReminderPreviewService().createPreviews(today),
      new CompanyAuthorizationReminderPreviewService().createPreviews(today),
      findAlreadySentKeys(),
    ]);

  const rows: Row[] = [];

  for (const preview of documentPreviews as any[]) {
    const key = `${preview.documentId}|${preview.type}|${formatDate(preview.targetDate)}|${preview.reminderMonth}`;

    rows.push({
      tur: TYPE_LABELS[preview.type] ?? String(preview.type),
      firma: preview.companyName ?? "",
      belgeNo: preview.documentNumber ?? "",
      hedefTarih: formatDate(preview.targetDate),
      kalanAy: String(preview.reminderMonth ?? ""),
      yetkiDolmus: preview.authorizationExpired ? "Evet" : "Hayır",
      alici: preview.recipient ?? "",
      gonderilebilir: preview.canSend ? "Evet" : "Hayır",
      durum: statusLabel(preview.canSend, sentKeys.documentKeys.get(key)),
      uyarilar: (preview.warnings ?? []).join(", "),
    });
  }

  for (const preview of authorizationPreviews as any[]) {
    const key = `${preview.authorizationId}|${formatDate(preview.targetDate)}|${preview.reminderMonth}`;

    rows.push({
      tur: TYPE_LABELS.AUTHORIZATION_EXPIRY,
      firma: preview.companyName ?? "",
      belgeNo: "",
      hedefTarih: formatDate(preview.targetDate),
      kalanAy: String(preview.reminderMonth ?? ""),
      yetkiDolmus:
        preview.targetDate && new Date(preview.targetDate) < today
          ? "Evet"
          : "Hayır",
      alici: preview.recipient ?? "",
      gonderilebilir: preview.canSend ? "Evet" : "Hayır",
      durum: statusLabel(
        preview.canSend,
        sentKeys.authorizationKeys.get(key),
      ),
      uyarilar: (preview.warnings ?? []).join(", "),
    });
  }

  rows.sort(
    (a, b) => a.tur.localeCompare(b.tur, "tr") || a.firma.localeCompare(b.firma, "tr"),
  );

  // Terminal özeti
  const summary = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const bucket = summary.get(row.tur) ?? {};
    bucket[row.durum] = (bucket[row.durum] ?? 0) + 1;
    summary.set(row.tur, bucket);
  }

  console.log(`\nBugün (${formatDate(today)}) e-posta adayları:\n`);
  for (const [type, counts] of summary) {
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    console.log(`${type}: ${total} aday`);
    for (const [status, count] of Object.entries(counts)) {
      console.log(`   - ${status}: ${count}`);
    }
  }

  const companiesToReceive = new Set(
    rows.filter((row) => row.durum === "Gönderilecek").map((row) => row.firma),
  );
  console.log(
    `\nYeni e-posta gidecek firma sayısı: ${companiesToReceive.size}`,
  );

  // CSV (Excel Türkçe için ; ayraç + BOM)
  const headers = [
    "Tür",
    "Firma",
    "Belge No",
    "Hedef Tarih",
    "Kalan Ay",
    "Yetki Dolmuş",
    "Alıcı",
    "Gönderilebilir",
    "Durum",
    "Uyarılar",
  ];

  const lines = [
    headers.map(csvCell).join(";"),
    ...rows.map((row) =>
      [
        row.tur,
        row.firma,
        row.belgeNo,
        row.hedefTarih,
        row.kalanAy,
        row.yetkiDolmus,
        row.alici,
        row.gonderilebilir,
        row.durum,
        row.uyarilar,
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];

  const filePath = path.resolve(
    process.cwd(),
    `mail-adaylari-${formatDate(today)}.csv`,
  );
  fs.writeFileSync(filePath, `\uFEFF${lines.join("\r\n")}`, "utf8");

  console.log(`\nDetaylı liste: ${filePath}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });