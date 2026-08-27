import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

export class DocumentRepository {
  async findMany(params: {
    search?: string;
    isActive?: boolean;
    companyId?: number;
    status?: "OPEN" | "CLOSED" | "CANCELLED";
  }) {
    const where: Prisma.IncentiveDocumentWhereInput = {};

    if (params.search) {
      where.OR = [
        {
          documentNumber: {
            contains: params.search,
            mode: "insensitive",
          },
        },
        {
          company: {
            name: {
              contains: params.search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    if (typeof params.isActive === "boolean") {
      where.isActive = params.isActive;
    }

    if (params.companyId !== undefined) {
      where.companyId = params.companyId;
    }

    if (params.status) {
      where.status = params.status;
    }

    return prisma.incentiveDocument.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        company: {
          select: {
            id: true,
            externalCompanyId: true,
            name: true,
            taxNumber: true,
          },
        },
      },
    });
  }

  async count(params: {
    search?: string;
    isActive?: boolean;
    companyId?: number;
  }): Promise<number> {
    const where: Prisma.IncentiveDocumentWhereInput = {};

    if (params.search) {
      where.OR = [
        {
          documentNumber: {
            contains: params.search,
            mode: "insensitive",
          },
        },
        {
          company: {
            name: {
              contains: params.search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    if (typeof params.isActive === "boolean") {
      where.isActive = params.isActive;
    }

    if (params.companyId !== undefined) {
      where.companyId = params.companyId;
    }

    return prisma.incentiveDocument.count({
      where,
    });
  }

  async findById(id: number) {
    return prisma.incentiveDocument.findUnique({
      where: {
        id,
      },
      include: {
        company: {
          include: {
            authorization: true,
          },
        },
        detail: {
          include: {
            products: true,
          },
        },
      },
    });
  }
}
