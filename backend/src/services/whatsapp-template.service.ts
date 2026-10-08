import { getTurkeyDay, getUtcDay } from "../utils/turkey-date.js";

interface WhatsAppTemplateResult {
  templateName: string;
  languageCode: "tr";
  parameters: string[];
  previewText: string;
}

interface ReminderTemplateParams {
  companyName: string;
  documentNumber?: string | null;
  targetDate: Date;
  authorizationExpired?: boolean;
  today?: Date;
}

interface AuthorizationTemplateParams {
  companyName: string;
  targetDate: Date;
  today?: Date;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Hedef tarih (@db.Date) ile Türkiye takvimine göre bugünü karşılaştırır. */
function resolveExpiryText(targetDate: Date, today: Date): string {
  const targetDay = getUtcDay(targetDate).getTime();
  const currentDay = getTurkeyDay(today).getTime();

  if (targetDay < currentDay) {
    return "dolmuştur";
  }

  if (targetDay === currentDay) {
    return "bugün dolmaktadır";
  }

  return "dolacaktır";
}

const ALREADY_DONE_TEXT =
  "İlgili işlemleri tamamladıysanız lütfen bu mesajı dikkate almayınız.";

const CONTACT_TEXT =
  "İşlemler için bizimle iletişime geçebilirsiniz:\n" +
  "📞 0216 450 60 07 – 📱 0553 350 72 30";

const SIGNATURE = "AKKAŞ GROUP - SALİH ŞAHİN";

/**
 * Süre uzatma hatırlatması.
 * Kapso: document_extension_reminder_v2 · {{1}} durum ifadesi, {{2}} süre sonu.
 */
export function createExtensionWhatsAppTemplate(
  params: ReminderTemplateParams,
): WhatsAppTemplateResult {
  const targetDate = formatDate(params.targetDate);
  const expiryText = resolveExpiryText(
    params.targetDate,
    params.today ?? new Date(),
  );

  return {
    templateName: "document_extension_reminder_v2",
    languageCode: "tr",

    // DİKKAT: Bu şablonda {{1}}'den sonra nokta yok; nokta parametreye eklenir.
    // Şablon ileride "{{1}}." olarak düzeltilirse buradaki nokta kaldırılmalı.
    parameters: [`${expiryText}.`, targetDate],

    previewText: [
      "Sn. Yetkili Merhaba,",
      `Yatırım Teşvik Belgenizin 3 yıllık süresi ${expiryText}.`,
      `📅 Süre Sonu: ${targetDate}`,
      "Bu aşamada acil olarak süre uzatım ya da kapatma işlemlerinin " +
        "yapılması gerekmektedir. İşlemlerin yasal süre içinde yapılmaması " +
        "durumunda idari para cezası uygulanmaktadır.",
      ALREADY_DONE_TEXT,
      CONTACT_TEXT,
      SIGNATURE,
    ].join("\n"),
  };
}

/**
 * Kapatma hatırlatması.
 * Kapso: document_closure_reminder_v2 · {{1}} durum ifadesi, {{2}} bitiş tarihi.
 */
export function createClosureWhatsAppTemplate(
  params: ReminderTemplateParams,
): WhatsAppTemplateResult {
  const targetDate = formatDate(params.targetDate);
  const expiryText = resolveExpiryText(
    params.targetDate,
    params.today ?? new Date(),
  );

  return {
    templateName: "document_closure_reminder_v2",
    languageCode: "tr",

    parameters: [expiryText, targetDate],

    previewText: [
      "Sn. Yetkili Merhaba,",
      `Yatırım Teşvik Belgenizin süresi ${expiryText}.`,
      `📅 Bitiş Tarihi: ${targetDate}`,
      "Süre bitimini takip eden 3 ay içerisinde belgenizin kapanış " +
        "işlemlerinin yapılması gerekmektedir. Yasal süre içinde " +
        "yapılmadığı takdirde idari para cezası uygulanmaktadır.",
      ALREADY_DONE_TEXT,
      CONTACT_TEXT,
      SIGNATURE,
    ].join("\n"),
  };
}

/**
 * Yetkilendirme hatırlatması. Yetki süresi dolmadan önce de (6 ay kala) ve
 * dolduktan sonra da aynı şablon kullanılır; durum ifadesini kod belirler.
 * Kapso: company_authorization_reminder_v2 · {{1}} durum ifadesi.
 */
export function createAuthorizationWhatsAppTemplate(
  params: AuthorizationTemplateParams,
): WhatsAppTemplateResult {
  const expiryText = resolveExpiryText(
    params.targetDate,
    params.today ?? new Date(),
  );

  return {
    templateName: "company_authorization_reminder_v2",
    languageCode: "tr",

    parameters: [expiryText],

    previewText: [
      "Sn. Yetkili Merhaba,",
      `Yatırım Teşvik Belgesi otomasyon ekranlarındaki yetki süremiz ${expiryText}.`,
      "Süre uzatma, kapatma ve genel süreçlerinizin aksamaması adına " +
        "ekran yetkilendirmemizin yenilenmesi gerekmektedir. " +
        "Sürelerin geçmesinden kaynaklı oluşabilecek her türlü idari para " +
        "cezalarından firmamız sorumlu değildir.",
      ALREADY_DONE_TEXT,
      CONTACT_TEXT,
      SIGNATURE,
    ].join("\n"),
  };
}