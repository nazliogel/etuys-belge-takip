import nodemailer from "nodemailer";

import { env } from "../config/env.js";

export interface EmailAttachment {
  filename: string;
  path: string;
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
    throw new Error(
      `SMTP ayarlari eksik: ${missingFields.join(", ")}`,
    );
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
        requireTLS: false,
        ignoreTLS: true,
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
      throw new Error(
        "Test e-posta gönderimi devre dışı.",
      );
    }

    const testRecipient =
      env.emailTestRecipient?.trim();

    if (!testRecipient) {
      throw new Error(
        "EMAIL_TEST_RECIPIENT tanımlı değil.",
      );
    }

    const { transporter, from } =
      this.createTransporter();

    const result = await transporter.sendMail({
      from,
      to: testRecipient,
      cc: params.cc,
      subject: `[TEST] ${params.subject}`,
      text: [
        "BU BİR TEST E-POSTASIDIR.",
        `Gerçek firma alıcısı: ${params.to}`,
        "",
        params.text,
      ].join("\n"),
      html: params.html
        ? `
            <p><strong>BU BİR TEST E-POSTASIDIR.</strong></p>
            <p>Gerçek firma alıcısı: ${params.to}</p>
            <hr />
            ${params.html}
          `
        : undefined,
      attachments: params.attachments,
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
      throw new Error(
        "E-posta gönderimi güvenlik nedeniyle devre dışı.",
      );
    }

    const { transporter, from } =
      this.createTransporter();

    const result = await transporter.sendMail({
      from,
      to: params.to,
      cc: params.cc,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  }
}