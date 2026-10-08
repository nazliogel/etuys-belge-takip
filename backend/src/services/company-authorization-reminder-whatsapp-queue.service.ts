import { CompanyAuthorizationReminderRepository } from "../repositories/company-authorization-reminder.repository.js";
import { CompanyAuthorizationReminderService } from "./company-authorization-reminder.service.js";
import { normalizeWhatsAppRecipient } from "./document-reminder-whatsapp-preview.service.js";
import { createAuthorizationWhatsAppTemplate } from "./whatsapp-template.service.js";

function getTurkeyDay(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const getPart = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(
    Date.UTC(getPart("year"), getPart("month") - 1, getPart("day")),
  );
}

interface BlockedReminder {
  authorizationId: number;
  companyName: string;
  warnings: string[];
}

export class CompanyAuthorizationReminderWhatsAppQueueService {
  constructor(
    private readonly repository =
      new CompanyAuthorizationReminderRepository(),
    private readonly reminderService =
      new CompanyAuthorizationReminderService(),
  ) {}

  async enqueueDueReminders(now: Date = new Date()) {
    const today = getTurkeyDay(now);
    const candidates = await this.reminderService.findDueCandidates(today);

    let queuedCount = 0;
    let duplicateCount = 0;
    let notExpiredCount = 0;

    const blocked: BlockedReminder[] = [];

    for (const candidate of candidates) {
      const { authorization, company, contact, decision } = candidate;
      const endDate = authorization.authorizationEndDate;

      // Sabit WhatsApp metni yalnızca yetki süresi dolanlar içindir.
      if (!endDate || endDate.getTime() >= today.getTime()) {
        notExpiredCount += 1;
        continue;
      }

      const warnings: string[] = [];
      const recipient = contact
        ? normalizeWhatsAppRecipient(contact.phone)
        : "";

      if (!contact) {
        warnings.push("Firma iletişim kaydı bulunamadı.");
      } else if (!contact.phone.trim()) {
        warnings.push("Firma iletişim telefon numarası boş.");
      } else if (!/^[1-9]\d{9,14}$/.test(recipient)) {
        warnings.push("Firma iletişim telefon numarası geçersiz.");
      }

      if (warnings.length > 0) {
        blocked.push({
          authorizationId: authorization.id,
          companyName: company.name,
          warnings,
        });
        continue;
      }

      const template = createAuthorizationWhatsAppTemplate({
        companyName: company.name,
        targetDate: decision.targetDate,
        today: now,
      });

      const queued = await this.repository.enqueueWhatsApp({
        authorizationId: authorization.id,
        companyId: company.id,
        contactId: contact?.id,
        reminderMonth: decision.reminderMonth,
        targetDate: decision.targetDate,
        recipient,
        message: template.previewText,
      });

      if (queued) {
        queuedCount += 1;
      } else {
        duplicateCount += 1;
      }
    }

    return {
      totalCount: candidates.length,
      queuedCount,
      duplicateCount,
      blockedCount: blocked.length,
      notExpiredCount,
      blocked,
    };
  }
}