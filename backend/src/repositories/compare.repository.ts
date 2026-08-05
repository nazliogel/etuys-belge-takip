import { prisma } from "../config/env.js";

export class CompareRepository {
  async findCompaniesByExternalIds(externalCompanyIds: number[]) {
    const uniqueIds = [...new Set(externalCompanyIds)];

    if (uniqueIds.length === 0) {
      return [];
    }

    return prisma.company.findMany({
      where: {
        externalCompanyId: {
          in: uniqueIds,
        },
      },
      include: {
        authorization: true,
      },
    });
  }

  async findDocumentsByExternalIds(externalDocumentIds: number[]) {
    const uniqueIds = [...new Set(externalDocumentIds)];

    if (uniqueIds.length === 0) {
      return [];
    }

    return prisma.incentiveDocument.findMany({
      where: {
        externalDocumentId: {
          in: uniqueIds,
        },
      },
    });
  }
}
