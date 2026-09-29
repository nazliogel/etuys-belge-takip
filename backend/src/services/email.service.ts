import nodemailer from "nodemailer";

import { env } from "../config/env.js";
import { appendEmailFooter } from "./email-footer.js";
import {
  isAnyRecipientAccepted,
  parseEmailRecipients,
} from "./email-recipients.js";

export interface EmailAttachment {
  filename: string;
  path: string;
  /** Gömülü (inline) görseller için içerik kimliği, örn. imza görseli. */
  cid?: string;
  contentDisposition?: "inline" | "attachment";
}

interface SendEmailParams {
  to: string;
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

function getSmtpConfig() {
  const missingFields: string[] = [];

  if (!env.smtpHost) missingFields.push("SMTP_HOST");
  if (!env.smtpPort) missingFields.push("SMTP_PORT");
  if (!env.smtpUser) missingFields.push("SMTP_USER");
  if (!env.smtpPassword) {
    missingFields.push("SMTP_PASSWORD");
  }

  if (missingFields.length > 0) {
    throw new Error(`SMTP ayarlari eksik: ${missingFields.join(", ")}`);
  }

  return {
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    user: env.smtpUser,
    password: env.smtpPassword,
    from: env.smtpFrom ?? env.smtpUser,
  };
}

export class EmailService {
  private createTransporter() {
    const config = getSmtpConfig();

    return {
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure, 
        requireTLS: !config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
      }),
      from: config.from,
    };
  }

  async verifyConnection(): Promise<void> {
    const { transporter } = this.createTransporter();

    await transporter.verify();
  }

  async sendTest(params: SendEmailParams) {
    if (env.emailSendingEnabled) {
      throw new Error(
        "Güvenlik kontrolü başarısız: normal gönderim kapalı olmalıdır.",
      );
    }

    if (!env.emailTestSendingEnabled) {
      throw new Error("Test e-posta gönderimi devre dışı.");
    }

    const testRecipient = env.emailTestRecipient?.trim();

    if (!testRecipient) {
      throw new Error("EMAIL_TEST_RECIPIENT tanımlı değil.");
    }

    const { transporter, from } = this.createTransporter();

    // Gerçek gönderimde kullanılacak alıcı listesi, kontrol için test
    // e-postasında gösterilir.
    const realRecipients = parseEmailRecipients(params.to);
    const realRecipientsLabel =
      realRecipients.length > 0
        ? realRecipients.join(", ")
        : `GEÇERLİ ADRES YOK ("${params.to}")`;

    // YENİ: İmza görseli ve KVKK metni test e-postalarında da görünsün.
    const body = appendEmailFooter({
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    });

    const result = await transporter.sendMail({
      from,
      to: testRecipient,
      subject: `[TEST] ${params.subject}`,
      text: [
        "BU BİR TEST E-POSTASIDIR.",
        `Gerçek alıcı(lar): ${realRecipientsLabel}`,
        "",
        body.text,
      ].join("\n"),
      html: body.html
        ? `
            <p><strong>BU BİR TEST E-POSTASIDIR.</strong></p>
            <p>Gerçek alıcı(lar): ${realRecipientsLabel}</p>
            <hr />
            ${body.html}
          `
        : undefined,
      attachments: body.attachments,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      testRecipient,
    };
  }

  async send(params: SendEmailParams) {
    if (!env.emailSendingEnabled) {
      throw new Error("E-posta gönderimi güvenlik nedeniyle devre dışı.");
    }

    // YENİ: İletişim alanında birden fazla adres olabilir ("a@x.com; b@x.com").
    // Hepsi ayrıştırılıp alıcı yapılır; geçerli adres yoksa gönderilmez.
    const recipients = parseEmailRecipients(params.to);

    if (recipients.length === 0) {
      throw new Error(
        `Firmanın iletişim alanında geçerli bir e-posta adresi bulunamadı: "${params.to}"`,
      );
    }

    const { transporter, from } = this.createTransporter();

    // YENİ: Tüm otomatik e-postaların sonuna imza görseli ve KVKK metni eklenir.
    const body = appendEmailFooter({
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    });

    const result = await transporter.sendMail({
      from,
      to: recipients,
      cc: params.cc,
      subject: params.subject,
      text: body.text,
      html: body.html,
      attachments: body.attachments,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      /** Gönderimde kullanılan, ayrıştırılmış firma adresleri */
      recipients,
      /** Firma adreslerinden en az biri SMTP tarafından kabul edildi mi */
      anyRecipientAccepted: isAnyRecipientAccepted(recipients, result.accepted),
    };
  }
}