/**
 * Türkiye saatine göre tarih hesapları.
 * Önceden aynı hesap birçok dosyada ayrı ayrı yazılmıştı; hepsi buradan kullanılır.
 */

const TURKEY_TIME_ZONE = "Europe/Istanbul";
/** Türkiye 2016'dan beri yaz/kış saati uygulamıyor, sabit UTC+3. */
const TURKEY_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Türkiye takvimine göre "bugün", UTC gece yarısı olarak.
 * Veritabanındaki @db.Date alanlarıyla (bitiş tarihi vb.) karşılaştırmak için kullanılır.
 * Örn. 08.10.2026 01:30 (TR) -> 2026-10-08T00:00:00Z
 */
export function getTurkeyDay(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TURKEY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const getPart = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(getPart("year"), getPart("month") - 1, getPart("day")),
  );
}

/**
 * Türkiye'de günün başladığı gerçek an (TR 00:00 = önceki gün 21:00 UTC).
 * Günlük gönderim limitlerini saymak için kullanılır.
 */
export function getTurkeyDayStart(now: Date = new Date()): Date {
  return new Date(getTurkeyDay(now).getTime() - TURKEY_UTC_OFFSET_MS);
}

/** @db.Date alanını gün olarak (UTC gece yarısı) döndürür. */
export function getUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}