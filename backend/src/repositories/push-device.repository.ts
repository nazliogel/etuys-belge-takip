import { prisma } from "../config/env.js";

type RegisterPushDeviceInput = {
  userId: number;
  token: string;
  platform: "ANDROID" | "IOS";
};

export class PushDeviceRepository {
  async register(data: RegisterPushDeviceInput) {
    return prisma.pushDevice.upsert({
      where: {
        token: data.token,
      },
      create: {
        userId: data.userId,
        token: data.token,
        platform: data.platform,
        isActive: true,
        lastSeenAt: new Date(),
      },
      update: {
        userId: data.userId,
        platform: data.platform,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  async deactivate(userId: number, token: string) {
    return prisma.pushDevice.updateMany({
      where: {
        userId,
        token,
      },
      data: {
        isActive: false,
      },
    });
  }

  async findActiveByCompanyId(companyId: number) {
    return prisma.pushDevice.findMany({
      where: {
        isActive: true,
        user: {
          isActive: true,
          role: "COMPANY",
          companyId,
          company: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        token: true,
      },
    });
  }

  async deactivateInvalidToken(id: number, token: string) {
    return prisma.pushDevice.updateMany({
      where: {
        id,
        token,
      },
      data: {
        isActive: false,
      },
    });
  }
}
