export const MAX_EMAIL_ATTEMPTS = 3;
export const EMAIL_RETRY_DELAY_MINUTES = 15;

const TRANSIENT_CODES = [
  "ETIMEDOUT",
  "ECONNRESET",
  "EPIPE",
  "ECONNREFUSED",
  "ECONNECTION",
  "ESOCKET",
  "EAI_AGAIN",
];

const TRANSIENT_PATTERNS = [
  /timeout/i,
  /ECONNRESET/,
  /EPIPE/,
  /connection closed/i,
  /socket hang up/i,
];

/** Bağlantı kopması, zaman aşımı, SMTP 4xx gibi tekrar denendiğinde düzelebilecek hatalar */
export function isTransientEmailError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const { code, responseCode } = error as { code?: string; responseCode?: number };

  if (typeof responseCode === "number") {
    return responseCode >= 400 && responseCode < 500;
  }

  if (code && TRANSIENT_CODES.includes(code)) return true;

  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(error.message));
}

const ATTEMPT_PREFIX = /^\[deneme (\d+)\/\d+\] /;

export function getPreviousAttempts(errorMessage?: string | null): number {
  const match = errorMessage?.match(ATTEMPT_PREFIX);
  return match ? Number(match[1]) : 0;
}

export function withAttemptPrefix(attempt: number, message: string): string {
  return `[deneme ${attempt}/${MAX_EMAIL_ATTEMPTS}] ${message.replace(ATTEMPT_PREFIX, "")}`;
}