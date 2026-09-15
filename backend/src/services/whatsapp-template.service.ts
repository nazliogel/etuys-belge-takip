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
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function createExtensionWhatsAppTemplate(
  params: ReminderTemplateParams,
): WhatsAppTemplateResult {
  const documentNumber =
    params.documentNumber?.trim() || "Belge numarası bulunamadı";

  const targetDate = formatDate(params.targetDate);

  return {
    templateName: "document_extension_reminder",
    languageCode: "tr",
    parameters: [params.companyName, documentNumber, targetDate],
    previewText: [
      "Sayın Yetkili,",
      `${params.companyName} firmasına ait ${documentNumber} numaralı yatırım teşvik belgesinin bitiş tarihi ${targetDate} olarak kayıtlıdır.`,
      "Süre uzatma başvurusu hakkında gerekli işlemlerin tamamlanmasını rica ederiz.",
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

  return {
    templateName: "document_closure_reminder",
    languageCode: "tr",
    parameters: [params.companyName, documentNumber, targetDate],
    previewText: [
      "Sayın Yetkili,",
      `${params.companyName} firmasına ait ${documentNumber} numaralı yatırım teşvik belgesinin uzatılmış süresi ${targetDate} tarihinde sona ermiştir.`,
      "Belge kapatma başvurusu hakkında gerekli işlemlerin tamamlanmasını rica ederiz.",
      "Akkaş Group",
    ].join("\n\n"),
  };
}