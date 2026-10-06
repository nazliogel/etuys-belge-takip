import { env, prisma } from "../config/env.js";
import { parseEmailRecipients } from "./email-recipients.js";

/** Repository'deki "gönderilemedi" bildirimi farkıyla aynı olmalı */
const FAILURE_MONTH_OFFSET = 100;
const ADDRESS_ERROR_PATTERNS = ["geçerli bir e-posta", "kabul edilmedi"];
const DAY_MS = 24 * 60 * 60 * 1000;

type IssueStatus = "SENT" | "QUEUED" | "SKIPPED" | "FIXED" | "OPEN";

const STATUS_LABEL: Record<IssueStatus, string> = {
  SENT: "✅ Çözüldü: mail gönderildi",
  QUEUED: "✅ Çözüldü: mail gönderilecek",
  SKIPPED: "✅ Gerek kalmadı",
  FIXED: "🔄 Düzeltildi, mail tekrar kuyruğa alınmalı",
  OPEN: "⏳ Bekliyor",
};

interface Issue {
  consultantName: string;
  companyName: string;
  kind: string;
  notifiedAt: Date | null;
  status: IssueStatus;
  detail: string;
}

type CompanyState = {
  name: string;
  consultantUser: {
    id: number;
    firstName: string;
    lastName: string;
    isActive: boolean;
  } | null;
  identity: { investorAddress: string | null } | null;
  contacts: { email: string }[];
};

type EmailState = { status: string; recipient: string };

