import { env } from "../config/env.js";
import { EmailService } from "../services/email.service.js";

async function main() {
  if (env.emailSendingEnabled) {
    throw new Error(
      "Güvenlik kontrolü başarısız: EMAIL_SENDING_ENABLED=false olmalıdır.",
    );
  }

  const emailService = new EmailService();

  await emailService.verifyConnection();

  console.log(
    "SMTP bağlantısı başarılı. Herhangi bir mail gönderilmedi.",
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Bilinmeyen SMTP hatası";

  console.error("SMTP bağlantısı başarısız:", message);
  process.exit(1);
});