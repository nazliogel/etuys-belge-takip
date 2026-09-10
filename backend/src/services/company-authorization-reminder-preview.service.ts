import { createAuthorizationExpiryEmailTemplate } from "./closure-email-template.service.js";
import { CompanyAuthorizationReminderService } from "./company-authorization-reminder.service.js";
import { DEFAULT_CC_RECIPIENTS } from "./document-reminder-preview.service.js";

export class CompanyAuthorizationReminderPreviewService {
  constructor(
    private readonly reminderService = new CompanyAuthorizationReminderService(),
  ) {}

  async createPreviews(today: Date = new Date()) {
    const candidates = await this.reminderService.findDueCandidates(today);

    return candidates.map((candidate) => {
      const { authorization, company, contact, decision } = candidate;

      const template = createAuthorizationExpiryEmailTemplate({
        companyName: company.name,
        targetDate: decision.targetDate,
      });

      const warnings: string[] = [];

      if (!contact) {
        warnings.push("Firma iletişim kaydı bulunamadı.");
      } else if (!contact.email.trim()) {
        warnings.push("Firmanın iletişim e-posta adresi boş.");
      }

      return {
        authorizationId: authorization.id,
        companyId: company.id,
        companyName: company.name,

        consultantUserId: company.consultantUser?.id,
        consultantName: company.consultantUser
          ? `${company.consultantUser.firstName} ${company.consultantUser.lastName}`.trim()
          : "",
        consultantIsActive: company.consultantUser?.isActive ?? false,
        consultantRole: company.consultantUser?.role,
        contactId: contact?.id,
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
