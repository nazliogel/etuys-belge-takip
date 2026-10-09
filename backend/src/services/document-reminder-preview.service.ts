import {
  createClosureEmailTemplate,
  createExtensionEmailTemplate,
} from "./closure-email-template.service.js";

import { DocumentReminderService } from "./document-reminder.service.js";
import {
  collectEmailRecipients,
  getDocumentEmailWarnings,
  getWhatsAppWarnings,
  joinEmailRecipients,
} from "./reminder-contact-check.js";

export const DEFAULT_CC_RECIPIENTS = [
  "salihsahin@akkasgroup.com",
  "emininangu@akkasgroup.com",
  "ezgitemel@akkasgroup.com",
  "berkeincesu@aya.com.tr",
  "murathanaraci@aya.com.tr",
  "yatirimtesvik@akkasgroup.com",
  "beyzabasaran@akkasgroup.com",
  "info@akkasgroup.com",
];

export class DocumentReminderPreviewService {
  constructor(
    private readonly reminderService = new DocumentReminderService(),
  ) {}

  async createPreviews(today: Date = new Date()) {
    const candidates = await this.reminderService.findDueCandidates(today);

    return candidates.map((candidate) => {
      const { document, company, contact, decision } = candidate;

      // YENİ: Firmanın BÜTÜN iletişim kayıtları (en yeni önce).
      const contacts = company.contacts;

      const authorizationExpired = candidate.authorizationExpired;
      const template =
        decision.type === "CLOSURE_APPLICATION"
          ? createClosureEmailTemplate({
              companyName: company.name,
              authorizationExpired,
              documentNumber:
                document.documentNumber ?? "Belge numarası bulunamadı",
              targetDate: decision.targetDate,
              investorAddress: company.identity?.investorAddress,
            })
          : createExtensionEmailTemplate({
              companyName: company.name,
              targetDate: decision.targetDate,
              authorizationExpired,
            });

      const warnings = getDocumentEmailWarnings({
        contacts,
        type: decision.type,
        documentNumber: document.documentNumber,
        investorAddress: company.identity?.investorAddress,
      });

      // Mail engellendiğinde danışmana giden bildirimde telefon eksikliği
      // de yazılabilsin diye WhatsApp eksikleri de hesaplanır.
      const whatsappWarnings = getWhatsAppWarnings(contacts);

      return {
        documentId: document.id,
        companyId: company.id,
        companyName: company.name,
        consultantUserId: company.consultantUser?.id,
        consultantName: company.consultantUser
          ? `${company.consultantUser.firstName} ${company.consultantUser.lastName}`.trim()
          : "",
        consultantIsActive: company.consultantUser?.isActive ?? false,
        consultantRole: company.consultantUser?.role,
        // Kayıtta bağlantı için en yeni iletişim kişisi tutulur.
        contactId: contact?.id,
        contactName: contacts.map((item) => item.fullName).join(", "),
        // YENİ: Bütün kişilerin bütün geçerli e-posta adresleri ("a@x.com; b@y.com").
        // Mail worker'ı bu alanı ayırıp hepsine tek mail olarak gönderir.
        recipient: joinEmailRecipients(collectEmailRecipients(contacts)),
        cc: [...DEFAULT_CC_RECIPIENTS],
        type: decision.type,
        reminderMonth: decision.reminderMonth,
        targetDate: decision.targetDate,
        authorizationExpired,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: template.attachments.map((attachment) => ({
          filename: attachment.filename,
          path: attachment.path,
        })),
        canSend: warnings.length === 0,
        warnings,
        whatsappWarnings,
      };
    });
  }
}