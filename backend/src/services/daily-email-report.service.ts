import { env, prisma } from "../config/env.js";
import { EmailService } from "./email.service.js";
import { buildConsultantStatusSection } from "./consultant-status-report.js";

const SETTING_KEY = "dailyEmailReport.state";
const WEEKLY_SETTING_KEY = "weeklyEmailReport.state";
const REPORT_HOUR = 8; // İstanbul saatiyle bu saatten sonraki ilk turda gönderilir
const CONSULTANT_FAILURE_MONTH_OFFSET = 100; // repository'deki değerle aynı olmalı
const WHATSAPP_CONSULTANT_MONTH_OFFSET = 200; // repository'deki değerle aynı olmalı
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Channel = "EMAIL" | "WHATSAPP";

/** Günlük raporun gideceği adresler (.env: DAILY_REPORT_EMAIL, virgülle ayrılmış) */
function getReportRecipients(): string[] {
  return (process.env.DAILY_REPORT_EMAIL ?? "")
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter(Boolean);
}

/**
 * YENİ: Haftalık raporun gideceği adresler.
 * .env'de WEEKLY_REPORT_EMAIL varsa o, yoksa günlük raporun adresleri kullanılır.
 */
function getWeeklyReportRecipients(): string[] {
  const weekly = (process.env.WEEKLY_REPORT_EMAIL ?? "")
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter(Boolean);

  return weekly.length > 0 ? weekly : getReportRecipients();
}

interface ReportState {
  lastSentAt: string;
  lastReportDate: string;
}

interface ReportRow {
  kind: string;
  companyName: string;
  consultant: string;
  recipient: string;
  time: Date | null;
  notification: string;
  detail: string;
}

type CompanyInfo = {
  name: string;
  consultant: string | null;
  consultantUser: {
    firstName: string;
    lastName: string;
    isActive: boolean;
  } | null;
};

type ReminderLike = {
  recipient: string;
  company: CompanyInfo;
};

type DocumentReminderLike = ReminderLike & {
  documentId: number;
  type: string;
  targetDate: Date;
  reminderMonth: number;
};

function getIstanbulParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    weekday: get("weekday"),
  };
}

