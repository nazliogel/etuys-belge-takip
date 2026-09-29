import fs from "node:fs";
import path from "node:path";

import type { EmailAttachment } from "./email.service.js";

/**
 * Tüm otomatik e-postaların sonuna eklenen imza görseli ve KVKK/GDPR metni.
 * EmailService.send ve sendTest tarafından otomatik uygulanır.
 *
 * İmza görseli e-postaya gömülü (inline, CID) olarak eklenir; alıcı
 * "resimleri göster" demeden görür ve ek listesinde ayrı dosya olarak durmaz.
 *
 * Görsel yolu: backend/assets/email-signature/mail-signature.png
 */

export const EMAIL_SIGNATURE_CID = "akkas-mail-signature";

const SIGNATURE_IMAGE_PATH = path.resolve(
  process.cwd(),
  "assets",
  "email-signature",
  "mail-signature.png",
);

export const KVKK_DISCLAIMER_PARAGRAPHS = [
  "Bu e-posta ve ekleri, e-postada gönderildiği belirtilen kişi/kişilere özel ve gizli olup; 6698 sayılı Kişisel Verilerin Korunması Kanunu ve 25 Mayıs 2018 tarihli Avrupa Birliği Genel Veri Koruma Tüzüğü (“GDPR”) kapsamında kişisel veriler içerebilmektedir. Bu e-posta ve eklerinin tarafınıza gönderim amacı ile bağlantılı, sınırlı ve ölçülü olarak kullanılması kanuni bir zorunluluktur. E-postanın içermekte olduğu kişisel veriler, gönderim amacı dışında işlenemez, çoğaltılamaz, arşivlenemez, ilgili kişinin ve şirketimizin onayı olmaksızın üçüncü kişilere aktarılamaz. Kişisel verilerin gönderim amacı gerçekleştiğinde yasal süreler içerisinde tarafınızdan imha edilmesi gerekmektedir. Sizlere aktarılan kişisel verilerin, hukuka aykırı olarak işlenmesinin ve erişilmesinin önlenmesi ve bunların güvenliğinin sağlanmasına ilişkin sorumluluklarınızın bulunduğunu hatırlatırız.",
  "Bu e-postanın muhatabı olmamanıza rağmen size ulaşmış olması halinde e-postayı derhal imha ederek bu durumu gecikmeksizin tarafımıza bildirmenizi rica ederiz.",
];

interface EmailBody {
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

let missingSignatureWarned = false;

function signatureImageExists(): boolean {
  const exists = fs.existsSync(SIGNATURE_IMAGE_PATH);

  if (!exists && !missingSignatureWarned) {
    console.warn(
      `E-posta imza görseli bulunamadı: ${SIGNATURE_IMAGE_PATH}. E-postalar imza görseli olmadan, yalnızca KVKK metniyle gönderilecek.`,
    );
    missingSignatureWarned = true;
  }

  return exists;
}

function buildSignatureHtml(): string {
  return `
    <p style="margin:16px 0 0 0;">
      <img
        src="cid:${EMAIL_SIGNATURE_CID}"
        alt="Akkaş Group - Yatırım Teşvik"
        style="display:block;border:0;outline:none;text-decoration:none;max-width:600px;height:auto;"
      />
    </p>
  `;
}

function buildDisclaimerHtml(): string {
  const paragraphStyle = [
    "margin:0 0 6px 0",
    "font-family:Arial,Helvetica,sans-serif",
    "font-size:9px",
    "line-height:1.4",
    "color:#8a8a8a",
  ].join(";");

  return `
    <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e0e0e0;">
      ${KVKK_DISCLAIMER_PARAGRAPHS.map(
        (paragraph) => `<p style="${paragraphStyle}">${paragraph}</p>`,
      ).join("\n")}
    </div>
  `;
}

function buildDisclaimerText(): string {
  return `\n\n---\n\n${KVKK_DISCLAIMER_PARAGRAPHS.join("\n\n")}`;
}

/**
 * E-postanın sonuna imza görselini ve KVKK metnini ekler.
 * Aynı e-postaya iki kez uygulanırsa ikinci seferde bir şey eklemez.
 */
export function appendEmailFooter(email: EmailBody): EmailBody {
  const marker = KVKK_DISCLAIMER_PARAGRAPHS[1];

  if (email.text.includes(marker) || email.html?.includes(marker)) {
    return email;
  }

  const text = `${email.text}${buildDisclaimerText()}`;

  // HTML'i olmayan (yalnızca düz metin) e-postalara görsel eklenmez.
  if (!email.html) {
    return { ...email, text };
  }

  const hasSignature = signatureImageExists();

  const html = `${email.html}${hasSignature ? buildSignatureHtml() : ""}${buildDisclaimerHtml()}`;

  const attachments: EmailAttachment[] = [...(email.attachments ?? [])];

  if (hasSignature) {
    attachments.push({
      filename: "mail-signature.png",
      path: SIGNATURE_IMAGE_PATH,
      cid: EMAIL_SIGNATURE_CID,
      contentDisposition: "inline",
    });
  }

  return { text, html, attachments };
}