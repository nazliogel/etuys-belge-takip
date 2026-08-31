import type {
  ImportBatchStatus,
  ImportType,
  Prisma,
} from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

export class ImportRepository {
  async createBatch(data: {
    fileName: string;
    storedFileName: string;
    uploadedById: number;
    isFullSnapshot?: boolean;
    importType?: ImportType;
  }) {
    return prisma.importBatch.create({
      data: {
        fileName: data.fileName,
        storedFileName: data.storedFileName,
        uploadedById: data.uploadedById,
        isFullSnapshot: data.isFullSnapshot ?? true,
        importType: data.importType ?? "OPEN",
        status: "UPLOADED",
      },
    });
  }

  async findMany(params: {
    skip: number;
    take: number;
    status?: ImportBatchStatus;
  }) {
    const where: Prisma.ImportBatchWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    return prisma.importBatch.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: {
        uploadedAt: "desc",
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async count(status?: ImportBatchStatus): Promise<number> {
    return prisma.importBatch.count({
      where: status
        ? {
            status,
          }
        : undefined,
    });
  }

  async findById(id: number) {
    return prisma.importBatch.findUnique({
      where: {
        id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        rows: {
          orderBy: {
            rowNumber: "asc",
          },
        },
        changes: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async updateStatistics(
    id: number,
    data: {
      totalRowCount: number;
      validRowCount: number;
      invalidRowCount: number;
    },
  ) {
    return prisma.importBatch.update({
      where: {
        id,
      },
      data: {
        totalRowCount: data.totalRowCount,
        validRowCount: data.validRowCount,
        invalidRowCount: data.invalidRowCount,
      },
    });
  }

  async updateComparisonStatistics(
    id: number,
    data: {
      newRowCount: number;
      changedRowCount: number;
      unchangedRowCount: number;
    },
  ) {
    return prisma.importBatch.update({
      where: {
        id,
      },
      data: {
        newRowCount: data.newRowCount,
        changedRowCount: data.changedRowCount,
        unchangedRowCount: data.unchangedRowCount,
      },
    });
  }

  async updateStatus(id: number, status: ImportBatchStatus) {
    return prisma.importBatch.update({
      where: {
        id,
      },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    });
  }

  async findChangesByBatchId(importBatchId: number) {
    return prisma.importChange.findMany({
      where: {
        importBatchId,
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        importRowId: true,
        entityType: true,
        changeType: true,
        fieldName: true,
        oldValue: true,
        newValue: true,
        status: true,
        companyId: true,
        documentId: true,

        company: {
          select: {
            id: true,
            externalCompanyId: true,
            name: true,
            taxNumber: true,
          },
        },

        document: {
          select: {
            id: true,
            externalDocumentId: true,
            documentNumber: true,
          },
        },
      },
    });
  }

  async getChangeSummary(importBatchId: number) {
    return prisma.importChange.groupBy({
      by: ["fieldName"],
      where: {
        importBatchId,
      },
      _count: {
        _all: true,
      },
    });
  }

  async findRowsByBatchId(
    importBatchId: number,
    status?: "NEW" | "CHANGED" | "UNCHANGED" | "INVALID" | "PENDING",
  ) {
    return prisma.importRow.findMany({
      where: {
        importBatchId,
        ...(status ? { status } : {}),
      },
      orderBy: {
        rowNumber: "asc",
      },
      select: {
        id: true,
        rowNumber: true,
        status: true,
        externalCompanyId: true,
        companyName: true,
        taxNumber: true,
        authorizationEndDate: true,
        externalDocumentId: true,
        documentNumber: true,
        documentStartDate: true,
        documentEndDate: true,
        extensionDate: true,
        supportClass: true,
        processStatus: true,
      },
    });
  }
}
