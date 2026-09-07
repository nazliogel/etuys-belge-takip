import { DocumentReminderRepository } from "../repositories/document-reminder.repository.js";

type ReminderType = "EXTENSION_APPLICATION" | "CLOSURE_APPLICATION";

interface ReminderDecision {
  type: ReminderType;
  targetDate: Date;
  reminderMonth: number;
}

function normalizeDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function isSameDate(first: Date, second: Date): boolean {
  return normalizeDate(first).getTime() === normalizeDate(second).getTime();
}

function subtractMonthsClamped(date: Date, months: number): Date {
  const normalized = normalizeDate(date);

  const firstDayOfTargetMonth = new Date(
    Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth() - months, 1),
  );

  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstDayOfTargetMonth.getUTCFullYear(),
      firstDayOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      firstDayOfTargetMonth.getUTCFullYear(),
      firstDayOfTargetMonth.getUTCMonth(),
      Math.min(normalized.getUTCDate(), lastDayOfTargetMonth),
    ),
  );
}

function resolveReminderMonth(targetDate: Date, today: Date): number | null {
  const normalizedTarget = normalizeDate(targetDate);
  const normalizedToday = normalizeDate(today);

  if (normalizedToday >= normalizedTarget) {
    return null;
  }

  for (let month = 6; month >= 1; month -= 1) {
    const periodStart = subtractMonthsClamped(normalizedTarget, month);

    const periodEnd = subtractMonthsClamped(normalizedTarget, month - 1);

    if (normalizedToday >= periodStart && normalizedToday < periodEnd) {
      return month;
    }
  }

  return null;
}

export function resolveReminderDecision(
  documentEndDate: Date,
  extensionDate: Date,
  today: Date = new Date(),
): ReminderDecision | null {
  const type: ReminderType = isSameDate(documentEndDate, extensionDate)
    ? "EXTENSION_APPLICATION"
    : "CLOSURE_APPLICATION";

  const targetDate =
    type === "EXTENSION_APPLICATION"
      ? normalizeDate(documentEndDate)
      : normalizeDate(extensionDate);

  const reminderMonth = resolveReminderMonth(targetDate, today);

  if (reminderMonth === null) {
    return null;
  }

  return {
    type,
    targetDate,
    reminderMonth,
  };
}

export class DocumentReminderService {
  constructor(private readonly repository = new DocumentReminderRepository()) {}

  async findDueCandidates(today: Date = new Date()) {
    const documents = await this.repository.findActiveCandidates();

    return documents.flatMap((document) => {
      if (!document.documentEndDate || !document.extensionDate) {
        return [];
      }

      const decision = resolveReminderDecision(
        document.documentEndDate,
        document.extensionDate,
        today,
      );

      if (!decision) {
        return [];
      }

      const contact = document.company.contacts[0];

      return [
        {
          document,
          company: document.company,
          contact,
          decision,
        },
      ];
    });
  }
}
