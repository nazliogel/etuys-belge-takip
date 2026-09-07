import {
  createClosureEmailTemplate,
  createExtensionEmailTemplate,
} from "./closure-email-template.service.js";

import { DocumentReminderService } from "./document-reminder.service.js";

export const DEFAULT_CC_RECIPIENTS = [
  /*"salihsahin@akkasgroup.com",
  "emininangu@akkasgroup.com",
  "ezgitemel@akkasgroup.com",
  "berkeincesu@aya.com.tr",
  "murathanaraci@aya.com.tr",*/
  "nazlicanogel@aya.com.tr",
];

export class DocumentReminderPreviewService {
  constructor(
    private readonly reminderService = new DocumentReminderService(),
  ) {}

  async createPreviews(today: Date = new Date()) {
    const candidates = await this.reminderService.findDueCandidates(today);

    return candidates.map((candidate) => {
      const { document, company, contact, decision } = candidate;

      const template =
        decision.type === "CLOSURE_APPLICATION"
          ? createClosureEmailTemplate({
              companyName: company.name,
              documentNumber:
                document.documentNumber ?? "Belge numarası bulunamadı",
              targetDate: decision.targetDate,
              investorAddress: company.identity?.investorAddress,
            })
          : createExtensionEmailTemplate({
              companyName: company.name,
              targetDate: decision.targetDate,
            });

      const warnings: string[] = [];

      if (!contact) {
        warnings.push("Firma iletişim kaydı bulunamadı.");
      } else if (!contact.email.trim()) {
        warnings.push("Firmanın iletişim e-posta adresi boş.");
      }

      if (decision.type === "CLOSURE_APPLICATION" && !document.documentNumber) {
        warnings.push("Belge numarası bulunamadı.");
      }

      if (
        decision.type === "CLOSURE_APPLICATION" &&
        !company.identity?.investorAddress
      ) {
        warnings.push("Firma adresi bulunamadı.");
      }

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
        contactId: contact?.id,
        contactName: contact?.fullName ?? "",
        recipient: contact?.email.trim() ?? "",
        cc: [...DEFAULT_CC_RECIPIENTS],
        type: decision.type,
        reminderMonth: decision.reminderMonth,
        targetDate: decision.targetDate,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: template.attachments.map((attachment) => ({
          filename: attachment.filename,
          path: attachment.path,
        })),
        canSend: warnings.length === 0,
        warnings,
      };
    });
  }
}
