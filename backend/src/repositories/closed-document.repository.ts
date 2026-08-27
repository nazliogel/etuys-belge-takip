import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

export class ClosedDocumentRepository {
  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
    companyId?: number;
  }) {
    const where: Prisma.ClosedIncentiveDocumentWhereInput = {};

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

    if (params.companyId !== undefined) {
      where.companyId = params.companyId;
    }

    return prisma.closedIncentiveDocument.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: {
        documentEndDate: {
          sort: "desc",
          nulls: "last",
        },
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
    companyId?: number;
  }): Promise<number> {
    const where: Prisma.ClosedIncentiveDocumentWhereInput = {};

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

    if (params.companyId !== undefined) {
      where.companyId = params.companyId;
    }

    return prisma.closedIncentiveDocument.count({
      where,
    });
  }

  async findById(id: number) {
    return prisma.closedIncentiveDocument.findUnique({
      where: {
        id,
      },
      include: {
        company: {
          include: {
            authorization: true,
          },
        },
      },
    });
  }

  async findByExternalDocumentId(externalDocumentId: number) {
    return prisma.closedIncentiveDocument.findUnique({
      where: {
        externalDocumentId,
      },
    });
  }

  async create(data: Prisma.ClosedIncentiveDocumentUncheckedCreateInput) {
    return prisma.closedIncentiveDocument.create({
      data,
    });
  }

  async update(
    id: number,
    data: Prisma.ClosedIncentiveDocumentUncheckedUpdateInput,
  ) {
    return prisma.closedIncentiveDocument.update({
      where: {
        id,
      },
      data,
    });
  }
}
