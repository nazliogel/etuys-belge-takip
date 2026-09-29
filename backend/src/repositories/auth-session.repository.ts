import { prisma } from "../config/env.js";

export class AuthSessionRepository {
  create(userId: number) {
    return prisma.authSession.create({
      data: {
        userId,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });
  }

  findById(id: string) {
    return prisma.authSession.findUnique({ where: { id } });
  }

  touch(id: string) {
    const now = new Date();

    return prisma.authSession.updateMany({
      where: {
        id,
        revokedAt: null,
        expiresAt: { gt: now },
        lastActivityAt: {
          gt: new Date(now.getTime() - 30 * 60 * 1000),
        },
      },
      data: { lastActivityAt: now },
    });
  }

  revoke(id: string) {
    return prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
