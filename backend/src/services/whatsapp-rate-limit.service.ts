import { env, prisma } from "../config/env.js";
import { getTurkeyDayStart } from "../utils/turkey-date.js";

export class WhatsAppRateLimitService {
  async check(now: Date = new Date()) {
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
    const dayStart = getTurkeyDayStart(now);

    const sentWhere = (since: Date) => ({
      channel: "WHATSAPP" as const,
      status: "SENT" as const,
      sentAt: { gte: since },
    });

    // Gerçekten denenmiş kayıtlar: gönderilen, kesin başarısız olan ve
    // geçici hata alıp tekrar denenmeyi bekleyen ("[deneme" önekli) kayıtlar.
    // Atlanan (SKIPPED) kayıtlar mesaj göndermediği için sayılmaz.
    // (Mailin yetkilendirme repository'sindeki findLatestAttemptedEmail ile aynı kural.)
    const attemptWhere = {
      channel: "WHATSAPP" as const,
      attemptedAt: { not: null },
      OR: [
        { status: { in: ["SENT", "FAILED"] as ("SENT" | "FAILED")[] } },
        { status: "PENDING" as const, errorMessage: { startsWith: "[deneme" } },
      ],
    };

    const [
      documentHourCount,
      authorizationHourCount,
      documentDayCount,
      authorizationDayCount,
      documentAttempt,
      authorizationAttempt,
    ] = await Promise.all([
      prisma.documentReminder.count({
        where: sentWhere(hourStart),
      }),
      prisma.companyAuthorizationReminder.count({
        where: sentWhere(hourStart),
      }),
      prisma.documentReminder.count({
        where: sentWhere(dayStart),
      }),
      prisma.companyAuthorizationReminder.count({
        where: sentWhere(dayStart),
      }),
      prisma.documentReminder.findFirst({
        where: attemptWhere,
        orderBy: { attemptedAt: "desc" },
        select: { attemptedAt: true },
      }),
      prisma.companyAuthorizationReminder.findFirst({
        where: attemptWhere,
        orderBy: { attemptedAt: "desc" },
        select: { attemptedAt: true },
      }),
    ]);

    if (
      documentHourCount + authorizationHourCount >=
      env.whatsappMaxMessagesPerHour
    ) {
      return {
        allowed: false,
        reason: "WHATSAPP_HOURLY_LIMIT_REACHED",
      };
    }

    if (
      documentDayCount + authorizationDayCount >=
      env.whatsappMaxMessagesPerDay
    ) {
      return {
        allowed: false,
        reason: "WHATSAPP_DAILY_LIMIT_REACHED",
      };
    }

    const latestAttempt = Math.max(
      documentAttempt?.attemptedAt?.getTime() ?? 0,
      authorizationAttempt?.attemptedAt?.getTime() ?? 0,
    );

    if (latestAttempt > 0) {
      const remainingMilliseconds =
        latestAttempt +
        env.whatsappDelaySeconds * 1000 -
        now.getTime();

      if (remainingMilliseconds > 0) {
        return {
          allowed: false,
          reason: "WHATSAPP_DELAY_ACTIVE",
          retryAfterSeconds: Math.ceil(remainingMilliseconds / 1000),
        };
      }
    }

    return { allowed: true };
  }
}