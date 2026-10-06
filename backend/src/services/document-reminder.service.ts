import { CompanyRequestRepository } from "../repositories/company-request.repository.js";
import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";

type ReminderType = "EXTENSION_APPLICATION" | "CLOSURE_APPLICATION";

interface ReminderDecision {
  type: ReminderType;
  targetDate: Date;
  reminderMonth: number;
}

export function normalizeDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function isSameDate(first: Date, second: Date): boolean {
  return normalizeDate(first).getTime() === normalizeDate(second).getTime();
}

function subtractMonthsClamped(date: Date, months: number): Date {
  const normalized = normalizeDate(date);

  const firstDayOfTargetMonth = new Date(
    Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth() - months, 1),
  );

  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstDayOfTargetMonth.getUTCFullYear(),
      firstDayOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      firstDayOfTargetMonth.getUTCFullYear(),
      firstDayOfTargetMonth.getUTCMonth(),
      Math.min(normalized.getUTCDate(), lastDayOfTargetMonth),
    ),
  );
}
/** Süre uzatma hatırlatma mailinin, bitiş tarihinden kaç ay önce başlayacağı */
export const EXTENSION_REMINDER_WINDOW_MONTHS = 2;

/** Belge bitişinden sonra tanınan ilave süre uzatım hakkı (1,5 yıl) */
export const EXTENSION_RIGHT_MONTHS = 18;

/** Süre uzatım hakkının son günü = süre uzatım tarihi + 18 ay */
export function getExtensionRightDeadline(extensionDate: Date): Date {
  return subtractMonthsClamped(extensionDate, -EXTENSION_RIGHT_MONTHS);
}

export function resolveReminderMonth(
  targetDate: Date,
  today: Date,
  windowMonths: number = EXTENSION_REMINDER_WINDOW_MONTHS,
): number | null {
  const normalizedTarget = normalizeDate(targetDate);
  const normalizedToday = normalizeDate(today);
  // Bitiş tarihinden önceki son windowMonths aylık dönem.
  // Belge bildirimleri varsayılanı (2 ay) kullanır, yetki bildirimleri 6 ay verir.
  if (normalizedToday < normalizedTarget) {
    for (let month = windowMonths; month >= 1; month -= 1) {
      const periodStart = subtractMonthsClamped(normalizedTarget, month);
      const periodEnd = subtractMonthsClamped(normalizedTarget, month - 1);

      if (normalizedToday >= periodStart && normalizedToday < periodEnd) {
        return month;
      }
    }

    return null;
  }

  // Bitiş tarihi ve sonrasındaki her ay için farklı bir değer üretir.
  // Bitiş ayı: 0, sonraki aylar: -1, -2, -3...
  let elapsedMonths =
    (normalizedToday.getUTCFullYear() - normalizedTarget.getUTCFullYear()) *
      12 +
    normalizedToday.getUTCMonth() -
    normalizedTarget.getUTCMonth();

  const currentPeriodStart = subtractMonthsClamped(
    normalizedTarget,
    -elapsedMonths,
  );

  if (normalizedToday < currentPeriodStart) {
    elapsedMonths -= 1;
  }

  return -Math.max(elapsedMonths, 0);
}

export function resolveReminderDecision(
  documentEndDate: Date,
  extensionDate: Date,
  today: Date = new Date(),
): ReminderDecision | null {
  const normalizedDocumentEndDate = normalizeDate(documentEndDate);
  const normalizedExtensionDate = normalizeDate(extensionDate);
  const normalizedToday = normalizeDate(today);

  const isExtensionApplication = isSameDate(
    normalizedDocumentEndDate,
    normalizedExtensionDate,
  );

  if (isExtensionApplication) {
    // YENİ: Süre uzatım hakkının son günü = uzatım tarihi + 18 ay
    const extensionRightDeadline = getExtensionRightDeadline(
      normalizedExtensionDate,
    );

    // 18 ay dolmamışsa: süre uzatma maili (bitişten önceki son 2 ay + bitişten sonra her ay)
    if (normalizedToday <= extensionRightDeadline) {
      const reminderMonth = resolveReminderMonth(
        normalizedDocumentEndDate,
        normalizedToday,
      );

      if (reminderMonth === null) {
        return null;
      }

      return {
        type: "EXTENSION_APPLICATION",
        targetDate: normalizedDocumentEndDate,
        reminderMonth,
      };
    }

    // YENİ: 18 ay dolmuşsa uzatma hakkı kalmadı → sadece kapatma maili
    const reminderMonth = resolveReminderMonth(
      extensionRightDeadline,
      normalizedToday,
    );

    if (reminderMonth === null) {
      return null;
    }

    return {
      type: "CLOSURE_APPLICATION",
      targetDate: normalizedExtensionDate,
      reminderMonth,
    };
  }

  // Kapatma için iki tarihin de bugünden eski olması gerekir.
  const isClosureApplicationDue =
    normalizedDocumentEndDate < normalizedToday &&
    normalizedExtensionDate < normalizedToday;

  if (!isClosureApplicationDue) {
    return null;
  }

  const reminderMonth = resolveReminderMonth(
    normalizedExtensionDate,
    normalizedToday,
  );

  if (reminderMonth === null) {
    return null;
  }

  return {
    type: "CLOSURE_APPLICATION",
    targetDate: normalizedExtensionDate,
    reminderMonth,
  };
}

export class DocumentReminderService {
  constructor(
    private readonly repository = new DocumentReminderRepository(),
    private readonly companyRequestRepository = new CompanyRequestRepository(),
  ) {}

  async findDueCandidates(today: Date = new Date()) {
    const documents = await this.repository.findActiveCandidates();
    const candidates = [];

    for (const document of documents) {
      if (!document.documentEndDate || !document.extensionDate) {
        continue;
      }

      const decision = resolveReminderDecision(
        document.documentEndDate,
        document.extensionDate,
        today,
      );

      if (!decision) {
        continue;
      }

      // Yetki kontrolü hem süre uzatma hem kapatma maili için geçerlidir.
      const authorizationEndDate =
        document.company.authorization?.authorizationEndDate ?? null;

      const hasValidAuthorization =
        authorizationEndDate !== null &&
        normalizeDate(authorizationEndDate) >= normalizeDate(today);

      // Yetki süresi dolmuş olsa da bildirim gönderilir;
      // e-postaya yetkilendirme bilgilendirmesi eklenir.
      const authorizationExpired = !hasValidAuthorization;

      const closureRequest =
        await this.companyRequestRepository.findLatestClosureRequest({
          companyId: document.companyId,
          externalDocumentId: document.externalDocumentId,
        });

      // Herhangi bir kapatma başvurusu varsa süre uzatma maili gönderilmez.
      if (decision.type === "EXTENSION_APPLICATION" && closureRequest) {
        continue;
      }

      if (decision.type === "CLOSURE_APPLICATION") {
        const requestStatus = closureRequest?.requestStatus
          ?.trim()
          .toLocaleUpperCase("tr-TR");

        // Kapatma maili, başvuru yoksa veya son başvuru reddedildiyse gönderilir.
        if (closureRequest && requestStatus !== "REDDEDİLDİ") {
          continue;
        }
      }

      const contact = document.company.contacts[0];

      candidates.push({
        document,
        company: document.company,
        contact,
        decision,
        authorizationExpired,
      });
    }

    return candidates;
  }
}
