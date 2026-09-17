import { DocumentReminderService } from "./document-reminder.service.js";
import {
  createClosureWhatsAppTemplate,
  createExtensionWhatsAppTemplate,
} from "./whatsapp-template.service.js";

export function normalizeWhatsAppRecipient(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // 05XXXXXXXXX → 905XXXXXXXXX
  if (digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  }

  // 5XXXXXXXXX → 905XXXXXXXXX
  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `90${digits}`;
  }

  return digits;
}

function isValidWhatsAppRecipient(phone: string): boolean {
  return /^[1-9]\d{9,14}$/.test(phone);
}

export class DocumentReminderWhatsAppPreviewService {
  constructor(
    private readonly reminderService = new DocumentReminderService(),
  ) {}

  async createPreviews(today: Date = new Date()) {
    const candidates = await this.reminderService.findDueCandidates(today);

    return candidates.map((candidate) => {
      const { document, company, contact, decision } = candidate;

      const template =
        decision.type === "CLOSURE_APPLICATION"
          ? createClosureWhatsAppTemplate({
              companyName: company.name,
              documentNumber: document.documentNumber,
              targetDate: decision.targetDate,
            })
          : createExtensionWhatsAppTemplate({
              companyName: company.name,
              documentNumber: document.documentNumber,
              targetDate: decision.targetDate,
            });

      const warnings: string[] = [];

      const recipient = contact
        ? normalizeWhatsAppRecipient(contact.phone)
        : "";

      if (!contact) {
        warnings.push("Firma iletişim kaydı bulunamadı.");
      } else if (!contact.phone.trim()) {
        warnings.push("Firmanın iletişim telefon numarası boş.");
      } else if (!isValidWhatsAppRecipient(recipient)) {
        warnings.push("Firmanın iletişim telefon numarası geçersiz.");
      }

      return {
        documentId: document.id,
        companyId: company.id,
        companyName: company.name,
        contactId: contact?.id,
        contactName: contact?.fullName ?? "",
        recipient,
        type: decision.type,
        reminderMonth: decision.reminderMonth,
        targetDate: decision.targetDate,
        templateName: template.templateName,
        languageCode: template.languageCode,
        parameters: template.parameters,
        message: template.previewText,
        canSend: warnings.length === 0,
        warnings,
      };
    });
  }
}
