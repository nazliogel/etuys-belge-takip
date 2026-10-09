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

function renderTable(
  title: string,
  detailHeader: string | null,
  rows: ReportRow[],
): string {
  if (rows.length === 0) return "";

  const headers = [
    "Tür",
    "Firma",
    "Danışman",
    "Alıcı",
    "Zaman",
    "Danışman bildirimi",
    ...(detailHeader ? [detailHeader] : []),
  ];

  return `
    <h3 style="margin:24px 0 8px">${escapeHtml(title)} (${rows.length})</h3>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
      <tr>${headers.map((header) => `<th style="background:#f0f0f0">${header}</th>`).join("")}</tr>
      ${rows
        .map(
          (row) => `<tr>
            <td>${escapeHtml(row.kind)}</td>
            <td>${escapeHtml(row.companyName)}</td>
            <td>${escapeHtml(row.consultant)}</td>
            <td>${escapeHtml(row.recipient)}</td>
            <td>${escapeHtml(formatIstanbul(row.time))}</td>
            <td>${escapeHtml(row.notification)}</td>
            ${detailHeader ? `<td>${escapeHtml(row.detail)}</td>` : ""}
          </tr>`,
        )
        .join("")}
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
      findNotification(r, r.reminderMonth + failureOffset, "CONSULTANT_IN_APP")
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

  const html = `
    ${options.title ? `<h2 style="margin:32px 0 12px">${escapeHtml(options.title)}</h2>` : ""}
    <p>${summary.map(escapeHtml).join("<br>")}</p>
    ${report.failedRows.length > 0 ? `<p style="color:#b00020"><strong>Dikkat:</strong> ${report.failedRows.length} ${noun} gönderilemedi, aşağıdaki işlemlerin yapılması gerekiyor.</p>` : ""}
    ${renderTable(`${options.label} - Gönderilemeyenler`, "Sebep ve yapılması gereken", report.failedRows)}
    ${renderTable(`${options.label} - Tekrar denenecekler`, "Durum", report.retryingRows)}
    ${renderTable(`${options.label} - Atlananlar`, "Sebep", report.skippedRows)}
    ${options.includeSentList ? renderTable(`${options.label} - Gönderilenler`, null, report.sentRows) : ""}`;

  const text = [
    ...(options.title ? ["", options.title.toLocaleUpperCase("tr-TR")] : []),
    ...summary,
    renderText(
      `${options.label.toLocaleUpperCase("tr-TR")} - GÖNDERİLEMEYENLER`,
      report.failedRows,
      true,
    ),
    renderText(
      `${options.label.toLocaleUpperCase("tr-TR")} - TEKRAR DENENECEKLER`,
      report.retryingRows,
      true,
    ),
    renderText(
      `${options.label.toLocaleUpperCase("tr-TR")} - ATLANANLAR`,
      report.skippedRows,
      true,
    ),
    options.includeSentList
      ? renderText(
          `${options.label.toLocaleUpperCase("tr-TR")} - GÖNDERİLENLER`,
          report.sentRows,
          false,
        )
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
      notificationKey(
        n.documentId,
        n.type,
        n.targetDate,
        n.reminderMonth,
        n.channel,
      ),
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

  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2 style="margin:0 0 12px">${escapeHtml(options.heading)}</h2>
      <p>${escapeHtml(periodText)}</p>
      ${emailPart.html}
      ${consultantSection.html}
      ${whatsappPart?.html ?? ""}
      ${options.includeSentList ? "" : `<p style="color:#666;margin-top:24px">Haftalık raporda gönderilenler tek tek listelenmez; ayrıntılar günlük raporlardadır.</p>`}
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

  /** Zamanlayıcı her turda çağırır: günlük rapor ve (pazartesi) haftalık rapor. */
  async runIfDue(now: Date = new Date()): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      await this.runDailyIfDue(now);
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
        await this.saveState(
          SETTING_KEY,
          {
            lastSentAt: new Date(`${date}T00:00:00+03:00`).toISOString(),
            lastReportDate: date,
          },
          "Günlük mail gönderim raporunun son gönderim bilgisi",
        );
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

      await this.saveState(
        SETTING_KEY,
        {
          lastSentAt: now.toISOString(),
          lastReportDate: date,
        },
        "Günlük mail gönderim raporunun son gönderim bilgisi",
      );
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

      const report = await buildReport(since, now, {
        heading: "Haftalık gönderim raporu",
        includeSentList: false,
      });

      await this.emailService.send({
        to: recipients.join("; "),
        subject: `Haftalık gönderim raporu (${formatIstanbul(since).split(" ")[0]} - ${formatIstanbul(now).split(" ")[0]}) - ${subjectCounts(report.emailReport, report.whatsappReport, report.includeWhatsApp)}`,
        text: report.text,
        html: report.html,
      });

      await this.saveState(
        WEEKLY_SETTING_KEY,
        {
          lastSentAt: now.toISOString(),
          lastReportDate: date,
        },
        "Haftalık gönderim raporunun son gönderim bilgisi",
      );
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
