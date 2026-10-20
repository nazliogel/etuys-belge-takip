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
  /** YENİ: Verilmezse "EMAIL" kabul edilir; mail uyarılarının metni değişmez. */
  channel?: "EMAIL" | "WHATSAPP";
}): Promise<void> {
  const to = process.env.SYSTEM_ALERT_EMAIL?.trim();

  if (!to) {
    console.error("SYSTEM_ALERT_EMAIL tanımlı değil; sistem uyarısı gönderilemedi.", params);
    return;
  }

  const isWhatsApp = params.channel === "WHATSAPP";

  try {
    await emailService.send({
      to,
      subject: isWhatsApp
        ? `[Sistem uyarısı] WhatsApp mesajı gönderilemedi: ${params.companyName}`
        : `[Sistem uyarısı] Mail gönderilemedi: ${params.companyName}`,
      text: [
        isWhatsApp
          ? "Bir WhatsApp mesajı, Kapso/WhatsApp servisi ya da bağlantı kaynaklı bir hata nedeniyle 3 denemenin sonunda gönderilemedi."
          : "Bir mail, mail sunucusu/bağlantı kaynaklı bir hata nedeniyle 3 denemenin sonunda gönderilemedi.",
        "Bu hata danışmana bildirilmedi.",
        "",
        `Tür: ${params.kind}`,
        `Kayıt ID: ${params.reminderId}`,
        `Firma: ${params.companyName}`,
        `Alıcı: ${params.recipient}`,
        `Hata: ${params.errorMessage}`,
        "",
        isWhatsApp
          ? "WhatsApp servisi düzeldikten sonra kayıt tekrar kuyruğa alınmalı."
          : "Mail sunucusu düzeldikten sonra kayıt tekrar kuyruğa alınmalı.",
      ].join("\n"),
    });
  } catch (error) {
    // Mail sunucusu tamamen çöktüyse bu uyarı da gidemez; ertesi sabahki raporda görünür.
    console.error("Sistem uyarı maili gönderilemedi.", error);
  }
}