function formatIstanbul(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function documentKind(type: string): string {
  return type === "CLOSURE_APPLICATION" ? "Kapatma" : "Süre uzatma";
}

function consultantName(company: CompanyInfo): string {
  const user = company.consultantUser;
  if (user) {
    return `${user.firstName} ${user.lastName}${user.isActive ? "" : " (pasif)"}`;
  }
  if (company.consultant?.trim()) {
    return `${company.consultant} (kullanıcı hesabı bağlı değil)`;
  }
  return "Atanmamış";
}

/** Hata mesajına göre yapılması gereken işlem */
function suggestAction(errorMessage: string | null, channel: Channel): string {
  const message = (errorMessage ?? "").toLocaleLowerCase("tr-TR");

  // YENİ: WhatsApp'a özel hatalar
  if (channel === "WHATSAPP") {
    if (
      message.includes("cep telefonu") ||
      message.includes("telefon numarası") ||
      message.includes("iletişim kaydı")
    ) {
      return "Firmanın iletişim kaydına geçerli bir cep telefonu numarası girilmeli.";
    }
    if (message.includes("[deneme 3/3]")) {
      return "3 deneme de başarısız oldu; WhatsApp (Kapso) servisi kontrol edilmeli.";
    }
    return "Hata incelenmeli (numara WhatsApp kullanmıyor olabilir).";
  }

  if (
    message.includes("geçerli bir e-posta") ||
    message.includes("kabul edilmedi")
  ) {
    return "Firma e-posta adresi düzeltilip tekrar kuyruğa alınmalı.";
  }
  if (message.includes("bilgi kontrolü")) {
    return "Eksik firma/belge bilgisi tamamlanıp tekrar kuyruğa alınmalı.";
  }
  if (message.includes("[deneme 3/3]")) {
    return "3 deneme de başarısız oldu; mail sunucusu kontrol edilip tekrar kuyruğa alınmalı.";
  }
  return "Hata incelenip tekrar kuyruğa alınmalı.";
}

function notificationKey(
  documentId: number,
  type: string,
  targetDate: Date,
  reminderMonth: number,
  channel: string,
): string {
  return `${documentId}|${type}|${targetDate.toISOString()}|${reminderMonth}|${channel}`;
}

function toRow(
  kind: string,
  reminder: ReminderLike,
  time: Date | null,
  notification: string,
  detail: string,
): ReportRow {
  return {
    kind,
    companyName: reminder.company.name,
    consultant: consultantName(reminder.company),
    // WhatsApp kayıtlarında birden fazla numara virgülle tutulur.
    recipient: reminder.recipient.split(",").join(", "),
    time,
    notification,
    detail,
  };
}

// ---- Görünüm (mail programları için: sadece tablo + satır içi stil, kod çalışmaz) ----
type Tone = "ok" | "bad" | "warn" | "muted" | "info";

const TONES: Record<Tone, { bg: string; fg: string; line: string }> = {
  ok: { bg: "#e6f6ec", fg: "#17663a", line: "#2f9e5b" },
  bad: { bg: "#fdecec", fg: "#a3222b", line: "#d14343" },
  warn: { bg: "#fff4e0", fg: "#8a5a00", line: "#e0a020" },
  muted: { bg: "#eef1f5", fg: "#4a5263", line: "#9aa3b2" },
  info: { bg: "#eef2ff", fg: "#3341a3", line: "#5b6ad0" },
};

const FONT = "font-family:'Segoe UI',Arial,sans-serif";
const BORDER = "#e3e7ef";

function badge(text: string, tone: Tone): string {
  const t = TONES[tone];
  return `<span style="display:inline-block;background:${t.bg};color:${t.fg};border-radius:5px;padding:2px 7px;font-size:12px;white-space:nowrap">${escapeHtml(text)}</span>`;
}

function notificationTone(text: string): Tone {
  if (text.startsWith("Gitti") || text.includes("maili gitti")) return "ok";
  if (text.startsWith("Gitmedi") || text.includes("gönderilemedi")) return "bad";
  return "muted";
}

/** "Sebep: X → yapılacak" metnini iki satıra ayırır: sebep (gri) + yapılacak (kalın). */
function renderDetail(detail: string, tone: Tone): string {
  const [reason, action] = detail.split(" → ");
  const t = TONES[tone];
  return [
    `<div style="color:#5b6475;font-size:12px">${escapeHtml(reason.replace(/^Sebep:\s*/, ""))}</div>`,
    action
      ? `<div style="color:${t.fg};font-weight:600;margin-top:3px">${escapeHtml(action)}</div>`
      : "",
  ].join("");
}

function renderTable(
  title: string,
  detailHeader: string | null,
  rows: ReportRow[],
  tone: Tone = "muted",
): string {
  if (rows.length === 0) return "";

  const t = TONES[tone];
  const headers = [
    "Tür",
    "Firma",
    "Danışman",
    "Alıcı",
    "Zaman",
    "Danışman bildirimi",
    ...(detailHeader ? [detailHeader] : []),
  ];
  const th = `style="background:#f4f6fa;color:#1d2433;text-align:left;font-weight:600;padding:8px 10px;border-bottom:1px solid ${BORDER};white-space:nowrap"`;
  const td = `style="padding:8px 10px;border-bottom:1px solid ${BORDER};vertical-align:top"`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px">
      <tr><td style="border-left:4px solid ${t.line};padding:2px 0 2px 10px;${FONT};font-size:15px;font-weight:600;color:#1d2433">
        ${escapeHtml(title)} ${badge(String(rows.length), tone)}
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER};${FONT};font-size:13px;color:#1d2433">
      <tr>${headers.map((header) => `<th ${th}>${header}</th>`).join("")}</tr>
      ${rows
        .map(
          (row) => `<tr>
            <td ${td}>${badge(row.kind, "info")}</td>
            <td ${td}><b>${escapeHtml(row.companyName)}</b></td>
            <td ${td}>${escapeHtml(row.consultant)}</td>
            <td ${td}><span style="color:#5b6475;font-size:12px">${escapeHtml(row.recipient)}</span></td>
            <td ${td}><span style="white-space:nowrap">${escapeHtml(formatIstanbul(row.time))}</span></td>
            <td ${td}>${row.notification === "-" ? "-" : badge(row.notification, notificationTone(row.notification))}</td>
            ${detailHeader ? `<td ${td}>${renderDetail(row.detail, tone)}</td>` : ""}
          </tr>`,
        )
        .join("")}
    </table>`;
}

/** Üstteki özet kutusu: büyük sayılar + türlere göre dağılım. */
function renderSummaryCard(report: ChannelReport, label: string): string {
  const count = (rows: ReportRow[], kind: string) =>
    rows.filter((row) => row.kind === kind).length;
  const pending = report.docPending + report.authPending;

  const stat = (value: number, text: string, tone: Tone) => {
    const t = TONES[tone];
    return `<td style="padding:4px" width="20%"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${t.bg};border-radius:8px;padding:10px 8px;text-align:center;${FONT}">
      <div style="font-size:22px;font-weight:700;color:${t.fg};line-height:1.1">${value}</div>
      <div style="font-size:11.5px;color:${t.fg};margin-top:3px">${text}</div>
    </td></tr></table></td>`;
  };

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:10px;margin:0 0 14px">
      <tr><td style="padding:12px 12px 4px;${FONT};font-size:14px;font-weight:600;color:#1d2433">${escapeHtml(label)}</td></tr>
      <tr><td style="padding:0 8px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${stat(report.sentRows.length, "Gönderildi", "ok")}
          ${stat(report.failedRows.length, "Gönderilemedi", report.failedRows.length > 0 ? "bad" : "muted")}
          ${stat(report.retryingRows.length, "Tekrar denenecek", report.retryingRows.length > 0 ? "warn" : "muted")}
          ${stat(report.skippedRows.length, "Atlandı", "muted")}
          ${stat(pending, "Kuyrukta bekliyor", "info")}
        </tr></table>
      </td></tr>
      <tr><td style="padding:6px 12px 12px;${FONT};font-size:12px;color:#5b6475">
        Gönderilenler: Kapatma ${count(report.sentRows, "Kapatma")} · Süre uzatma ${count(report.sentRows, "Süre uzatma")} · Yetkilendirme ${count(report.sentRows, "Yetkilendirme")}
        &nbsp;|&nbsp; Kuyrukta: Belge ${report.docPending} · Yetkilendirme ${report.authPending}
      </td></tr>
    </table>`;
}

