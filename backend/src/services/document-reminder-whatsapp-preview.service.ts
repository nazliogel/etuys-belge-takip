import { DocumentReminderService } from "./document-reminder.service.js";
import {
  createClosureWhatsAppTemplate,
  createExtensionWhatsAppTemplate,
} from "./whatsapp-template.service.js";
import {
  collectWhatsAppRecipients,
  getDocumentEmailWarnings,
  getWhatsAppWarnings,
  joinWhatsAppRecipients,
} from "./reminder-contact-check.js";

// Diğer dosyalar bu fonksiyonu buradan import ediyor; yeri değişti ama
// eski import yolları çalışmaya devam etsin diye buradan da dışa veriliyor.
export { normalizeWhatsAppRecipient } from "./reminder-contact-check.js";

export class DocumentReminderWhatsAppPreviewService {
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
          ? createClosureWhatsAppTemplate({
              companyName: company.name,
              documentNumber: document.documentNumber,
              targetDate: decision.targetDate,
              authorizationExpired,
            })
          : createExtensionWhatsAppTemplate({
              companyName: company.name,
              documentNumber: document.documentNumber,
              targetDate: decision.targetDate,
              authorizationExpired,
            });

      const warnings = getWhatsAppWarnings(contacts);

      // Mail de engelliyse danışmana tek (birleşik) bildirim gitsin diye
      // mailin eksikleri de hesaplanır (mail kuyruğuyla aynı kurallar).
      const emailWarnings = getDocumentEmailWarnings({
        contacts,
        type: decision.type,
        documentNumber: document.documentNumber,
        investorAddress: company.identity?.investorAddress,
      });

      return {
        documentId: document.id,
        companyId: company.id,
        companyName: company.name,
        consultantUserId: company.consultantUser?.id,
        consultantIsActive: company.consultantUser?.isActive ?? false,
        // Kayıtta bağlantı için en yeni iletişim kişisi tutulur.
        contactId: contact?.id,
        contactName: contacts.map((item) => item.fullName).join(", "),
        // YENİ: Bütün kişilerin bütün cep numaraları ("905…,905…").
        recipient: joinWhatsAppRecipients(collectWhatsAppRecipients(contacts)),
        type: decision.type,
        reminderMonth: decision.reminderMonth,
        targetDate: decision.targetDate,
        templateName: template.templateName,
        languageCode: template.languageCode,
        parameters: template.parameters,
        message: template.previewText,
        canSend: warnings.length === 0,
        warnings,
        emailCanSend: emailWarnings.length === 0,
        emailWarnings,
      };
    });
  }
}