import { EmailService } from "./email.service.js";

const ADMIN_FALLBACK_EMAIL = "salihsahin@akkasgroup.com";

export class ReminderNotificationService {
  constructor(private readonly emailService = new EmailService()) {}

  async notifyMissingConsultant(params: {
    companyName: string;
    companyId: number;
    errorMessage?: string;
  }) {
    await this.emailService.send({
      to: ADMIN_FALLBACK_EMAIL,
      subject: `${params.companyName} - Danışman Bilgisi Eksik`,
      text: `Merhaba Salih Bey,

${params.companyName} firmasına ait bildirim işlemi sırasında aktif bir danışman bulunamadı.

Lütfen firma danışman bilgilerini kontrol ederek gerekli danışman atamasını yapınız.

Firma: ${params.companyName}
Firma ID: ${params.companyId}

${
  params.errorMessage
    ? `İşlem sırasında oluşan hata:
${params.errorMessage}
`
    : ""
}
Saygılarımla,`,
    });
  }
}