function renderText(
  title: string,
  rows: ReportRow[],
  withDetail: boolean,
): string {
  if (rows.length === 0) return "";

  return [
    `\n${title} (${rows.length})`,
    ...rows.map(
      (row, index) =>
        `${index + 1}. [${row.kind}] ${row.companyName} | ${row.recipient} | ${formatIstanbul(row.time)}` +
        `\n   Danışman: ${row.consultant} | Bildirim: ${row.notification}` +
        (withDetail ? `\n   ${row.detail}` : ""),
    ),
  ].join("\n");
}

interface ChannelReport {
  channel: Channel;
  sentRows: ReportRow[];
  failedRows: ReportRow[];
  skippedRows: ReportRow[];
  retryingRows: ReportRow[];
  docPending: number;
  authPending: number;
}

const withCompany = {
  company: {
    select: {
      name: true,
      consultant: true,
      consultantUser: {
        select: { firstName: true, lastName: true, isActive: true },
      },
    },
  },
} as const;

/** Bir kanalın (mail veya WhatsApp) dönem içindeki kayıtlarını rapor satırlarına çevirir. */
async function buildChannelReport(
  channel: Channel,
  period: { gte: Date; lt: Date },
  findNotification: (
    r: DocumentReminderLike,
    month: number,
    channel: string,
  ) => string | undefined,
): Promise<ChannelReport> {
  const [
    docSent,
    docFailed,
    docSkipped,
    docRetrying,
    docPending,
    authSent,
    authFailed,
    authSkipped,
    authRetrying,
    authPending,
  ] = await Promise.all([
    prisma.documentReminder.findMany({
      where: { channel, status: "SENT", sentAt: period },
      include: withCompany,
      orderBy: { sentAt: "asc" },
    }),
    prisma.documentReminder.findMany({
      where: { channel, status: "FAILED", attemptedAt: period },
      include: withCompany,
      orderBy: { attemptedAt: "asc" },
    }),
    prisma.documentReminder.findMany({
      where: { channel, status: "SKIPPED", attemptedAt: period },
      include: withCompany,
      orderBy: { attemptedAt: "asc" },
    }),
    prisma.documentReminder.findMany({
      where: {
        channel,
        status: "PENDING",
        errorMessage: { startsWith: "[deneme" },
      },
      include: withCompany,
      orderBy: { attemptedAt: "asc" },
    }),
    prisma.documentReminder.count({
      where: { channel, status: "PENDING" },
    }),

    prisma.companyAuthorizationReminder.findMany({
      where: { channel, status: "SENT", sentAt: period },
      include: withCompany,
      orderBy: { sentAt: "asc" },
    }),
    prisma.companyAuthorizationReminder.findMany({
      where: { channel, status: "FAILED", attemptedAt: period },
      include: withCompany,
      orderBy: { attemptedAt: "asc" },
    }),
    prisma.companyAuthorizationReminder.findMany({
      where: { channel, status: "SKIPPED", attemptedAt: period },
      include: withCompany,
      orderBy: { attemptedAt: "asc" },
    }),
    prisma.companyAuthorizationReminder.findMany({
      where: {
        channel,
        status: "PENDING",
        errorMessage: { startsWith: "[deneme" },
      },
      include: withCompany,
      orderBy: { attemptedAt: "asc" },
    }),
    prisma.companyAuthorizationReminder.count({
      where: { channel, status: "PENDING" },
    }),
  ]);

  const failureOffset =
    channel === "WHATSAPP"
      ? WHATSAPP_CONSULTANT_MONTH_OFFSET
      : CONSULTANT_FAILURE_MONTH_OFFSET;

  const sentNotification = (r: DocumentReminderLike): string => {
    // "1 ay kaldı" bildirimi sadece mail gönderiminde oluşturulur.
    if (channel === "WHATSAPP") return "Gerekmedi (mail ile gönderilir)";
    if (r.reminderMonth !== 1) return "Gerekmedi (son ay değil)";
    if (!r.company.consultantUser?.isActive)
      return "Gitmedi: aktif danışman yok";
    return findNotification(r, r.reminderMonth, "CONSULTANT_IN_APP")
      ? "Gitti: 1 ay kaldı bildirimi"
      : "Gitmedi: bu belge için daha önce gönderilmiş";
  };

  const failedNotification = (r: DocumentReminderLike): string => {
    if (
      findNotification(
        r,
        r.reminderMonth + failureOffset,
        "CONSULTANT_IN_APP",
      )
    ) {
      return "Gitti: gönderilemedi bildirimi";
    }
    const adminStatus = findNotification(r, r.reminderMonth, "ADMIN_EMAIL");
    if (adminStatus === "SENT") {
      return "Danışman yok: admin'e 'Danışman Bilgisi Eksik' maili gitti";
    }
    if (adminStatus) {
      return "Danışman yok: admin maili de gönderilemedi";
    }
    return "Gitmedi";
  };

  const AUTH_NOTIFICATION = "-";

  return {
    channel,
    sentRows: [
      ...docSent.map((r) =>
        toRow(documentKind(r.type), r, r.sentAt, sentNotification(r), ""),
      ),
      ...authSent.map((r) =>
        toRow("Yetkilendirme", r, r.sentAt, AUTH_NOTIFICATION, ""),
      ),
    ],
    failedRows: [
      ...docFailed.map((r) =>
        toRow(
          documentKind(r.type),
          r,
          r.attemptedAt,
          failedNotification(r),
          `Sebep: ${r.errorMessage ?? "-"} → ${suggestAction(r.errorMessage, channel)}`,
        ),
      ),
      ...authFailed.map((r) =>
        toRow(
          "Yetkilendirme",
          r,
          r.attemptedAt,
          AUTH_NOTIFICATION,
          `Sebep: ${r.errorMessage ?? "-"} → ${suggestAction(r.errorMessage, channel)}`,
        ),
      ),
    ],
    skippedRows: [
      ...docSkipped.map((r) =>
        toRow(
          documentKind(r.type),
          r,
          r.attemptedAt,
          "Gerekmedi",
          `${r.errorMessage ?? "-"} → Otomatik atlandı, işlem gerekmez.`,
        ),
      ),
      ...authSkipped.map((r) =>
        toRow(
          "Yetkilendirme",
          r,
          r.attemptedAt,
          "Gerekmedi",
          `${r.errorMessage ?? "-"} → Otomatik atlandı, işlem gerekmez.`,
        ),
      ),
    ],
    retryingRows: [
      ...docRetrying.map((r) =>
        toRow(
          documentKind(r.type),
          r,
          r.attemptedAt,
          "Gerekmedi (henüz kesin hata değil)",
          `${r.errorMessage ?? "-"} → Otomatik tekrar denenecek.`,
        ),
      ),
      ...authRetrying.map((r) =>
        toRow(
          "Yetkilendirme",
          r,
          r.attemptedAt,
          "Gerekmedi (henüz kesin hata değil)",
          `${r.errorMessage ?? "-"} → Otomatik tekrar denenecek.`,
        ),
      ),
    ],
    docPending,
    authPending,
  };
}

