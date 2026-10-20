import { env } from "../config/env.js";
import { normalizeWhatsAppRecipient } from "./document-reminder-whatsapp-preview.service.js";
import { WhatsAppApiError } from "../utils/whatsapp-retry.js";

interface SendWhatsAppTemplateParams {
  to: string;
  templateName: string;
  languageCode: string;
  parameters: string[];
}

interface WhatsAppApiResponse {
  messages?: Array<{
    id: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

function getKapsoConfig() {
  const missingFields: string[] = [];

  if (!env.kapsoApiKey) missingFields.push("KAPSO_API_KEY");
  if (!env.kapsoPhoneNumberId) missingFields.push("KAPSO_PHONE_NUMBER_ID");
  if (!env.whatsappApiVersion) missingFields.push("WHATSAPP_API_VERSION");

  if (missingFields.length > 0) {
    throw new Error(`WhatsApp ayarları eksik: ${missingFields.join(", ")}`);
  }

  return {
    apiKey: env.kapsoApiKey as string,
    phoneNumberId: env.kapsoPhoneNumberId as string,
    apiVersion: env.whatsappApiVersion,
  };
}

export class WhatsAppService {
  /** Kapso'ya şablon mesajı gönderir. Güvenlik kontrolleri çağıran fonksiyondadır. */
  private async postTemplate(to: string, params: SendWhatsAppTemplateParams) {
    const config = getKapsoConfig();

    const url = [
      "https://api.kapso.ai/meta/whatsapp",
      config.apiVersion,
      encodeURIComponent(config.phoneNumberId),
      "messages",
    ].join("/");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: params.templateName,
          language: {
            code: params.languageCode,
          },

          // Değişkensiz şablonlarda components gönderilmez.
          ...(params.parameters.length > 0
            ? {
                components: [
                  {
                    type: "body",
                    parameters: params.parameters.map((value) => ({
                      type: "text",
                      text: value,
                    })),
                  },
                ],
              }
            : {}),
        },
      }),
    });

    const responseText = await response.text();
    let result: WhatsAppApiResponse;

    try {
      result = JSON.parse(responseText) as WhatsAppApiResponse;
    } catch {
      // HTTP durumu hata nesnesinde taşınır (5xx ise tekrar denenir).
      throw new WhatsAppApiError(
        `Kapso API geçerli JSON döndürmedi: HTTP ${response.status}`,
        { httpStatus: response.status },
      );
    }

    if (!response.ok) {
      const details = [
        result.error?.message,
        result.error?.code !== undefined
          ? `Kod: ${result.error.code}`
          : undefined,
        result.error?.error_subcode !== undefined
          ? `Alt kod: ${result.error.error_subcode}`
          : undefined,
      ]
        .filter(Boolean)
        .join(" - ");

      // HTTP durumu ve Meta hata kodu ayrı alanlarda taşınır;
      // geçici/kalıcı hata ayrımı bunlara göre yapılır.
      throw new WhatsAppApiError(
        details || `Kapso API isteği başarısız: HTTP ${response.status}`,
        {
          httpStatus: response.status,
          metaCode: result.error?.code,
          metaSubcode: result.error?.error_subcode,
        },
      );
    }

    const messageId = result?.messages?.[0]?.id;

    if (!messageId) {
      // Başarılı cevap ama mesaj kimliği yok: tekrar denenmez (çift mesaj riski).
      throw new Error("Kapso API mesaj kimliği döndürmedi.");
    }

    return { messageId };
  }

  /**
   * Test gönderimi (EmailService.sendTest'in WhatsApp karşılığı).
   * Mesaj gerçek firmaya değil, WHATSAPP_TEST_RECIPIENT numarasına gider.
   * Onaylı şablonun metni değiştirilemediği için "[TEST]" ibaresi mesaja
   * eklenemez; gerçek alıcı bilgisi dönüş değerinde ve log'da yer alır.
   */
  async sendTest(params: SendWhatsAppTemplateParams) {
    if (env.whatsappSendingEnabled) {
      throw new Error(
        "Güvenlik kontrolü başarısız: normal WhatsApp gönderimi kapalı olmalıdır.",
      );
    }

    if (!env.whatsappTestSendingEnabled) {
      throw new Error("Test WhatsApp gönderimi devre dışı.");
    }

    const testRecipient = normalizeWhatsAppRecipient(
      env.whatsappTestRecipient?.trim() ?? "",
    );

    if (!/^[1-9]\d{9,14}$/.test(testRecipient)) {
      throw new Error(
        `WHATSAPP_TEST_RECIPIENT geçersiz: "${env.whatsappTestRecipient ?? ""}"`,
      );
    }

    const result = await this.postTemplate(testRecipient, params);

    console.log(
      `[TEST] WhatsApp gönderildi: ${params.templateName} -> ${testRecipient} (gerçek alıcı: ${params.to || "-"})`,
    );

    return {
      messageId: result.messageId,
      testRecipient,
      realRecipient: params.to,
    };
  }

  async sendTemplate(params: SendWhatsAppTemplateParams) {
    if (!env.whatsappSendingEnabled) {
      throw new Error("WhatsApp gönderimi devre dışı.");
    }

    return this.postTemplate(params.to, params);
  }

  /**
   * YENİ: Aynı mesajı birden fazla numaraya sırayla gönderir (mailde bütün
   * adreslere gönderildiği gibi). Bir numaradaki hata diğerlerini durdurmaz.
   * Hangi numaraya gidip hangisine gitmediği ayrı ayrı döner.
   */
  async sendTemplateToRecipients(
    recipients: string[],
    params: Omit<SendWhatsAppTemplateParams, "to">,
  ) {
    const sent: Array<{ to: string; messageId: string }> = [];
    const failed: Array<{ to: string; error: unknown }> = [];

    for (const to of recipients) {
      try {
        const result = await this.sendTemplate({ ...params, to });
        sent.push({ to, messageId: result.messageId });
      } catch (error) {
        failed.push({ to, error });
      }
    }

    return { sent, failed };
  }
}