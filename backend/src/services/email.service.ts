import nodemailer from "nodemailer";

import { env } from "../config/env.js";

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function getSmtpConfig() {
  const missingFields: string[] = [];

  if (!env.smtpHost) missingFields.push("SMTP_HOST");
  if (!env.smtpPort) missingFields.push("SMTP_PORT");
  if (!env.smtpUser) missingFields.push("SMTP_USER");
  if (!env.smtpPassword) missingFields.push("SMTP_PASSWORD");

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
        requireTLS: !config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
        tls: {
          minVersion: "TLSv1.2",
        },
      }),
      from: config.from,
    };
  }

  async verifyConnection(): Promise<void> {
    const { transporter } = this.createTransporter();

    await transporter.verify();
  }

  async send(params: SendEmailParams) {
    const { transporter, from } =
      this.createTransporter();

    const result = await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  }
}