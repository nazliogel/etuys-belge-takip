import { EmailService } from "./email.service.js";

const emailService = new EmailService();

/**
 * Sunucu/bağlantı kaynaklı (danışmanın düzeltemeyeceği) hataları
 * SYSTEM_ALERT_EMAIL adresine bildirir. Danışmana bildirim gitmez.
 */
export async function notifySystemAlert(params: {
  kind: string;
  reminderId: number;
  companyName: string;
  recipient: string;
  errorMessage: string;
}): Promise<void> {
  const to = process.env.SYSTEM_ALERT_EMAIL?.trim();

  if (!to) {
    console.error("SYSTEM_ALERT_EMAIL tanımlı değil; sistem uyarısı gönderilemedi.", params);
    return;
  }

  try {
    await emailService.send({
      to,
      subject: `[Sistem uyarısı] Mail gönderilemedi: ${params.companyName}`,
      text: [
        "Bir mail, mail sunucusu/bağlantı kaynaklı bir hata nedeniyle 3 denemenin sonunda gönderilemedi.",
        "Bu hata danışmana bildirilmedi.",
        "",
        `Tür: ${params.kind}`,
        `Kayıt ID: ${params.reminderId}`,
        `Firma: ${params.companyName}`,
        `Alıcı: ${params.recipient}`,
        `Hata: ${params.errorMessage}`,
        "",
        "Mail sunucusu düzeldikten sonra kayıt tekrar kuyruğa alınmalı.",
      ].join("\n"),
    });
  } catch (error) {
    // Mail sunucusu tamamen çöktüyse bu uyarı da gidemez; ertesi sabahki raporda görünür.
    console.error("Sistem uyarı maili gönderilemedi.", error);
  }
}