/**
 * Mail + WhatsApp önizleme (SADECE OKUR)
 *
 * Kuyruk ile aynı kuralları kullanarak, şu an kuyruk çalışsaydı hangi firmaya
 * hangi adreslere mail ve hangi numaralara WhatsApp gideceğini listeler.
 *  - Mesaj veya mail GÖNDERMEZ.
 *  - Veritabanına hiçbir şey YAZMAZ.
 *  - Daha önce kuyruğa alınmış / gönderilmiş kayıtlar ayrıca işaretlenir
 *    (mail ve WhatsApp için ayrı ayrı).
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
import { DEFAULT_CC_RECIPIENTS } from "../services/document-reminder-preview.service.js";
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
  mailAliciSayisi: number;
  mailDurum: string;
  mailSebep: string;
  danisman: string;
};

const STATUS = {
  SEND: "Gönderilecek",
  QUEUED: "Zaten kuyrukta / işlenmiş",
  BLOCKED: "Gönderilemez",
};

const STATUS_TR: Record<string, string> = {
  PENDING: "kuyrukta bekliyor",
  SENT: "gönderildi",
  FAILED: "gönderilemedi",
  SKIPPED: "atlandı",
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
  const emails = collectEmailRecipients(contacts);

  return {
    kisiSayisi: contacts.length,
    kisiler: contacts.map((c) => c.fullName).join(" | "),
    kayitliTelefonlar: contacts
      .map((c) => c.phone.replace(/\s*\r?\n\s*/g, " / "))
      .join(" | "),
    whatsappNumaralari: collectWhatsAppRecipients(contacts).join(", "),
    mailAdresleri: emails.join(", "),
    // Markum alıcı başına sayar: firma adresleri + CC adresleri
    mailAliciSayisi: emails.length > 0 ? emails.length + DEFAULT_CC_RECIPIENTS.length : 0,
  };
}

