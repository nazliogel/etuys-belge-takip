/**
 * Firma iletişim bilgisi kontrolleri (e-posta ve WhatsApp).
 *
 * Mail ve WhatsApp, firmanın BÜTÜN iletişim kayıtlarındaki BÜTÜN adres ve
 * numaralara gider. Aynı adres/numara birden fazla kişide yazılıysa bir kez alınır.
 * Mail ve WhatsApp kuyrukları aynı kontrolleri buradan kullanır.
 */
import { parseEmailRecipients } from "./email-recipients.js";

type ContactEmail = { email: string };
type ContactPhone = { phone: string };

/**
 * Tek bir telefon numarasını WhatsApp formatına (90XXXXXXXXXX) çevirir.
 * Tek numara için kullanılır (ör. WHATSAPP_TEST_RECIPIENT).
 */
export function normalizeWhatsAppRecipient(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // 05XXXXXXXXX → 905XXXXXXXXX
  if (digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  }

  // 5XXXXXXXXX → 905XXXXXXXXX
  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `90${digits}`;
  }

  return digits;
}

export function isValidWhatsAppRecipient(phone: string): boolean {
  return /^[1-9]\d{9,14}$/.test(phone);
}

/**
 * Türkiye cep telefonu: 5XX XXX XX XX (başında 0, 90, +90 veya 0090 olabilir;
 * araya boşluk, nokta, tire girebilir). Sabit hatlar (0212, 0262, 0850 ...)
 * WhatsApp kullanamadığı için eşleşmez.
 */
const TR_MOBILE_PATTERN =
  /(?<!\d)(?:(?:\+|00)?90|0)?[\s\u00a0]*(5\d{2})[\s\u00a0.\-]*(\d{3})[\s\u00a0.\-]*(\d{2})[\s\u00a0.\-]*(\d{2})(?!\d)/g;

/**
 * Tek bir telefon alanındaki bütün cep telefonlarını 905XXXXXXXXX biçiminde döndürür.
 * Alana birden fazla numara yazılmış olabilir (alt alta, boşlukla, tireyle).
 */
export function extractWhatsAppRecipients(phone: string): string[] {
  const recipients: string[] = [];

  for (const match of phone.matchAll(TR_MOBILE_PATTERN)) {
    const recipient = `90${match[1]}${match[2]}${match[3]}${match[4]}`;

    if (!recipients.includes(recipient)) {
      recipients.push(recipient);
    }
  }

  return recipients;
}

/** Firmanın bütün iletişim kayıtlarındaki bütün cep numaraları (tekrarsız). */
export function collectWhatsAppRecipients(contacts: ContactPhone[]): string[] {
  const recipients: string[] = [];

  for (const contact of contacts) {
    for (const recipient of extractWhatsAppRecipients(contact.phone ?? "")) {
      if (!recipients.includes(recipient)) {
        recipients.push(recipient);
      }
    }
  }

  return recipients;
}

/** Firmanın bütün iletişim kayıtlarındaki bütün geçerli e-posta adresleri (tekrarsız). */
export function collectEmailRecipients(contacts: ContactEmail[]): string[] {
  const seen = new Set<string>();
  const recipients: string[] = [];

  for (const contact of contacts) {
    for (const address of parseEmailRecipients(contact.email)) {
      const key = address.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        recipients.push(address);
      }
    }
  }

  return recipients;
}

/** Kuyruk kaydında birden fazla numara virgülle ayrılarak tutulur. */
export function joinWhatsAppRecipients(recipients: string[]): string {
  return recipients.join(",");
}

export function splitWhatsAppRecipients(recipient: string): string[] {
  return recipient
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Kuyruk kaydında birden fazla e-posta "; " ile ayrılarak tutulur.
 * Mail worker'ı bu alanı parseEmailRecipients ile ayırıp hepsine gönderir.
 */
export function joinEmailRecipients(recipients: string[]): string {
  return recipients.join("; ");
}

/** WhatsApp gönderimini engelleyen eksikler (boş liste = gönderilebilir). */
export function getWhatsAppWarnings(contacts: ContactPhone[]): string[] {
  if (contacts.length === 0) {
    return ["Firma iletişim kaydı bulunamadı."];
  }

  if (contacts.every((contact) => !contact.phone?.trim())) {
    return ["Firmanın iletişim telefon numarası boş."];
  }

  if (collectWhatsAppRecipients(contacts).length === 0) {
    return [
      "Firmanın iletişim telefonlarında cep telefonu numarası yok (sabit hat veya geçersiz numara).",
    ];
  }

  return [];
}

/** E-posta gönderimini engelleyen iletişim eksikleri (boş liste = gönderilebilir). */
export function getEmailWarnings(contacts: ContactEmail[]): string[] {
  if (contacts.length === 0) {
    return ["Firma iletişim kaydı bulunamadı."];
  }

  if (contacts.every((contact) => !contact.email?.trim())) {
    return ["Firmanın iletişim e-posta adresi boş."];
  }

  if (collectEmailRecipients(contacts).length === 0) {
    return ["Firmanın iletişim e-posta adreslerinin hiçbiri geçerli değil."];
  }

  return [];
}

/**
 * Belge hatırlatma mailini engelleyen eksikler (boş liste = gönderilebilir).
 * Kapatma mailinde dilekçe eki için belge numarası ve firma adresi de gerekir.
 */
export function getDocumentEmailWarnings(params: {
  contacts: ContactEmail[];
  type: "EXTENSION_APPLICATION" | "CLOSURE_APPLICATION";
  documentNumber?: string | null;
  investorAddress?: string | null;
}): string[] {
  const warnings = getEmailWarnings(params.contacts);

  if (params.type === "CLOSURE_APPLICATION" && !params.documentNumber) {
    warnings.push("Belge numarası bulunamadı.");
  }

  if (params.type === "CLOSURE_APPLICATION" && !params.investorAddress) {
    warnings.push("Firma adresi bulunamadı.");
  }

  return warnings;
}