import { CompanyAuthorizationReminderRepository } from "../repositories/company-authorization-reminder.repository.js";
import {
  normalizeDate,
  resolveReminderMonth,
} from "./document-reminder.service.js";

interface AuthorizationReminderDecision {
  type: "AUTHORIZATION_EXPIRY";
  targetDate: Date;
  reminderMonth: number;
}

export function hasOpenIncentiveDocument(company: {
  documents: { externalDocumentId: number }[];
  closedDocuments: { externalDocumentId: number }[];
}): boolean {
  const closedIds = new Set(
    company.closedDocuments.map((document) => document.externalDocumentId),
  );

  return company.documents.some(
    (document) => !closedIds.has(document.externalDocumentId),
  );
}

export const NO_OPEN_DOCUMENT_SKIP_REASON =
  "Firmanın açık teşvik belgesi bulunmuyor (tüm belgeler kapalı veya iptal). Yetkilendirme bildirimi gönderilmedi.";

export function resolveAuthorizationReminderDecision(
  authorizationEndDate: Date,
  today: Date = new Date(),
): AuthorizationReminderDecision | null {
  const targetDate = normalizeDate(authorizationEndDate);
  const reminderMonth = resolveReminderMonth(targetDate, today);

  if (reminderMonth === null) {
    return null;
  }

  return {
    type: "AUTHORIZATION_EXPIRY",
    targetDate,
    reminderMonth,
  };
}

export class CompanyAuthorizationReminderService {
  constructor(
    private readonly repository = new CompanyAuthorizationReminderRepository(),
  ) {}

  async findDueCandidates(today: Date = new Date()) {
    const authorizations = await this.repository.findActiveCandidates();

    return authorizations.flatMap((authorization) => {
      if (!authorization.authorizationEndDate) {
        return [];
      }

      // YENİ: Firmanın açık belgesi kalmadıysa (hepsi kapalı / iptal)
      // yetkilendirme bildirimine gerek yok.
      if (!hasOpenIncentiveDocument(authorization.company)) {
        return [];
      }

      const decision = resolveAuthorizationReminderDecision(
        authorization.authorizationEndDate,
        today,
      );

      if (!decision) {
        return [];
      }

      const contact = authorization.company.contacts[0];

      return [
        {
          authorization,
          company: authorization.company,
          contact,
          decision,
        },
      ];
    });
  }

  async companyHasOpenDocument(companyId: number): Promise<boolean> {
    const state = await this.repository.findCompanyDocumentState(companyId);

    if (!state) {
      return false;
    }

    return hasOpenIncentiveDocument(state);
  }
}
