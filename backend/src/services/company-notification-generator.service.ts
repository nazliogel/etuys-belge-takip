import { prisma } from "../config/env.js";
import { CompanyNotificationRepository } from "../repositories/company-notification.repository.js";
import { CompanyRequestRepository } from "../repositories/company-request.repository.js";
import {
  normalizeDate,
  resolveReminderDecision,
  getExtensionRightDeadline,
} from "./document-reminder.service.js";
import {
  hasOpenIncentiveDocument,
  resolveAuthorizationReminderDecision,
} from "./company-authorization-reminder.service.js";

function getTurkeyDate(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)!.value);

  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "UTC",
  }).format(date);
}

export class CompanyNotificationGeneratorService {
  constructor(
    private readonly repository = new CompanyNotificationRepository(),
    private readonly requestRepository = new CompanyRequestRepository(),
  ) {}

  async generateDueNotifications(now: Date = new Date()) {
    const today = getTurkeyDate(now);

    const period = [
      today.getUTCFullYear(),
      String(today.getUTCMonth() + 1).padStart(2, "0"),
    ].join("-");

    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        documents: {
          some: {
            isActive: true,
            status: "OPEN",
          },
        },
      },
      select: {
        id: true,
        authorization: {
          select: {
            authorizationEndDate: true,
          },
        },
        documents: {
          where: {
            isActive: true,
            status: "OPEN",
          },
          select: {
            externalDocumentId: true,
            documentNumber: true,
            documentEndDate: true,
            extensionDate: true,
          },
        },
        closedDocuments: {
          select: {
            externalDocumentId: true,
          },
        },
      },
    });

    let createdCount = 0;
    let duplicateCount = 0;
    let authorizationBlockedCompanyCount = 0;

    for (const company of companies) {
      // Mevcut açık belge kontrolünü kullanıyoruz.
      if (!hasOpenIncentiveDocument(company)) continue;

      const authorizationEndDate = company.authorization?.authorizationEndDate;

      if (authorizationEndDate) {
        const targetDate = normalizeDate(authorizationEndDate);

        // Yetki mailiyle aynı 2 aylık başlangıç kuralını kullan.
        // Yetki süresi geçtikten sonra hatırlatmalar devam eder.
        if (resolveAuthorizationReminderDecision(targetDate, today)) {
          const created = await this.repository.createOnce({
            companyId: company.id,
            type: "AUTHORIZATION_RENEWAL",
            title: "Yetki yenileme hatırlatması",
            description:
              targetDate < today
                ? `Firmanızın yetki süresi ${formatDate(targetDate)} tarihinde sona ermiştir. Yetki yenileme işlemleri için danışmanınızla iletişime geçiniz.`
                : `Firmanızın yetki süresi ${formatDate(targetDate)} tarihinde sona erecektir. Yetki yenileme hazırlıkları için danışmanınızla iletişime geçiniz.`,
            targetDate,
            period,
            dedupeKey: [
              "AUTHORIZATION",
              company.id,
              targetDate.toISOString().slice(0, 10),
              period,
            ].join(":"),
          });

          if (created) createdCount += 1;
          else duplicateCount += 1;
        }
      }

      // Yetki tarihi bulunmuyorsa belge bildirimi oluşturulmaz.
      if (!authorizationEndDate) {
        authorizationBlockedCompanyCount += 1;
        continue;
      }

      const authorizationExpired = normalizeDate(authorizationEndDate) < today;

      const closedIds = new Set(
        company.closedDocuments.map((document) => document.externalDocumentId),
      );

      for (const document of company.documents) {
        if (closedIds.has(document.externalDocumentId)) continue;

        if (!document.documentEndDate || !document.extensionDate) {
          continue;
        }

        const endDate = normalizeDate(document.documentEndDate);
        const targetDate = normalizeDate(document.extensionDate);

        const hasNoExtension = endDate.getTime() === targetDate.getTime();

        // Mail ile aynı süre uzatma ve kapatma kurallarını kullan.
        const decision = resolveReminderDecision(endDate, targetDate, today);

        if (!decision) continue;

        const type = decision.type;

        const closureRequest =
          await this.requestRepository.findLatestClosureRequest({
            companyId: company.id,
            externalDocumentId: document.externalDocumentId,
          });

        if (type === "EXTENSION_APPLICATION" && closureRequest) {
          continue;
        }

        if (type === "CLOSURE_APPLICATION" && closureRequest) {
          const status = closureRequest.requestStatus
            ?.trim()
            .toLocaleUpperCase("tr-TR");

          if (status !== "REDDEDİLDİ") continue;
        }

        const documentLabel = document.documentNumber
          ? `${document.documentNumber} numaralı belgenizin`
          : `ID ${document.externalDocumentId} olan belgenizin`;

        const isExtension = type === "EXTENSION_APPLICATION";

        const extendedEndDate = getExtensionRightDeadline(endDate);

        const endDateText =
          endDate < today
            ? `${formatDate(endDate)} tarihinde dolmuştur.`
            : endDate.getTime() === today.getTime()
              ? "bugün dolmaktadır."
              : `${formatDate(endDate)} tarihinde dolacaktır.`;

        const description = isExtension
          ? `${documentLabel} süresi ${endDateText} Uzatma başvurunuz onaylanırsa belgenizi ${formatDate(extendedEndDate)} tarihine kadar kullanabilirsiniz.\n\nBaşvuru için danışmanınızla iletişime geçiniz.`
          : hasNoExtension
            ? `${documentLabel} süre uzatma başvurusu için tanınan ilave süre sona ermiştir. Kapatma işlemleri için danışmanınızla iletişime geçiniz.`
            : targetDate < today
              ? `${documentLabel} uzatılmış süresi ${formatDate(targetDate)} tarihinde sona ermiştir. Kapatma işlemleri için danışmanınızla iletişime geçiniz.`
              : `${documentLabel} uzatılmış süresi ${formatDate(targetDate)} tarihinde sona erecektir. Kapatma sürecine ilişkin hazırlıklar için danışmanınızla iletişime geçiniz.`;
        const created = await this.repository.createOnce({
          companyId: company.id,
          type,
          title: isExtension
            ? "Süre uzatma başvurusu hatırlatması"
            : "Belge kapatma hatırlatması",
          description: authorizationExpired
            ? `${description}\n\nEkranlarınızın takibi, olası teşvik belgesi süre uzatma ya da kapatma işlemlerinin yapılabilmesi ve genel süreçlerinizin takip edilebilmesi için yetkilendirme işlemlerinin yapılması gerekmektedir.`
            : description,
          externalDocumentId: document.externalDocumentId,
          documentNumber: document.documentNumber,
          targetDate,
          period,
          dedupeKey: [
            "DOCUMENT",
            company.id,
            document.externalDocumentId,
            type,
            targetDate.toISOString().slice(0, 10),
            period,
          ].join(":"),
        });

        if (created) createdCount += 1;
        else duplicateCount += 1;
      }
    }

    return {
      period,
      checkedCompanyCount: companies.length,
      createdCount,
      duplicateCount,
      authorizationBlockedCompanyCount,
    };
  }
}
