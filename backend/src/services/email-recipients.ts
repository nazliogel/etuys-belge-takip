/**
 * Firma iletişim kaydındaki e-posta alanında birden fazla adres olabiliyor ve
 * yazım şekli tutarsız: "a@x.com; b@x.com", "a@x.com , b@x.com", satır atlamalı,
 * sonda fazladan ayraç, başında/sonunda tırnak ("a@x.com'") gibi.
 *
 * Bu yardımcılar alanı geçerli, tekrarsız adreslerden oluşan bir listeye çevirir.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailRecipients(raw: string | null | undefined): string[] {
  if (!raw) return [];

  const seen = new Set<string>();
  const recipients: string[] = [];

  for (const part of raw.split(/[;,\s]+/)) {
    const cleaned = part
      .trim()
      .replace(/^[<"'`(]+/, "")
      .replace(/[>"'`).]+$/, "");

    if (!EMAIL_PATTERN.test(cleaned)) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    recipients.push(cleaned);
  }

  return recipients;
}

/** SMTP sunucusu alıcılardan en az birini kabul ettiyse true döner. */
export function isAnyRecipientAccepted(
  recipients: string[],
  accepted: unknown[],
): boolean {
  const acceptedSet = new Set(
    accepted.map((address) => String(address).trim().toLowerCase()),
  );

  return recipients.some((recipient) =>
    acceptedSet.has(recipient.toLowerCase()),
  );
}