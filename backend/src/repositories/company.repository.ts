import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

export class CompanyRepository {
  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.CompanyWhereInput = {};

    if (params.search) {
      where.OR = [
        {
          name: {
            contains: params.search,
            mode: "insensitive",
          },
        },
        {
          taxNumber: {
            contains: params.search,
          },
        },
        {
          externalCompanyId: {
            equals: Number(params.search) || undefined,
          },
        },
      ];
    }

    if (typeof params.isActive === "boolean") {
      where.isActive = params.isActive;
    }

    return prisma.company.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: {
        name: "asc",
      },
      include: {
        authorization: true,
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });
  }

  async count(params: {
    search?: string;
    isActive?: boolean;
  }): Promise<number> {
    const where: Prisma.CompanyWhereInput = {};

    if (params.search) {
      where.OR = [
        {
          name: {
            contains: params.search,
            mode: "insensitive",
          },
        },
        {
          taxNumber: {
            contains: params.search,
          },
        },
        {
          externalCompanyId: {
            equals: Number(params.search) || undefined,
          },
        },
      ];
    }

    if (typeof params.isActive === "boolean") {
      where.isActive = params.isActive;
    }

    return prisma.company.count({
      where,
    });
  }

  async findById(id: number) {
    return prisma.company.findUnique({
      where: {
        id,
      },
      include: {
        authorization: true,
        documents: {
          orderBy: {
            documentNumber: "asc",
          },
        },
        changeHistory: {
          orderBy: {
            changedAt: "desc",
          },
          take: 50,
        },
      },
    });
  }

  async findByUserId(userId: number) {
    return prisma.company.findFirst({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        authorization: true,
        documents: {
          orderBy: {
            documentNumber: "asc",
          },
        },
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });
  }

  async update(id: number, data: Prisma.CompanyUpdateInput) {
    return prisma.company.update({
      where: {
        id,
      },
      data,
      include: {
        authorization: true,
        documents: true,
      },
    });
  }

  async updateTaxNumber(companyId: number, taxNumber: string) {
    return prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        taxNumber,
      },
    });
  }

  async updateConsultant(companyId: number, consultant: string) {
    return prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        consultant,
      },
    });
  }
}
