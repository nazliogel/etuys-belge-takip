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

// Veritabanındaki @db.Date alanını gün olarak karşılaştırır.
function getTargetDay(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

// Bugünü Türkiye saatine göre belirler.
function getTurkeyDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const getPart = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
  );
}

function resolveExpiryText(
  targetDate: Date,
  today: Date,
): string {
  const targetDay = getTargetDay(targetDate);
  const currentDay = getTurkeyDay(today);

  if (targetDay < currentDay) {
    return "dolmuştur";
  }

  if (targetDay === currentDay) {
    return "bugün dolmaktadır";
  }

  return "dolacaktır";
}

const CONTACT_TEXT =
  "İşlemler için bizimle iletişime geçebilirsiniz:\n" +
  "📞 0216 450 60 07 – 📱 0553 350 72 30";

const SIGNATURE = "AKKAŞ GROUP - SALİH ŞAHİN";

const WHATSAPP_AUTHORIZATION_NOTICE =
  "Yatırım Teşvik Belgesi otomasyon ekranlarındaki yetki süremiz dolmuştur.\n" +
  "Süre uzatma, kapatma ve genel süreçlerinizin aksamaması adına " +
  "ekran yetkilendirmemizin acilen yenilenmesi gerekmektedir. " +
  "Sürelerin geçmesinden kaynaklı oluşabilecek her türlü idari para " +
  "cezalarından firmamız sorumlu değildir.";

export function createExtensionWhatsAppTemplate(
  params: ReminderTemplateParams,
): WhatsAppTemplateResult {
  const targetDate = formatDate(params.targetDate);
  const expiryText = resolveExpiryText(
    params.targetDate,
    params.today ?? new Date(),
  );

  return {
    templateName: "document_extension_reminder",
    languageCode: "tr",

    // Kapso: {{1}} durum ifadesi, {{2}} bitiş tarihi.
    parameters: [expiryText, targetDate],

    previewText: [
      "Sn. Yetkili Merhaba,",
      `Yatırım Teşvik Belgenizin 3 yıllık süresi ${expiryText}.`,
      `📅 Süre Sonu: ${targetDate}`,
      "Bu aşamada acil olarak süre uzatım ya da kapatma işlemlerinin " +
        "yapılması gerekmektedir. İşlemlerin yasal süre içinde yapılmaması " +
        "durumunda idari para cezası uygulanmaktadır.",
      CONTACT_TEXT,
      SIGNATURE,
    ].join("\n"),
  };
}

export function createClosureWhatsAppTemplate(
  params: ReminderTemplateParams,
): WhatsAppTemplateResult {
  const targetDate = formatDate(params.targetDate);

  return {
    templateName: "document_closure_reminder",
    languageCode: "tr",

    // Kapso: {{1}} bitiş tarihi.
    parameters: [targetDate],

    previewText: [
      "Sn. Yetkili Merhaba,",
      "Yatırım Teşvik Belgenizin süresi dolmuştur.",
      `📅 Bitiş Tarihi: ${targetDate}`,
      "Süre bitimini takip eden 3 ay içerisinde belgenizin kapanış " +
        "işlemlerinin yapılması gerekmektedir. Yasal süre içinde " +
        "yapılmadığı takdirde idari para cezası uygulanmaktadır.",
      CONTACT_TEXT,
      SIGNATURE,
    ].join("\n"),
  };
}

export function createAuthorizationWhatsAppTemplate(
  params: AuthorizationTemplateParams,
): WhatsAppTemplateResult {
  const targetDay = getTargetDay(params.targetDate);
  const currentDay = getTurkeyDay(params.today ?? new Date());

  if (targetDay >= currentDay) {
    throw new Error(
      "Yetkilendirme WhatsApp şablonu yalnızca yetki süresi dolmuş firmalar için kullanılabilir.",
    );
  }

  return {
    templateName: "company_authorization_reminder_expired",
    languageCode: "tr",

    // Kapso: Bu şablonda değişken bulunmuyor.
    parameters: [],

    previewText: [
      "Sn. Yetkili Merhaba,",
      WHATSAPP_AUTHORIZATION_NOTICE,
      CONTACT_TEXT,
      SIGNATURE,
    ].join("\n"),
  };
}