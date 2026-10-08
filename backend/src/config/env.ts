import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

dotenv.config();

function parsePositiveInteger(
  value: string | undefined,
  defaultValue: number,
  fieldName: string,
): number {
  const parsedValue = Number(value ?? defaultValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return parsedValue;
}

const port = Number(process.env.PORT ?? 3001);
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "8h";

const smtpPort = process.env.SMTP_PORT
  ? Number(process.env.SMTP_PORT)
  : undefined;

const emailSendingEnabled = process.env.EMAIL_SENDING_ENABLED === "true";
const adminFallbackEmail = process.env.ADMIN_FALLBACK_EMAIL;
const emailTestSendingEnabled =
  process.env.EMAIL_TEST_SENDING_ENABLED === "true";

const whatsappQueueEnabled = process.env.WHATSAPP_QUEUE_ENABLED === "true";

const whatsappSendingEnabled = process.env.WHATSAPP_SENDING_ENABLED === "true";

// YENİ: Mail test modunun WhatsApp karşılığı.
const whatsappTestSendingEnabled =
  process.env.WHATSAPP_TEST_SENDING_ENABLED === "true";
const whatsappTestRecipient = process.env.WHATSAPP_TEST_RECIPIENT;

const whatsappApiVersion = process.env.WHATSAPP_API_VERSION ?? "v24.0";
const kapsoApiKey = process.env.KAPSO_API_KEY;
const kapsoPhoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;

const whatsappMaxMessagesPerHour = parsePositiveInteger(
  process.env.WHATSAPP_MAX_MESSAGES_PER_HOUR,
  30,
  "WHATSAPP_MAX_MESSAGES_PER_HOUR",
);

const whatsappMaxMessagesPerDay = parsePositiveInteger(
  process.env.WHATSAPP_MAX_MESSAGES_PER_DAY,
  200,
  "WHATSAPP_MAX_MESSAGES_PER_DAY",
);

const whatsappDelaySeconds = parsePositiveInteger(
  process.env.WHATSAPP_DELAY_SECONDS,
  10,
  "WHATSAPP_DELAY_SECONDS",
);

const emailTestRecipient = process.env.EMAIL_TEST_RECIPIENT;
const emailMaxMessagesPerHour = parsePositiveInteger(
  process.env.EMAIL_MAX_MESSAGES_PER_HOUR,
  40,
  "EMAIL_MAX_MESSAGES_PER_HOUR",
);

const emailMaxRecipientsPerHour = parsePositiveInteger(
  process.env.EMAIL_MAX_RECIPIENTS_PER_HOUR,
  90,
  "EMAIL_MAX_RECIPIENTS_PER_HOUR",
);

const emailMaxMessagesPerDay = parsePositiveInteger(
  process.env.EMAIL_MAX_MESSAGES_PER_DAY,
  100,
  "EMAIL_MAX_MESSAGES_PER_DAY",
);

const emailDelaySeconds = parsePositiveInteger(
  process.env.EMAIL_DELAY_SECONDS,
  90,
  "EMAIL_DELAY_SECONDS",
);
const reminderSchedulerEnabled =
  process.env.REMINDER_SCHEDULER_ENABLED === "true";

const reminderQueueIntervalMinutes = parsePositiveInteger(
  process.env.REMINDER_QUEUE_INTERVAL_MINUTES,
  1440,
  "REMINDER_QUEUE_INTERVAL_MINUTES",
);

const reminderWorkerIntervalSeconds = parsePositiveInteger(
  process.env.REMINDER_WORKER_INTERVAL_SECONDS,
  60,
  "REMINDER_WORKER_INTERVAL_SECONDS",
);

if (Number.isNaN(port)) {
  throw new Error("PORT must be a valid number.");
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined. Add it to the .env file.");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not defined. Add it to the .env file.");
}

if (smtpPort !== undefined && Number.isNaN(smtpPort)) {
  throw new Error("SMTP_PORT must be a valid number.");
}

if (emailSendingEnabled && emailTestSendingEnabled) {
  throw new Error(
    "EMAIL_SENDING_ENABLED and EMAIL_TEST_SENDING_ENABLED cannot both be true.",
  );
}

if (emailTestSendingEnabled && !emailTestRecipient) {
  throw new Error(
    "EMAIL_TEST_RECIPIENT must be defined when EMAIL_TEST_SENDING_ENABLED is true.",
  );
}

// YENİ: WhatsApp ayar kontrolleri (mail kontrollerinin aynısı).
if (whatsappSendingEnabled && whatsappTestSendingEnabled) {
  throw new Error(
    "WHATSAPP_SENDING_ENABLED and WHATSAPP_TEST_SENDING_ENABLED cannot both be true.",
  );
}

if (whatsappTestSendingEnabled && !whatsappTestRecipient?.trim()) {
  throw new Error(
    "WHATSAPP_TEST_RECIPIENT must be defined when WHATSAPP_TEST_SENDING_ENABLED is true.",
  );
}

// YENİ: Gönderim açıkken Kapso ayarı eksikse uygulama açılmaz.
// Önceden worker sessizce duruyordu ve kimse fark etmiyordu.
if (whatsappSendingEnabled || whatsappTestSendingEnabled) {
  const missingWhatsAppFields: string[] = [];

  if (!kapsoApiKey?.trim()) missingWhatsAppFields.push("KAPSO_API_KEY");
  if (!kapsoPhoneNumberId?.trim()) {
    missingWhatsAppFields.push("KAPSO_PHONE_NUMBER_ID");
  }

  if (missingWhatsAppFields.length > 0) {
    throw new Error(
      `WhatsApp gönderimi açık ama ayarlar eksik: ${missingWhatsAppFields.join(", ")}`,
    );
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  databaseUrl,
  jwtSecret,
  jwtExpiresIn,

  smtpHost: process.env.SMTP_HOST,
  smtpPort,
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpFrom: process.env.SMTP_FROM,

  emailSendingEnabled,
  emailTestSendingEnabled,
  emailTestRecipient,
  adminFallbackEmail,
  whatsappQueueEnabled,
  whatsappSendingEnabled,
  whatsappTestSendingEnabled,
  whatsappTestRecipient,
  whatsappApiVersion,
  whatsappMaxMessagesPerHour,
  whatsappMaxMessagesPerDay,
  whatsappDelaySeconds,
  kapsoApiKey,
  kapsoPhoneNumberId,
  emailMaxMessagesPerHour,
  emailMaxRecipientsPerHour,
  emailMaxMessagesPerDay,
  emailDelaySeconds,
  reminderSchedulerEnabled,
  reminderQueueIntervalMinutes,
  reminderWorkerIntervalSeconds,
};

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
});

export const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"],
});