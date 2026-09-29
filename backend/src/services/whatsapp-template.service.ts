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
  authorizationExpired?: boolean; // YENİ
}
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
const WHATSAPP_AUTHORIZATION_NOTICE =
  "Ekranlarınızın takibi, olası teşvik belgesi süre uzatma ya da kapatma işlemlerinin yapılabilmesi " +
  "ve genel süreçlerinizin takip edilebilmesi noktasında yetkilendirme işlemlerinin yapılması gerekmektedir. " +
  "Yetkilendirme evrakları ve süreç bilgisi e-posta ile tarafınıza iletilmektedir.";
export function createExtensionWhatsAppTemplate(
  params: ReminderTemplateParams,
): WhatsAppTemplateResult {
  const documentNumber =
    params.documentNumber?.trim() || "Belge numarası bulunamadı";

  const targetDate = formatDate(params.targetDate);

  const authorizationExpired = params.authorizationExpired === true;

  return {
    templateName: authorizationExpired
      ? "document_extension_reminder_auth"
      : "document_extension_reminder",
    languageCode: "tr",
    parameters: [params.companyName, documentNumber, targetDate],
    previewText: [
      "Sayın Yetkili,",
      `${params.companyName} firmasına ait ${documentNumber} numaralı yatırım teşvik belgesinin bitiş tarihi ${targetDate} olarak kayıtlıdır.`,
      "Süre uzatma başvurusu hakkındaki gerekli işlemlerin tamamlanmasını rica ederiz.",
      ...(authorizationExpired ? [WHATSAPP_AUTHORIZATION_NOTICE] : []),
      "Akkaş Group",
    ].join("\n\n"),
  };
}

export function createClosureWhatsAppTemplate(
  params: ReminderTemplateParams,
): WhatsAppTemplateResult {
  const documentNumber =
    params.documentNumber?.trim() || "Belge numarası bulunamadı";

  const targetDate = formatDate(params.targetDate);

    const authorizationExpired = params.authorizationExpired === true;

  return {
    templateName: authorizationExpired
      ? "document_closure_reminder_auth"
      : "document_closure_reminder",
    languageCode: "tr",
    parameters: [params.companyName, documentNumber, targetDate],
    previewText: [
      "Sayın Yetkili,",
      `${params.companyName} firmasına ait ${documentNumber} numaralı yatırım teşvik belgesinin uzatılmış süresi ${targetDate} tarihinde sona ermiştir.`,
      "Belge kapatma başvurusu hakkındaki gerekli işlemlerin tamamlanmasını rica ederiz.",
      ...(authorizationExpired ? [WHATSAPP_AUTHORIZATION_NOTICE] : []),
      "Akkaş Group",
    ].join("\n\n"),
  };
}