function hasActivity(report: ChannelReport): boolean {
  return (
    report.sentRows.length +
      report.failedRows.length +
      report.skippedRows.length +
      report.retryingRows.length +
      report.docPending +
      report.authPending >
    0
  );
}

function summaryLinesFor(report: ChannelReport): string[] {
  const count = (rows: ReportRow[], kind: string) =>
    rows.filter((row) => row.kind === kind).length;

  return [
    `Gönderilen: ${report.sentRows.length} (Kapatma: ${count(report.sentRows, "Kapatma")}, Süre uzatma: ${count(report.sentRows, "Süre uzatma")}, Yetkilendirme: ${count(report.sentRows, "Yetkilendirme")})`,
    `Gönderilemeyen: ${report.failedRows.length}`,
    `Atlanan: ${report.skippedRows.length}`,
    `Tekrar denenecek: ${report.retryingRows.length}`,
    `Kuyrukta bekleyen: ${report.docPending + report.authPending} (Belge: ${report.docPending}, Yetkilendirme: ${report.authPending})`,
  ];
}

/** Bir kanalın HTML ve düz metin bölümü. */
function renderChannel(
  report: ChannelReport,
  options: { title: string | null; includeSentList: boolean; label: string },
) {
  const summary = summaryLinesFor(report);
  const noun = report.channel === "WHATSAPP" ? "WhatsApp mesajı" : "mail";

  const hasRows =
    report.failedRows.length +
      report.retryingRows.length +
      report.skippedRows.length +
      (options.includeSentList ? report.sentRows.length : 0) >
    0;

  const html = `
    ${options.title ? `<div style="${FONT};font-size:18px;font-weight:700;color:#1d2433;margin:30px 0 4px;padding-bottom:6px;border-bottom:2px solid ${BORDER}">${escapeHtml(options.title)}</div>` : ""}
    ${report.failedRows.length > 0 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0"><tr><td style="background:${TONES.bad.bg};color:${TONES.bad.fg};border-radius:8px;padding:10px 14px;${FONT};font-size:13px"><b>Dikkat:</b> ${report.failedRows.length} ${noun} gönderilemedi, aşağıdaki işlemlerin yapılması gerekiyor.</td></tr></table>` : ""}
    ${renderTable(`${options.label} - Gönderilemeyenler`, "Sebep ve yapılması gereken", report.failedRows, "bad")}
    ${renderTable(`${options.label} - Tekrar denenecekler`, "Durum", report.retryingRows, "warn")}
    ${renderTable(`${options.label} - Atlananlar`, "Sebep", report.skippedRows, "muted")}
    ${options.includeSentList ? renderTable(`${options.label} - Gönderilenler`, null, report.sentRows, "ok") : ""}
    ${hasRows ? "" : `<div style="${FONT};font-size:13px;color:#5b6475;margin:10px 0">Bu dönemde listelenecek kayıt yok.</div>`}`;

  const text = [
    ...(options.title ? ["", options.title.toLocaleUpperCase("tr-TR")] : []),
    ...summary,
    renderText(`${options.label.toLocaleUpperCase("tr-TR")} - GÖNDERİLEMEYENLER`, report.failedRows, true),
    renderText(`${options.label.toLocaleUpperCase("tr-TR")} - TEKRAR DENENECEKLER`, report.retryingRows, true),
    renderText(`${options.label.toLocaleUpperCase("tr-TR")} - ATLANANLAR`, report.skippedRows, true),
    options.includeSentList
      ? renderText(`${options.label.toLocaleUpperCase("tr-TR")} - GÖNDERİLENLER`, report.sentRows, false)
      : "",
  ].join("\n");

  return { html, text };
}

/**
 * Raporu oluşturur. Günlük ve haftalık rapor aynı içeriği kullanır;
 * haftalıkta gönderilenler tek tek listelenmez (sadece sayıları yazılır).
 */
export async function buildReport(
  since: Date,
  now: Date,
  options: { heading: string; includeSentList: boolean },
) {
  const period = { gte: since, lt: now };

  // Bu dönemde oluşturulan danışman/admin bildirimleri (mail ve WhatsApp)
  const docNotifications = await prisma.documentReminder.findMany({
    where: {
      channel: { in: ["CONSULTANT_IN_APP", "ADMIN_EMAIL"] },
      OR: [{ attemptedAt: period }, { createdAt: period }],
    },
    select: {
      documentId: true,
      type: true,
      targetDate: true,
      reminderMonth: true,
      channel: true,
      status: true,
    },
  });

  const notificationStatus = new Map<string, string>();
  for (const n of docNotifications) {
    notificationStatus.set(
      notificationKey(n.documentId, n.type, n.targetDate, n.reminderMonth, n.channel),
      n.status,
    );
  }

  const findNotification = (
    r: DocumentReminderLike,
    month: number,
    channel: string,
  ) =>
    notificationStatus.get(
      notificationKey(r.documentId, r.type, r.targetDate, month, channel),
    );

  const [emailReport, whatsappReport] = await Promise.all([
    buildChannelReport("EMAIL", period, findNotification),
    buildChannelReport("WHATSAPP", period, findNotification),
  ]);

  // WhatsApp bölümü, WhatsApp açıldığında veya ilk WhatsApp kaydı oluştuğunda görünür.
  // O zamana kadar rapor eskisi gibi sadece maili içerir.
  const includeWhatsApp =
    env.whatsappQueueEnabled ||
    env.whatsappSendingEnabled ||
    hasActivity(whatsappReport);

  const periodText = `Dönem: ${formatIstanbul(since)} - ${formatIstanbul(now)}`;
  const consultantSection = await buildConsultantStatusSection(since, now);

  const emailPart = renderChannel(emailReport, {
    title: includeWhatsApp ? "Mail" : null,
    includeSentList: options.includeSentList,
    label: "Mail",
  });

  const whatsappPart = includeWhatsApp
    ? renderChannel(whatsappReport, {
        title: "WhatsApp",
        includeSentList: options.includeSentList,
        label: "WhatsApp",
      })
    : null;

  // Özet kutuları en üstte: mail ve WhatsApp yan yana (dar ekranda alt alta).
  const summaryCards = includeWhatsApp
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="50%" style="vertical-align:top;padding-right:7px">${renderSummaryCard(emailReport, "Mail")}</td>
        <td width="50%" style="vertical-align:top;padding-left:7px">${renderSummaryCard(whatsappReport, "WhatsApp")}</td>
      </tr></table>`
    : renderSummaryCard(emailReport, "Mail");

  const html = `
    <div style="background:#ffffff;padding:4px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:1100px;margin:0 auto">
      <tr><td style="${FONT};color:#1d2433;padding:8px 4px">
        <div style="font-size:22px;font-weight:700;margin:0 0 4px">${escapeHtml(options.heading)}</div>
        <div style="font-size:13px;color:#5b6475;margin-bottom:16px">${escapeHtml(periodText)}</div>
        ${summaryCards}
        ${emailPart.html}
        ${consultantSection.html}
        ${whatsappPart?.html ?? ""}
        ${options.includeSentList ? "" : `<div style="font-size:12px;color:#5b6475;margin-top:24px">Haftalık raporda gönderilenler tek tek listelenmez; ayrıntılar günlük raporlardadır.</div>`}
      </td></tr>
    </table>
    </div>`;

  const text = [
    options.heading,
    "",
    periodText,
    emailPart.text,
    consultantSection.text,
    whatsappPart?.text ?? "",
  ].join("\n");

  return { emailReport, whatsappReport, includeWhatsApp, html, text };
}

