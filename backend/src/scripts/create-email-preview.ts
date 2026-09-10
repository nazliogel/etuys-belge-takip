import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

import { prisma } from "../config/env.js";
import { DocumentReminderPreviewService } from "../services/document-reminder-preview.service.js";

const SAFE_TEST_RECIPIENT = "yatirimtesvik@akkasgroup.com";

async function createEmlFile(
  preview: Awaited<
    ReturnType<DocumentReminderPreviewService["createPreviews"]>
  >[number],
  filename: string,
) {
  const intendedCc = preview.cc.join("; ");

  const safetyNotice = `
    <div style="
      padding: 12px;
      margin-bottom: 20px;
      border: 2px solid #d97706;
      background: #fff7ed;
      color: #9a3412;
      font-family: Arial, sans-serif;
    ">
      <strong>TEST ÖN İZLEME — BU E-POSTA GÖNDERİLMEMİŞTİR</strong>
      <br /><br />
      Gerçek alıcı: ${preview.recipient}
      <br />
      Gerçek CC: ${intendedCc}
    </div>
  `;

  const transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "windows",
  });

  const result = await transporter.sendMail({
    from: SAFE_TEST_RECIPIENT,
    to: SAFE_TEST_RECIPIENT,
    subject: `[TEST ÖN İZLEME] ${preview.subject}`,
    text: `TEST ÖN İZLEME

Gerçek alıcı: ${preview.recipient}
Gerçek CC: ${intendedCc}

${preview.text}`,
    html: `${safetyNotice}${preview.html}`,
    attachments: preview.attachments,
  });

  const outputPath = path.resolve(process.cwd(), "previews", filename);

  await fs.writeFile(outputPath, result.message);

  console.log(`Ön izleme oluşturuldu: ${outputPath}`);
}

async function main() {
  const previewService = new DocumentReminderPreviewService();

  const previews = await previewService.createPreviews();

  const extensionPreview = previews.find(
    (preview) => preview.type === "EXTENSION_APPLICATION",
  );

  const closurePreview = previews.find(
    (preview) => preview.type === "CLOSURE_APPLICATION",
  );
  if (extensionPreview) {
    await createEmlFile(extensionPreview, "sure-uzatma-onizleme.eml");
  } else {
    console.log("Süre uzatma ön izlemesi için uygun kayıt bulunamadı.");
  }

  if (closurePreview) {
    await createEmlFile(closurePreview, "kapatma-onizleme.eml");
  } else {
    console.log("Eksiksiz kapatma ön izlemesi için uygun kayıt bulunamadı.");
  }
}

main()
  .catch((error: unknown) => {
    console.error("Ön izleme oluşturulamadı:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
