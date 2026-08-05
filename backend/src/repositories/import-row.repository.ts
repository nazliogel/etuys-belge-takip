import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

export class ImportRowRepository {
  async createMany(data: Prisma.ImportRowCreateManyInput[]) {
    return prisma.importRow.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async deleteByImportBatchId(importBatchId: number) {
    return prisma.importRow.deleteMany({
      where: {
        importBatchId,
      },
    });
  }

  async findPendingChunk(importBatchId: number, take: number) {
    return prisma.importRow.findMany({
      where: {
        importBatchId,
        status: "PENDING",
      },
      orderBy: {
        rowNumber: "asc",
      },
      take,
    });
  }

  async updateComparisonResult(
    id: number,
    data: {
      status: "NEW" | "CHANGED" | "UNCHANGED" | "CONFLICT";
      companyId?: number | null;
      documentId?: number | null;
      errorMessage?: string | null;
    },
  ) {
    return prisma.importRow.update({
      where: {
        id,
      },
      data: {
        status: data.status,
        companyId: data.companyId,
        documentId: data.documentId,
        errorMessage: data.errorMessage,
      },
    });
  }
}