function subjectCounts(
  emailReport: ChannelReport,
  whatsappReport: ChannelReport,
  includeWhatsApp: boolean,
): string {
  const mail = `Mail: ${emailReport.sentRows.length} gönderildi, ${emailReport.failedRows.length} gönderilemedi`;
  if (!includeWhatsApp) return mail;
  return `${mail} | WhatsApp: ${whatsappReport.sentRows.length} gönderildi, ${whatsappReport.failedRows.length} gönderilemedi`;
}

export class DailyEmailReportService {
  private isRunning = false;
  private completedReportDate?: string;
  private completedWeeklyReportDate?: string;

  constructor(private readonly emailService = new EmailService()) {}

  /**
   * Zamanlayıcı her turda çağırır.
   * Sadece pazartesi haftalık rapor gönderilir. Günlük rapor kapalıdır;
   * tekrar açmak için .env'e DAILY_REPORT_ENABLED=true yazılır.
   */
  async runIfDue(now: Date = new Date()): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      if (process.env.DAILY_REPORT_ENABLED === "true") {
        await this.runDailyIfDue(now);
      }
      await this.runWeeklyIfDue(now);
    } finally {
      this.isRunning = false;
    }
  }

  private async runDailyIfDue(now: Date): Promise<void> {
    const { date, hour, weekday } = getIstanbulParts(now);

    if (this.completedReportDate === date) return;

    if (weekday === "Sat" || weekday === "Sun" || hour < REPORT_HOUR) return;

    const recipients = getReportRecipients();
    if (recipients.length === 0) return;

    try {
      const state = await this.loadState(SETTING_KEY);

      if (state?.lastReportDate === date) {
        this.completedReportDate = date;
        return;
      }

      // İlk kurulum: geçmişe dönük rapor gönderilmez.
      // Bugünün başlangıcı kaydedilir; ilk rapor yarın sabah bugünü kapsar.
      if (!state?.lastSentAt) {
        await this.saveState(SETTING_KEY, {
          lastSentAt: new Date(`${date}T00:00:00+03:00`).toISOString(),
          lastReportDate: date,
        }, "Günlük mail gönderim raporunun son gönderim bilgisi");
        this.completedReportDate = date;
        console.log(
          "Daily email report initialized; first report will be sent next weekday.",
        );
        return;
      }

      const since = new Date(state.lastSentAt);

      const report = await buildReport(since, now, {
        heading: "Günlük gönderim raporu",
        includeSentList: true,
      });

      await this.emailService.send({
        to: recipients.join("; "),
        subject: `Günlük gönderim raporu - ${subjectCounts(report.emailReport, report.whatsappReport, report.includeWhatsApp)}`,
        text: report.text,
        html: report.html,
      });

      await this.saveState(SETTING_KEY, {
        lastSentAt: now.toISOString(),
        lastReportDate: date,
      }, "Günlük mail gönderim raporunun son gönderim bilgisi");
      this.completedReportDate = date;
      console.log(
        `Daily email report sent: mail ${report.emailReport.sentRows.length} sent, ${report.emailReport.failedRows.length} failed; whatsapp ${report.whatsappReport.sentRows.length} sent, ${report.whatsappReport.failedRows.length} failed.`,
      );
    } catch (error) {
      console.error("Daily email report could not be sent.", error);
    }
  }

  /**
   * YENİ: Haftalık rapor. Her pazartesi 08:00'den sonraki ilk turda, bir önceki
   * haftalık rapordan bu yana olan her şeyi kapsar (ilk seferde son 7 gün).
   */
  private async runWeeklyIfDue(now: Date): Promise<void> {
    const { date, hour, weekday } = getIstanbulParts(now);

    if (this.completedWeeklyReportDate === date) return;

    if (weekday !== "Mon" || hour < REPORT_HOUR) return;

    const recipients = getWeeklyReportRecipients();
    if (recipients.length === 0) return;

    try {
      const state = await this.loadState(WEEKLY_SETTING_KEY);

      if (state?.lastReportDate === date) {
        this.completedWeeklyReportDate = date;
        return;
      }

      const since = state?.lastSentAt
        ? new Date(state.lastSentAt)
        : new Date(now.getTime() - WEEK_MS);

      // Günlük rapor kapalı olduğu için gönderilenler de haftalıkta tek tek listelenir.
      const report = await buildReport(since, now, {
        heading: "Haftalık gönderim raporu",
        includeSentList: true,
      });

      await this.emailService.send({
        to: recipients.join("; "),
        subject: `Haftalık gönderim raporu (${formatIstanbul(since).split(" ")[0]} - ${formatIstanbul(now).split(" ")[0]}) - ${subjectCounts(report.emailReport, report.whatsappReport, report.includeWhatsApp)}`,
        text: report.text,
        html: report.html,
      });

      await this.saveState(WEEKLY_SETTING_KEY, {
        lastSentAt: now.toISOString(),
        lastReportDate: date,
      }, "Haftalık gönderim raporunun son gönderim bilgisi");
      this.completedWeeklyReportDate = date;
      console.log("Weekly email report sent.");
    } catch (error) {
      console.error("Weekly email report could not be sent.", error);
    }
  }

  private async loadState(key: string): Promise<ReportState | null> {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    return (setting?.value ?? null) as ReportState | null;
  }

  private async saveState(
    key: string,
    state: ReportState,
    description: string,
  ): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: { ...state },
        description,
      },
      update: { value: { ...state } },
    });
  }
}