function resolveStatus(
  existing: { status: string } | null,
  warnings: string[],
): string {
  if (existing) {
    return `${STATUS.QUEUED} (${STATUS_TR[existing.status] ?? existing.status})`;
  }
  return warnings.length > 0 ? STATUS.BLOCKED : STATUS.SEND;
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

    const key = {
      documentId: document.id,
      type: decision.type,
      targetDate: decision.targetDate,
      reminderMonth: decision.reminderMonth,
    };

    const [existingWhatsApp, existingEmail] = await Promise.all([
      prisma.documentReminder.findFirst({
        where: { ...key, channel: "WHATSAPP" },
        select: { status: true },
      }),
      prisma.documentReminder.findFirst({
        where: { ...key, channel: "EMAIL" },
        select: { status: true },
      }),
    ]);

    rows.push({
      tur: decision.type === "CLOSURE_APPLICATION" ? "Kapatma" : "Süre uzatma",
      firma: company.name,
      belgeNo: document.documentNumber ?? "",
      ay: decision.reminderMonth,
      hedefTarih: formatDate(decision.targetDate),
      ...contactColumns(contacts),
      whatsappDurum: resolveStatus(existingWhatsApp, whatsappWarnings),
      whatsappSebep: whatsappWarnings.join(" "),
      mailDurum: resolveStatus(existingEmail, emailWarnings),
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

    const key = {
      authorizationId: authorization.id,
      type: "AUTHORIZATION_EXPIRY" as const,
      targetDate: decision.targetDate,
      reminderMonth: decision.reminderMonth,
    };

    const [existingWhatsApp, existingEmail] = await Promise.all([
      prisma.companyAuthorizationReminder.findFirst({
        where: { ...key, channel: "WHATSAPP" },
        select: { status: true },
      }),
      prisma.companyAuthorizationReminder.findFirst({
        where: { ...key, channel: "EMAIL" },
        select: { status: true },
      }),
    ]);

    rows.push({
      tur: "Yetkilendirme",
      firma: company.name,
      belgeNo: "",
      ay: decision.reminderMonth,
      hedefTarih: formatDate(decision.targetDate),
      ...contactColumns(contacts),
      whatsappDurum: resolveStatus(existingWhatsApp, whatsappWarnings),
      whatsappSebep: whatsappWarnings.join(" "),
      mailDurum: resolveStatus(existingEmail, emailWarnings),
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
    "Mail alıcı sayısı (CC dahil)",
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
        row.mailAliciSayisi,
        row.mailDurum,
        row.mailSebep,
        row.danisman,
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];

  writeFileSync("whatsapp-onizleme.csv", "﻿" + lines.join("\r\n"), "utf8");

  // ---- Özet ----
  const count = (
    tur: string,
    field: "whatsappDurum" | "mailDurum",
    durum: string,
  ) => rows.filter((r) => r.tur === tur && r[field].startsWith(durum)).length;

  console.log("\nÖNİZLEME (hiçbir şey gönderilmedi, hiçbir şey yazılmadı)\n");

  for (const tur of ["Süre uzatma", "Kapatma", "Yetkilendirme"]) {
    const ofType = rows.filter((r) => r.tur === tur);
    console.log(`${tur}: toplam ${ofType.length}`);
    console.log(
      `  Mail     -> gönderilecek: ${count(tur, "mailDurum", STATUS.SEND)}, ` +
        `gönderilemez: ${count(tur, "mailDurum", STATUS.BLOCKED)}, ` +
        `zaten kuyrukta/işlenmiş: ${count(tur, "mailDurum", STATUS.QUEUED)}`,
    );
    console.log(
      `  WhatsApp -> gönderilecek: ${count(tur, "whatsappDurum", STATUS.SEND)}, ` +
        `gönderilemez: ${count(tur, "whatsappDurum", STATUS.BLOCKED)}, ` +
        `zaten kuyrukta/işlenmiş: ${count(tur, "whatsappDurum", STATUS.QUEUED)}`,
    );
  }

  const whatsappMessages = rows
    .filter((r) => r.whatsappDurum === STATUS.SEND)
    .reduce(
      (sum, r) =>
        sum + (r.whatsappNumaralari ? r.whatsappNumaralari.split(", ").length : 0),
      0,
    );
  const mailRows = rows.filter((r) => r.mailDurum === STATUS.SEND);
  const mailRecipients = mailRows.reduce((sum, r) => sum + r.mailAliciSayisi, 0);

  console.log(`\nYeni gidecek mail: ${mailRows.length} (toplam alıcı, CC dahil: ${mailRecipients})`);
  console.log(`Yeni gidecek WhatsApp mesajı (numara bazında): ${whatsappMessages}`);
  console.log(
    `Birden fazla iletişim kişisi olan hatırlatma: ${rows.filter((r) => r.kisiSayisi > 1).length}`,
  );

  for (const [label, field, sebep] of [
    ["Mail", "mailDurum", "mailSebep"],
    ["WhatsApp", "whatsappDurum", "whatsappSebep"],
  ] as const) {
    const reasons = new Map<string, number>();
    for (const row of rows.filter((r) => r[field] === STATUS.BLOCKED)) {
      reasons.set(row[sebep], (reasons.get(row[sebep]) ?? 0) + 1);
    }
    if (reasons.size > 0) {
      console.log(`\n${label} gönderilemez sebepleri:`);
      for (const [reason, n] of reasons) console.log(`  ${n} x ${reason}`);
    }
  }

  writeFileSync("whatsapp-onizleme.html", renderHtml(rows, now), "utf8");

  console.log(`\nDetaylı liste: whatsapp-onizleme.csv (${rows.length} satır)`);
  console.log(`Tablo görünümü: whatsapp-onizleme.html (tarayıcıda açın)\n`);
}

// ---- HTML tablo (filtrelenebilir, aranabilir) ----
function renderHtml(rows: Row[], now: Date): string {
  const data = JSON.stringify(rows).replace(/</g, "\\u003c");
  const created = now.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mail ve WhatsApp Önizleme</title>
<style>
  :root{--bg:#fff;--fg:#1d2433;--muted:#5b6475;--line:#e3e7ef;--head:#f4f6fa;--ok:#e6f6ec;--okf:#17663a;--bad:#fdecec;--badf:#a3222b;--done:#eef1f5;--donef:#4a5263}
  *{box-sizing:border-box} body{margin:0;padding:20px 16px;font-family:Segoe UI,Arial,sans-serif;color:var(--fg);background:var(--bg);font-size:13px}
  h1{margin:0 0 4px;font-size:20px} .meta{color:var(--muted);margin-bottom:14px}
  .cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
  .card{border:1px solid var(--line);border-radius:8px;padding:10px 14px;min-width:170px}
  .card b{display:block;font-size:12px;color:var(--muted);font-weight:600;margin-bottom:4px}
  .card span{display:inline-block;margin-right:10px}
  .bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:2}
  select,input{padding:6px 8px;border:1px solid var(--line);border-radius:6px;font:inherit}
  input{min-width:220px} .count{color:var(--muted);margin-left:auto}
  .wrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px}
  table{border-collapse:collapse;width:100%}
  th,td{padding:7px 9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
  th{background:var(--head);position:sticky;top:0;cursor:pointer;white-space:nowrap;font-weight:600}
  td.small{font-size:12px;color:var(--muted);max-width:260px;word-break:break-word}
  .st{display:inline-block;border-radius:5px;padding:2px 7px;font-size:12px;white-space:nowrap}
  .st.ok{background:var(--ok);color:var(--okf)} .st.bad{background:var(--bad);color:var(--badf)} .st.done{background:var(--done);color:var(--donef)}
  .why{display:block;font-size:11.5px;color:var(--badf);margin-top:3px;max-width:240px}
  tr:hover td{background:#fafbfd}
  @media print{.bar{position:static} th{position:static}}
</style></head><body>
<h1>Mail ve WhatsApp Önizleme</h1>
<div class="meta">Oluşturma: ${created} · Hiçbir şey gönderilmedi, veritabanına hiçbir şey yazılmadı.</div>
<div class="cards" id="cards"></div>
<div class="bar">
  <select id="tur"><option value="">Tüm türler</option><option>Süre uzatma</option><option>Kapatma</option><option>Yetkilendirme</option></select>
  <select id="mail"><option value="">Mail: hepsi</option><option value="ok">Mail: gönderilecek</option><option value="bad">Mail: gönderilemez</option><option value="done">Mail: zaten işlenmiş</option></select>
  <select id="wa"><option value="">WhatsApp: hepsi</option><option value="ok">WhatsApp: gönderilecek</option><option value="bad">WhatsApp: gönderilemez</option><option value="done">WhatsApp: zaten işlenmiş</option></select>
  <input id="q" placeholder="Firma, kişi, numara veya adres ara">
  <span class="count" id="count"></span>
</div>
<div class="wrap"><table>
  <thead><tr>
    <th data-k="tur">Tür</th><th data-k="firma">Firma</th><th data-k="belgeNo">Belge No</th>
    <th data-k="ay">Ay</th><th data-k="hedefTarih">Hedef tarih</th><th data-k="kisiler">Kişiler</th>
    <th data-k="mailDurum">Mail</th><th data-k="mailAdresleri">Mail adresleri</th><th data-k="mailAliciSayisi">Alıcı (CC dahil)</th>
    <th data-k="whatsappDurum">WhatsApp</th><th data-k="whatsappNumaralari">WhatsApp numaraları</th>
    <th data-k="danisman">Danışman</th>
  </tr></thead>
  <tbody id="body"></tbody>
</table></div>
<script>
const ROWS = ${data};
const kind = s => s.startsWith("Gönderilecek") ? "ok" : s.startsWith("Gönderilemez") ? "bad" : "done";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const badge = (s, why) => '<span class="st ' + kind(s) + '">' + esc(s) + '</span>' + (why ? '<span class="why">' + esc(why) + '</span>' : '');
let sortKey = null, sortDir = 1;

function cards() {
  const html = ["Süre uzatma","Kapatma","Yetkilendirme"].map(t => {
    const r = ROWS.filter(x => x.tur === t);
    const c = (f, k) => r.filter(x => kind(x[f]) === k).length;
    return '<div class="card"><b>' + t + ' (' + r.length + ')</b>' +
      '<div>Mail: <span class="st ok">' + c("mailDurum","ok") + ' gidecek</span><span class="st bad">' + c("mailDurum","bad") + ' gidemez</span><span class="st done">' + c("mailDurum","done") + ' işlenmiş</span></div>' +
      '<div style="margin-top:4px">WhatsApp: <span class="st ok">' + c("whatsappDurum","ok") + ' gidecek</span><span class="st bad">' + c("whatsappDurum","bad") + ' gidemez</span><span class="st done">' + c("whatsappDurum","done") + ' işlenmiş</span></div></div>';
  }).join("");
  document.getElementById("cards").innerHTML = html;
}

function render() {
  const tur = document.getElementById("tur").value;
  const mail = document.getElementById("mail").value;
  const wa = document.getElementById("wa").value;
  const q = document.getElementById("q").value.toLocaleLowerCase("tr-TR").trim();
  let list = ROWS.filter(r =>
    (!tur || r.tur === tur) &&
    (!mail || kind(r.mailDurum) === mail) &&
    (!wa || kind(r.whatsappDurum) === wa) &&
    (!q || [r.firma, r.kisiler, r.mailAdresleri, r.whatsappNumaralari, r.kayitliTelefonlar, r.belgeNo, r.danisman].join(" ").toLocaleLowerCase("tr-TR").includes(q)));
  if (sortKey) list = [...list].sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey]), "tr", {numeric: true}) * sortDir);
  document.getElementById("body").innerHTML = list.map(r =>
    "<tr><td>" + esc(r.tur) + "</td><td><b>" + esc(r.firma) + "</b></td><td>" + esc(r.belgeNo) + "</td><td>" + r.ay +
    "</td><td>" + esc(r.hedefTarih) + "</td><td class='small'>" + esc(r.kisiler) + "</td><td>" + badge(r.mailDurum, r.mailSebep) +
    "</td><td class='small'>" + esc(r.mailAdresleri) + "</td><td>" + (r.mailAliciSayisi || "") + "</td><td>" + badge(r.whatsappDurum, r.whatsappSebep) +
    "</td><td class='small'>" + esc(r.whatsappNumaralari) + "</td><td>" + esc(r.danisman) + "</td></tr>").join("");
  document.getElementById("count").textContent = list.length + " / " + ROWS.length + " satır";
}

document.querySelectorAll("th").forEach(th => th.onclick = () => {
  const k = th.dataset.k; sortDir = sortKey === k ? -sortDir : 1; sortKey = k; render();
});
["tur","mail","wa"].forEach(id => document.getElementById(id).onchange = render);
document.getElementById("q").oninput = render;
cards(); render();
</script>
</body></html>`;
}

main()
  .catch((error) => {
    console.error("Önizleme betiği hata verdi.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });