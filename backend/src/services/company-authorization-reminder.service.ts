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
}
