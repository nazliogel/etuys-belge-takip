import { env } from "../config/env.js";

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

export class WhatsAppService {
  async sendTemplate(params: SendWhatsAppTemplateParams) {
    if (!env.whatsappSendingEnabled) {
      throw new Error("WhatsApp gönderimi devre dışı.");
    }

    if (!env.whatsappAccessToken) {
      throw new Error("WHATSAPP_ACCESS_TOKEN tanımlı değil.");
    }

    if (!env.whatsappPhoneNumberId) {
      throw new Error("WHATSAPP_PHONE_NUMBER_ID tanımlı değil.");
    }

    if (!env.whatsappApiVersion) {
      throw new Error("WHATSAPP_API_VERSION tanımlı değil.");
    }

    const url = [
      "https://graph.facebook.com",
      env.whatsappApiVersion,
      env.whatsappPhoneNumberId,
      "messages",
    ].join("/");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "template",
        template: {
          name: params.templateName,
          language: {
            code: params.languageCode,
          },
          components: [
            {
              type: "body",
              parameters: params.parameters.map((value) => ({
                type: "text",
                text: value,
              })),
            },
          ],
        },
      }),
    });

    const result = (await response.json()) as WhatsAppApiResponse;

    if (!response.ok) {
      const details = [
        result.error?.message,
        result.error?.code ? `Kod: ${result.error.code}` : undefined,
        result.error?.error_subcode
          ? `Alt kod: ${result.error.error_subcode}`
          : undefined,
      ]
        .filter(Boolean)
        .join(" - ");

      throw new Error(
        details || `WhatsApp API isteği başarısız: HTTP ${response.status}`,
      );
    }

    const messageId = result.messages?.[0]?.id;

    if (!messageId) {
      throw new Error("WhatsApp API mesaj kimliği döndürmedi.");
    }

    return {
      messageId,
    };
  }
}