const companySelect = {
  select: {
    name: true as const,
    consultantUser: {
      select: {
        id: true as const,
        firstName: true as const,
        lastName: true as const,
        isActive: true as const,
      },
    },
    identity: { select: { investorAddress: true as const } },
    contacts: {
      orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
      take: 1,
      select: { email: true as const },
    },
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
}

function emailMonth(notificationMonth: number): number {
  // Eski bildirimler fark olmadan, yenileri +100 ile kaydedildi
  return notificationMonth >= FAILURE_MONTH_OFFSET / 2
    ? notificationMonth - FAILURE_MONTH_OFFSET
    : notificationMonth;
}

function key(id: number, type: string, targetDate: Date, month: number): string {
  return `${id}|${type}|${targetDate.toISOString()}|${month}`;
}

/** Bildirime konu olan sorun şu an çözülmüş mü? */
function evaluate(params: {
  company: CompanyState;
  needsClosureData: boolean;
  documentNumber?: string | null;
  notificationMessage: string;
  email?: EmailState;
}): { status: IssueStatus; detail: string } {
  const { company, email } = params;

  if (email?.status === "SENT") {
    return { status: "SENT", detail: "Mail firmaya ulaştı." };
  }
  if (email?.status === "SKIPPED") {
    return { status: "SKIPPED", detail: "Koşullar değişti, mail gerekmedi." };
  }
  if (email?.status === "PENDING") {
    return { status: "QUEUED", detail: "Mail kuyrukta, sırası gelince gidecek." };
  }

  const problems: string[] = [];
  const contact = company.contacts[0];

  if (!contact) {
    problems.push("İletişim kaydı yok");
  } else if (parseEmailRecipients(contact.email).length === 0) {
    problems.push(`Geçersiz e-posta: "${contact.email}"`);
  }

  if (params.needsClosureData) {
    if (!params.documentNumber?.trim()) problems.push("Belge numarası yok");
    if (!company.identity?.investorAddress?.trim()) problems.push("Firma adresi yok");
  }

  if (problems.length > 0) {
    return { status: "OPEN", detail: `Hâlâ eksik: ${problems.join(", ")}` };
  }

  const message = params.notificationMessage.toLocaleLowerCase("tr-TR");
  const wasAddressError = ADDRESS_ERROR_PATTERNS.some((p) => message.includes(p));

  if (wasAddressError && email && contact && contact.email.trim() === email.recipient.trim()) {
    return { status: "OPEN", detail: "Hatalı e-posta adresi henüz değiştirilmedi." };
  }

  if (!email) {
    return { status: "QUEUED", detail: "Bilgiler tamam; sonraki kuyruk turunda gönderilecek." };
  }

  return { status: "FIXED", detail: "Bilgiler tamam; mail tekrar kuyruğa alınmalı." };
}

export async function buildConsultantStatusSection(
  since: Date,
  now: Date,
): Promise<{ html: string; text: string }> {
  try {
    const [docNotifs, authNotifs, docAdmin, authAdmin] = await Promise.all([
      prisma.documentReminder.findMany({
        where: { channel: "CONSULTANT_IN_APP", subject: { contains: "gönderilemedi" } },
        include: { company: companySelect, document: { select: { documentNumber: true } } },
        orderBy: { attemptedAt: "asc" },
      }),
      prisma.companyAuthorizationReminder.findMany({
        where: { channel: "CONSULTANT_IN_APP", subject: { contains: "gönderilemedi" } },
        include: { company: companySelect },
        orderBy: { attemptedAt: "asc" },
      }),
      prisma.documentReminder.findMany({
        where: { channel: "ADMIN_EMAIL" },
        include: { company: companySelect },
        orderBy: { createdAt: "asc" },
      }),
      prisma.companyAuthorizationReminder.findMany({
        where: { channel: "ADMIN_EMAIL" },
        include: { company: companySelect },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Bildirimin ilgili olduğu firma mailinin şu anki durumu
    const docIds = [...new Set(docNotifs.map((n) => n.documentId))];
    const authIds = [...new Set(authNotifs.map((n) => n.authorizationId))];

    const [docEmails, authEmails] = await Promise.all([
      docIds.length > 0
        ? prisma.documentReminder.findMany({
            where: { channel: "EMAIL", documentId: { in: docIds } },
            select: { documentId: true, type: true, targetDate: true, reminderMonth: true, status: true, recipient: true },
          })
        : Promise.resolve([]),
      authIds.length > 0
        ? prisma.companyAuthorizationReminder.findMany({
            where: { channel: "EMAIL", authorizationId: { in: authIds } },
            select: { authorizationId: true, type: true, targetDate: true, reminderMonth: true, status: true, recipient: true },
          })
        : Promise.resolve([]),
    ]);

    const docEmailMap = new Map<string, EmailState>();
    for (const e of docEmails) {
      docEmailMap.set(key(e.documentId, e.type, e.targetDate, e.reminderMonth), e);
    }
    const authEmailMap = new Map<string, EmailState>();
    for (const e of authEmails) {
      authEmailMap.set(key(e.authorizationId, e.type, e.targetDate, e.reminderMonth), e);
    }

    // Bildirimin gittiği danışman (bildirim anındaki)
    const consultantIds = [
      ...new Set(
        [...docNotifs, ...authNotifs]
          .map((n) => Number(n.recipient))
          .filter((id) => Number.isInteger(id)),
      ),
    ];
    const users = await prisma.user.findMany({
      where: { id: { in: consultantIds } },
      select: { id: true, firstName: true, lastName: true, isActive: true },
    });
    const userName = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}${u.isActive ? "" : " (pasif)"}`]),
    );

    // Aynı mail için birden fazla bildirim varsa en sonuncusu esas alınır
    const issues = new Map<string, Issue>();

    for (const n of docNotifs) {
      const month = emailMonth(n.reminderMonth);
      const k = `doc|${key(n.documentId, n.type, n.targetDate, month)}`;
      const result = evaluate({
        company: n.company,
        needsClosureData: n.type === "CLOSURE_APPLICATION",
        documentNumber: n.document.documentNumber,
        notificationMessage: n.message,
        email: docEmailMap.get(key(n.documentId, n.type, n.targetDate, month)),
      });
      issues.set(k, {
        consultantName: userName.get(Number(n.recipient)) ?? "Bilinmiyor",
        companyName: n.company.name,
        kind: n.type === "CLOSURE_APPLICATION" ? "Kapatma" : "Süre uzatma",
        notifiedAt: n.attemptedAt,
        ...result,
      });
    }

    for (const n of authNotifs) {
      const month = emailMonth(n.reminderMonth);
      const k = `auth|${key(n.authorizationId, n.type, n.targetDate, month)}`;
      const result = evaluate({
        company: n.company,
        needsClosureData: false,
        notificationMessage: n.message,
        email: authEmailMap.get(key(n.authorizationId, n.type, n.targetDate, month)),
      });
      issues.set(k, {
        consultantName: userName.get(Number(n.recipient)) ?? "Bilinmiyor",
        companyName: n.company.name,
        kind: "Yetkilendirme",
        notifiedAt: n.attemptedAt,
        ...result,
      });
    }

    const allIssues = [...issues.values()];

    // Danışman bazında özet
    interface Summary {
      total: number;
      newSince: number;
      resolved: number;
      fixed: number;
      open: number;
      oldestOpen: Date | null;
    }
    const summary = new Map<string, Summary>();

    for (const issue of allIssues) {
      const s = summary.get(issue.consultantName) ?? {
        total: 0, newSince: 0, resolved: 0, fixed: 0, open: 0, oldestOpen: null,
      };
      s.total += 1;
      if (issue.notifiedAt && issue.notifiedAt >= since) s.newSince += 1;
      if (issue.status === "OPEN") {
        s.open += 1;
        if (issue.notifiedAt && (!s.oldestOpen || issue.notifiedAt < s.oldestOpen)) {
          s.oldestOpen = issue.notifiedAt;
        }
      } else if (issue.status === "FIXED") {
        s.fixed += 1;
      } else {
        s.resolved += 1;
      }
      summary.set(issue.consultantName, s);
    }

    const summaryRows = [...summary.entries()].sort((a, b) => b[1].open - a[1].open);
    const pendingIssues = allIssues
      .filter((i) => i.status === "OPEN" || i.status === "FIXED")
      .sort((a, b) => (a.notifiedAt?.getTime() ?? 0) - (b.notifiedAt?.getTime() ?? 0));

    // Danışmanı olmayan firmalar (ADMIN_FALLBACK_EMAIL'e bildirilenler)
    const adminCompanies = new Map<string, { notifiedAt: Date; company: CompanyState }>();
    for (const a of [...docAdmin, ...authAdmin]) {
      adminCompanies.set(a.company.name, { notifiedAt: a.createdAt, company: a.company });
    }
    const adminRows = [...adminCompanies.values()].map(({ notifiedAt, company }) => {
      const consultant = company.consultantUser;
      const assigned = consultant?.isActive === true;
      return {
        companyName: company.name,
        notifiedAt,
        assigned,
        detail: assigned
          ? `Danışman atandı: ${consultant.firstName} ${consultant.lastName}`
          : consultant
            ? `Atanan danışman pasif: ${consultant.firstName} ${consultant.lastName}`
            : "Danışman atanmadı",
      };
    });
    const adminOpen = adminRows.filter((r) => !r.assigned);
    const adminLabel = env.adminFallbackEmail ?? "ADMIN_FALLBACK_EMAIL";

    const daysSince = (date: Date | null) =>
      date ? `${Math.floor((now.getTime() - date.getTime()) / DAY_MS)} gün` : "-";

    // HTML
    const th = (t: string) => `<th style="background:#f0f0f0">${t}</th>`;
    const td = (t: string) => `<td>${escapeHtml(t)}</td>`;

    const html = `
      <h3 style="margin:24px 0 8px">Danışman durumu</h3>
      ${
        summaryRows.length === 0
          ? "<p>Danışmanlara giden \"gönderilemedi\" bildirimi yok.</p>"
          : `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
          <tr>${["Danışman", "Bildirim (toplam)", "Yeni", "Çözüldü", "Düzeltildi, gönderilmeli", "Bekliyor", "En eski bekleyen"].map(th).join("")}</tr>
          ${summaryRows
            .map(([name, s]) => `<tr>${td(name)}${td(String(s.total))}${td(String(s.newSince))}${td(String(s.resolved))}${td(String(s.fixed))}${td(String(s.open))}${td(s.open > 0 ? daysSince(s.oldestOpen) : "-")}</tr>`)
            .join("")}
        </table>`
      }
      ${
        pendingIssues.length === 0
          ? ""
          : `<h4 style="margin:16px 0 8px">Bekleyen ve düzeltilmiş sorunlar (${pendingIssues.length})</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
          <tr>${["Danışman", "Firma", "Tür", "Bildirim", "Durum", "Açıklama"].map(th).join("")}</tr>
          ${pendingIssues
            .map((i) => `<tr>${td(i.consultantName)}${td(i.companyName)}${td(i.kind)}${td(`${formatDate(i.notifiedAt)} (${daysSince(i.notifiedAt)})`)}${td(STATUS_LABEL[i.status])}${td(i.detail)}</tr>`)
            .join("")}
        </table>`
      }
      ${
        adminRows.length === 0
          ? ""
          : `<h4 style="margin:16px 0 8px">Danışmanı olmayan firmalar (bildirim: ${escapeHtml(adminLabel)}): ${adminRows.length - adminOpen.length}/${adminRows.length} çözüldü</h4>
        ${
          adminOpen.length === 0
            ? "<p>Hepsine danışman atanmış.</p>"
            : `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px">
          <tr>${["Firma", "Bildirim", "Durum"].map(th).join("")}</tr>
          ${adminOpen
            .map((r) => `<tr>${td(r.companyName)}${td(`${formatDate(r.notifiedAt)} (${daysSince(r.notifiedAt)})`)}${td(r.detail)}</tr>`)
            .join("")}
        </table>`
        }`
      }`;

    // Düz metin
    const text = [
      "\nDANIŞMAN DURUMU",
      ...(summaryRows.length === 0
        ? ["Danışmanlara giden \"gönderilemedi\" bildirimi yok."]
        : summaryRows.map(
            ([name, s]) =>
              `- ${name}: ${s.total} bildirim (yeni ${s.newSince}), çözüldü ${s.resolved}, düzeltildi/gönderilmeli ${s.fixed}, bekliyor ${s.open}` +
              (s.open > 0 ? ` (en eski ${daysSince(s.oldestOpen)})` : ""),
          )),
      ...(pendingIssues.length === 0
        ? []
        : [
            `\nBekleyen ve düzeltilmiş sorunlar (${pendingIssues.length})`,
            ...pendingIssues.map(
              (i, index) =>
                `${index + 1}. ${i.consultantName} | ${i.companyName} | ${i.kind} | ${formatDate(i.notifiedAt)}\n   ${STATUS_LABEL[i.status]}: ${i.detail}`,
            ),
          ]),
      ...(adminRows.length === 0
        ? []
        : [
            `\nDanışmanı olmayan firmalar (bildirim: ${adminLabel}): ${adminRows.length - adminOpen.length}/${adminRows.length} çözüldü`,
            ...adminOpen.map((r) => `- ${r.companyName} | ${formatDate(r.notifiedAt)} | ${r.detail}`),
          ]),
    ].join("\n");

    return { html, text };
  } catch (error) {
    // Bu bölüm hata verse bile günlük rapor gönderilmeye devam eder
    console.error("Consultant status section could not be built.", error);
    return {
      html: "<p><em>Danışman durumu bölümü hazırlanamadı (sistem loglarına bakın).</em></p>",
      text: "\nDANIŞMAN DURUMU: hazırlanamadı (sistem loglarına bakın).",
    };
  }
}