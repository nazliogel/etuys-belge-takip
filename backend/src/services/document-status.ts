// src/services/document-status.ts

export type DisplayStatus =
  | "CLOSED"
  | "CANCELLED"
  | "INACTIVE"
  | "AUTHORIZATION_EXPIRED"
  | "CLOSURE_ELIGIBLE"
  | "EXTENSION_ELIGIBLE"
  | "EXPIRED"
  | "EXPIRING"
  | "ACTIVE";

/** Süre uzatma müracaatı belge bitişinden kaç ay önce başlar */
export const EXTENSION_APPLICATION_MONTHS = 6;
/** Bitişe kaç ay kala "Süresi Yaklaşıyor" sayılır */
export const EXPIRING_WINDOW_MONTHS = 6;

/** "YYYY-MM-DD" biçiminde takvim günü */
export type DateOnly = string;

export type DocumentStatusInput = {
  status: "OPEN" | "CLOSED" | "CANCELLED";
  isActive: boolean;
  documentEndDate: Date | null;
  extensionDate: Date | null;
  authorizationEndDate: Date | null;
};

export type DocumentStatusResult = {
  displayStatus: DisplayStatus;
  isExtended: boolean;
  effectiveEndDate: DateOnly | null;
  extensionApplicationStartDate: DateOnly | null;
  closureApplicationStartDate: DateOnly | null;
};

/** Europe/Istanbul takvimine göre bugünün tarihi (sunucunun saat diliminden bağımsız) */
export function todayInIstanbul(now: Date = new Date()): DateOnly {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Prisma @db.Date alanları UTC gece yarısı döner; takvim gününü alır */
export function toDateOnly(date: Date | null | undefined): DateOnly | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/** Ay ekler/çıkarır; hedef ayda o gün yoksa ayın son gününe sabitler (31 Ağu - 6 ay = 28/29 Şub) */
export function addMonths(date: DateOnly, months: number): DateOnly {
  const [year, month, day] = date.split("-").map(Number);
  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths - targetYear * 12; // 0-11
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const targetDay = Math.min(day, lastDay);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

export function computeDocumentStatus(
  input: DocumentStatusInput,
  today: DateOnly,
): DocumentStatusResult {
  const endDate = toDateOnly(input.documentEndDate);
  const extensionDate = toDateOnly(input.extensionDate);

  // Tarihler farklıysa uzatma yapılmıştır; eşitse yapılmamıştır.
  const isExtended =
    endDate !== null && extensionDate !== null && endDate !== extensionDate;

  const effectiveEndDate = isExtended
    ? extensionDate
    : (endDate ?? extensionDate);

  const extensionApplicationStartDate =
    endDate !== null && extensionDate !== null && !isExtended
      ? addMonths(endDate, -EXTENSION_APPLICATION_MONTHS)
      : null;

  const closureApplicationStartDate = isExtended
    ? addMonths(extensionDate!, -EXTENSION_APPLICATION_MONTHS)
    : null;

  const result = (displayStatus: DisplayStatus): DocumentStatusResult => ({
    displayStatus,
    isExtended,
    effectiveEndDate,
    extensionApplicationStartDate,
    closureApplicationStartDate,
  });

  // 1) Kalıcı durumlar
  if (input.status === "CANCELLED") return result("CANCELLED");
  if (input.status === "CLOSED") return result("CLOSED");
  if (!input.isActive) return result("INACTIVE");

  // 2) Firma yetkisi
  const authorizationEndDate = toDateOnly(input.authorizationEndDate);
  if (!authorizationEndDate || authorizationEndDate < today) {
    return result("AUTHORIZATION_EXPIRED");
  }

  // 3) Kapatma: uzatılmış ve uzatılan süre geçmiş
  if (isExtended && extensionDate! < today) return result("CLOSURE_ELIGIBLE");

  // 4) Süre uzatma: uzatılmamış ve müracaat dönemi başlamış
  if (extensionApplicationStartDate && today >= extensionApplicationStartDate) {
    return result("EXTENSION_ELIGIBLE");
  }

  // 5) Tarihe bağlı durumlar
  if (!effectiveEndDate) return result("ACTIVE");
  if (effectiveEndDate < today) return result("EXPIRED");
  if (effectiveEndDate <= addMonths(today, EXPIRING_WINDOW_MONTHS)) {
    return result("EXPIRING");
  }
  return result("ACTIVE");
}
