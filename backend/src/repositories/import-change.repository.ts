import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

export class ImportChangeRepository {
  async createMany(data: Prisma.ImportChangeCreateManyInput[]) {
    return prisma.importChange.createMany({
      data,
    });
  }

  async deleteByImportBatchId(importBatchId: number) {
    return prisma.importChange.deleteMany({
      where: {
        importBatchId,
      },
    });
  }

  async findByImportBatchId(importBatchId: number) {
    return prisma.importChange.findMany({
      where: {
        importBatchId,
      },
      orderBy: [
        {
          importRow: {
            rowNumber: "asc",
          },
        },
        {
          createdAt: "asc",
        },
      ],
      include: {
        importRow: true,
        company: true,
        document: true,
      },
    });
  }

  async countByImportBatchId(importBatchId: number) {
    return prisma.importChange.count({
      where: {
        importBatchId,
      },
    });
  }
}
