import { prisma } from "../config/env.js";
import { DocumentReminderPreviewService } from "../services/document-reminder-preview.service.js";

async function main() {
  const previewService =
    new DocumentReminderPreviewService();

  const previews =
    await previewService.createPreviews();

  console.log(
    `Toplam ${previews.length} bildirim ön izlemesi bulundu.`,
  );

  const safePreviews = previews.slice(0, 5).map(
    (preview) => ({
      documentId: preview.documentId,
      companyName: preview.companyName,
      contactName: preview.contactName,
      recipient: preview.recipient,
      cc: preview.cc,
      type: preview.type,
      reminderMonth: preview.reminderMonth,
      targetDate: preview.targetDate,
      subject: preview.subject,
      text: preview.text,
      attachments: preview.attachments.map(
        (attachment) => attachment.filename,
      ),
      canSend: preview.canSend,
      warnings: preview.warnings,
    }),
  );

  console.dir(safePreviews, {
    depth: null,
  });
}

main()
  .catch((error: unknown) => {
    console.error("Ön izleme oluşturulamadı:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });