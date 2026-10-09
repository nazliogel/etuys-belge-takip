import { createAuthorizationExpiryEmailTemplate } from "./closure-email-template.service.js";
import { CompanyAuthorizationReminderService } from "./company-authorization-reminder.service.js";
import { DEFAULT_CC_RECIPIENTS } from "./document-reminder-preview.service.js";
import {
  collectEmailRecipients,
  collectWhatsAppRecipients,
  getEmailWarnings,
  getWhatsAppWarnings,
  joinEmailRecipients,
  joinWhatsAppRecipients,
} from "./reminder-contact-check.js";

export class CompanyAuthorizationReminderPreviewService {
  constructor(
    private readonly reminderService = new CompanyAuthorizationReminderService(),
  ) {}

  async createPreviews(today: Date = new Date()) {
    const candidates = await this.reminderService.findDueCandidates(today);

    return candidates.map((candidate) => {
      const { authorization, company, contact, decision } = candidate;

      // YENİ: Firmanın BÜTÜN iletişim kayıtları (en yeni önce).
      const contacts = company.contacts;

      const template = createAuthorizationExpiryEmailTemplate({
        companyName: company.name,
        targetDate: decision.targetDate,
      });

      const warnings = getEmailWarnings(contacts);
      const whatsappWarnings = getWhatsAppWarnings(contacts);

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
        // Kayıtta bağlantı için en yeni iletişim kişisi tutulur.
        contactId: contact?.id,
        // YENİ: Bütün kişilerin bütün geçerli e-posta adresleri ("a@x.com; b@y.com").
        recipient: joinEmailRecipients(collectEmailRecipients(contacts)),

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

        // YENİ: Bütün kişilerin bütün cep numaraları ("905…,905…").
        whatsappRecipient: joinWhatsAppRecipients(
          collectWhatsAppRecipients(contacts),
        ),
        whatsappCanSend: whatsappWarnings.length === 0,
        whatsappWarnings,
      };
    });
  }
}