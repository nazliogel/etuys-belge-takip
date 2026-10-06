import { prisma } from "../config/env.js";
import { EmailService } from "./email.service.js";

const SETTING_KEY = "dailyEmailReport.state";
const REPORT_HOUR = 8; // İstanbul saatiyle bu saatten sonraki ilk turda gönderilir
const CONSULTANT_FAILURE_MONTH_OFFSET = 100; // repository'deki değerle aynı olmalı

/** Günlük raporun gideceği adresler (.env: DAILY_REPORT_EMAIL, virgülle ayrılmış) */
function getReportRecipients(): string[] {
  return (process.env.DAILY_REPORT_EMAIL ?? "")
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter(Boolean);
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
function suggestAction(errorMessage: string | null): string {
  const message = (errorMessage ?? "").toLocaleLowerCase("tr-TR");

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
    recipient: reminder.recipient,
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

export class DailyEmailReportService {
  private isRunning = false;
  private completedReportDate?: string;
  constructor(private readonly emailService = new EmailService()) {}

  async runIfDue(now: Date = new Date()): Promise<void> {
    if (this.isRunning) return;

    const { date, hour, weekday } = getIstanbulParts(now);

    if (this.completedReportDate === date) return;

    if (weekday === "Sat" || weekday === "Sun" || hour < REPORT_HOUR) return;

    const recipients = getReportRecipients();
    if (recipients.length === 0) return;

    this.isRunning = true;

    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY },
      });
      const state = (setting?.value ?? null) as ReportState | null;

      if (state?.lastReportDate === date) {
        this.completedReportDate = date;
        return;
      }

      // İlk kurulum: geçmişe dönük rapor gönderilmez.
      // Bugünün başlangıcı kaydedilir; ilk rapor yarın sabah bugünü kapsar.
      if (!state?.lastSentAt) {
        await this.saveState({
          lastSentAt: new Date(`${date}T00:00:00+03:00`).toISOString(),
          lastReportDate: date,
        });
        this.completedReportDate = date;
        console.log(
          "Daily email report initialized; first report will be sent next weekday.",
        );
        return;
      }

      const since = new Date(state.lastSentAt);

      const period = { gte: since, lt: now };
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
      };

      const [
        docSent,
        docFailed,
        docSkipped,
        docRetrying,
        docPending,
        docNotifications,
        authSent,
        authFailed,
        authSkipped,
        authRetrying,
        authPending,
      ] = await Promise.all([
        prisma.documentReminder.findMany({
          where: { channel: "EMAIL", status: "SENT", sentAt: period },
          include: withCompany,
          orderBy: { sentAt: "asc" },
        }),
        prisma.documentReminder.findMany({
          where: { channel: "EMAIL", status: "FAILED", attemptedAt: period },
          include: withCompany,
          orderBy: { attemptedAt: "asc" },
        }),
        prisma.documentReminder.findMany({
          where: { channel: "EMAIL", status: "SKIPPED", attemptedAt: period },
          include: withCompany,
          orderBy: { attemptedAt: "asc" },
        }),
        prisma.documentReminder.findMany({
          where: {
            channel: "EMAIL",
            status: "PENDING",
            errorMessage: { startsWith: "[deneme" },
          },
          include: withCompany,
          orderBy: { attemptedAt: "asc" },
        }),
        prisma.documentReminder.count({
          where: { channel: "EMAIL", status: "PENDING" },
        }),
        // Bu dönemde oluşturulan danışman/admin bildirimleri
        prisma.documentReminder.findMany({
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
        }),

        prisma.companyAuthorizationReminder.findMany({
          where: { channel: "EMAIL", status: "SENT", sentAt: period },
          include: withCompany,
          orderBy: { sentAt: "asc" },
        }),
        prisma.companyAuthorizationReminder.findMany({
          where: { channel: "EMAIL", status: "FAILED", attemptedAt: period },
          include: withCompany,
          orderBy: { attemptedAt: "asc" },
        }),
        prisma.companyAuthorizationReminder.findMany({
          where: { channel: "EMAIL", status: "SKIPPED", attemptedAt: period },
          include: withCompany,
          orderBy: { attemptedAt: "asc" },
        }),
        prisma.companyAuthorizationReminder.findMany({
          where: {
            channel: "EMAIL",
            status: "PENDING",
            errorMessage: { startsWith: "[deneme" },
          },
          include: withCompany,
          orderBy: { attemptedAt: "asc" },
        }),
        prisma.companyAuthorizationReminder.count({
          where: { channel: "EMAIL", status: "PENDING" },
        }),
      ]);

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

      const sentNotification = (r: DocumentReminderLike): string => {
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
            r.reminderMonth + CONSULTANT_FAILURE_MONTH_OFFSET,
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

      const sentRows = [
        ...docSent.map((r) =>
          toRow(documentKind(r.type), r, r.sentAt, sentNotification(r), ""),
        ),
        ...authSent.map((r) =>
          toRow("Yetkilendirme", r, r.sentAt, AUTH_NOTIFICATION, ""),
        ),
      ];

      const failedRows = [
        ...docFailed.map((r) =>
          toRow(
            documentKind(r.type),
            r,
            r.attemptedAt,
            failedNotification(r),
            `Sebep: ${r.errorMessage ?? "-"} → ${suggestAction(r.errorMessage)}`,
          ),
        ),
        ...authFailed.map((r) =>
          toRow(
            "Yetkilendirme",
            r,
            r.attemptedAt,
            AUTH_NOTIFICATION,
            `Sebep: ${r.errorMessage ?? "-"} → ${suggestAction(r.errorMessage)}`,
          ),
        ),
      ];

      const skippedRows = [
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
      ];

      const retryingRows = [
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
      ];

      const count = (rows: ReportRow[], kind: string) =>
        rows.filter((row) => row.kind === kind).length;

      const periodText = `${formatIstanbul(since)} - ${formatIstanbul(now)}`;

      const summaryLines = [
        `Dönem: ${periodText}`,
        `Gönderilen: ${sentRows.length} (Kapatma: ${count(sentRows, "Kapatma")}, Süre uzatma: ${count(sentRows, "Süre uzatma")}, Yetkilendirme: ${count(sentRows, "Yetkilendirme")})`,
        `Gönderilemeyen: ${failedRows.length}`,
        `Atlanan: ${skippedRows.length}`,
        `Tekrar denenecek: ${retryingRows.length}`,
        `Kuyrukta bekleyen: ${docPending + authPending} (Belge: ${docPending}, Yetkilendirme: ${authPending})`,
      ];

      const html = `
        <div style="font-family:Arial,sans-serif">
          <h2 style="margin:0 0 12px">Günlük mail gönderim raporu</h2>
          <p>${summaryLines.map(escapeHtml).join("<br>")}</p>
          ${failedRows.length > 0 ? `<p style="color:#b00020"><strong>Dikkat:</strong> ${failedRows.length} mail gönderilemedi, aşağıdaki işlemlerin yapılması gerekiyor.</p>` : ""}
          ${renderTable("Gönderilemeyenler", "Sebep ve yapılması gereken", failedRows)}
          ${renderTable("Tekrar denenecekler", "Durum", retryingRows)}
          ${renderTable("Atlananlar", "Sebep", skippedRows)}
          ${renderTable("Gönderilenler", null, sentRows)}
        </div>`;

      const text = [
        "Günlük mail gönderim raporu",
        "",
        ...summaryLines,
        renderText("GÖNDERİLEMEYENLER", failedRows, true),
        renderText("TEKRAR DENENECEKLER", retryingRows, true),
        renderText("ATLANANLAR", skippedRows, true),
        renderText("GÖNDERİLENLER", sentRows, false),
      ].join("\n");

      await this.emailService.send({
        to: recipients.join("; "),
        subject: `Mail gönderim raporu: ${sentRows.length} gönderildi, ${failedRows.length} gönderilemedi`,
        text,
        html,
      });

      const newState: ReportState = {
        lastSentAt: now.toISOString(),
        lastReportDate: date,
      };

      await this.saveState(newState);
      this.completedReportDate = date;
      console.log(
        `Daily email report sent: ${sentRows.length} sent, ${failedRows.length} failed, ${skippedRows.length} skipped.`,
      );
    } catch (error) {
      console.error("Daily email report could not be sent.", error);
    } finally {
      this.isRunning = false;
    }
  }
  private async saveState(state: ReportState): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: {
        key: SETTING_KEY,
        value: { ...state },
        description: "Günlük mail gönderim raporunun son gönderim bilgisi",
      },
      update: { value: { ...state } },
    });
  }
}
