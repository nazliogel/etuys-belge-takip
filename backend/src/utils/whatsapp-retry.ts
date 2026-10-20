/**
 * WhatsApp yeniden deneme kuralları.
 * Deneme sayısı, bekleme süresi ve "[deneme 2/3]" öneki mail ile birebir aynıdır
 * (email-retry.ts'deki sabitler ve fonksiyonlar kullanılır). Yalnızca "hangi hata
 * geçicidir" tanımı WhatsApp'a özeldir.
 */
import {
  EMAIL_RETRY_DELAY_MINUTES,
  MAX_EMAIL_ATTEMPTS,
} from "./email-retry.js";

export { getPreviousAttempts, withAttemptPrefix } from "./email-retry.js";

export const MAX_WHATSAPP_ATTEMPTS = MAX_EMAIL_ATTEMPTS;
export const WHATSAPP_RETRY_DELAY_MINUTES = EMAIL_RETRY_DELAY_MINUTES;

/** Kapso/Meta API'sinden dönen hata. HTTP durumu ve Meta hata kodu ayrı tutulur. */
export class WhatsAppApiError extends Error {
  readonly httpStatus?: number;
  readonly metaCode?: number;
  readonly metaSubcode?: number;

  constructor(
    message: string,
    details: { httpStatus?: number; metaCode?: number; metaSubcode?: number } = {},
  ) {
    super(message);
    this.name = "WhatsAppApiError";
    this.httpStatus = details.httpStatus;
    this.metaCode = details.metaCode;
    this.metaSubcode = details.metaSubcode;
  }
}

/**
 * Meta'nın "geçici sorun / hız sınırı" hata kodları. Bunlar bir süre sonra
 * tekrar denendiğinde düzelebilir.
 * 1, 2: API geçici hatası · 4, 80007, 130429: hız sınırı ·
 * 131000: genel geçici hata · 131016, 133004: servis geçici olarak kullanılamıyor ·
 * 131048: spam hız sınırı · 131056: aynı numaraya çok sık mesaj
 */
const TRANSIENT_META_CODES = new Set([
  1, 2, 4, 80007, 130429, 131000, 131016, 131048, 131056, 133004,
]);

const TRANSIENT_NETWORK_CODES = [
  "ETIMEDOUT",
  "ECONNRESET",
  "EPIPE",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
];

const TRANSIENT_PATTERNS = [
  /timeout/i,
  /fetch failed/i,
  /ECONNRESET/,
  /socket hang up/i,
  /connection closed/i,
];

/**
 * Zaman aşımı, bağlantı hatası, HTTP 5xx/429 ve Meta'nın geçici hata kodları
 * geçici sayılır. Diğer API hataları (geçersiz numara, şablon hatası vb.) kalıcıdır.
 */
export function isTransientWhatsAppError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { name } = error as { name?: string };

  // AbortSignal.timeout(...) süresi dolunca "TimeoutError" fırlatır.
  if (name === "TimeoutError" || name === "AbortError") return true;

  if (error instanceof WhatsAppApiError) {
    if (
      error.metaCode !== undefined &&
      TRANSIENT_META_CODES.has(error.metaCode)
    ) {
      return true;
    }

    if (error.httpStatus !== undefined) {
      return error.httpStatus === 429 || error.httpStatus >= 500;
    }

    return false;
  }

  if (!(error instanceof Error)) return false;

  // fetch bağlantı hatalarında asıl kod "cause" içinde gelir.
  const code = (error as { code?: string }).code;
  const causeCode = (error as { cause?: { code?: string } }).cause?.code;

  if (code && TRANSIENT_NETWORK_CODES.includes(code)) return true;
  if (causeCode && TRANSIENT_NETWORK_CODES.includes(causeCode)) return true;

  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(error.message));
}

/**
 * YENİ: Birden fazla numaraya gönderimde HİÇBİRİ gitmediyse fırlatılacak hata.
 * - Numaralardan en az birinde geçici hata varsa geçici hata döner; kayıt
 *   tekrar denenir (hiçbir numaraya gitmediği için çift mesaj riski yoktur).
 * - Hepsi kalıcı hataysa, bütün numaraların hatalarını içeren kalıcı hata döner.
 */
export function combineRecipientErrors(
  failed: Array<{ to: string; error: unknown }>,
): unknown {
  const describe = (item: { to: string; error: unknown }) =>
    `${item.to}: ${item.error instanceof Error ? item.error.message : String(item.error)}`;

  const transient = failed.find((item) => isTransientWhatsAppError(item.error));

  if (transient) {
    if (transient.error instanceof Error && failed.length > 1) {
      transient.error.message = failed.map(describe).join(" | ");
    }
    return transient.error;
  }

  return new Error(failed.map(describe).join(" | "));
}