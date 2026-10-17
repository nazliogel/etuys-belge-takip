import { getFirebaseMessaging } from "../config/firebase.js";
import { PushDeviceRepository } from "../repositories/push-device.repository.js";

type CompanyPushInput = {
  notificationId: number;
  companyId: number;
  title: string;
  description: string;
  type: string;
};

export class PushNotificationService {
  constructor(private readonly repository = new PushDeviceRepository()) {}

  async sendToCompany(input: CompanyPushInput): Promise<void> {
    try {
      const messaging = getFirebaseMessaging();

      if (!messaging) return;

      const devices = await this.repository.findActiveByCompanyId(
        input.companyId,
      );

      for (let offset = 0; offset < devices.length; offset += 500) {
        const batch = devices.slice(offset, offset + 500);

        const result = await messaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
          notification: {
            title: input.title,
            body: input.description.slice(0, 500),
          },
          data: {
            notificationId: String(input.notificationId),
            companyId: String(input.companyId),
            type: input.type,
            screen: "company-notifications",
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        });

        for (const [index, response] of result.responses.entries()) {
          if (response.success) continue;

          const code = response.error?.code;
          const device = batch[index];

          if (
            device &&
            (code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-registration-token")
          ) {
            await this.repository.deactivateInvalidToken(
              device.id,
              device.token,
            );
          }

          console.error("Push gönderimi başarısız:", {
            notificationId: input.notificationId,
            deviceId: device?.id,
            code,
          });
        }
      }
    } catch (error) {
      console.error("Firma push bildirimi gönderilemedi:", {
        notificationId: input.notificationId,
        message: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
    }
  }
}
