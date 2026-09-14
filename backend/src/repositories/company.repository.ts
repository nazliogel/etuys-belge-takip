import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

export class CompanyRepository {
  async findMany(params: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
    consultantUserId?: number;
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

    if (params.consultantUserId !== undefined) {
      where.consultantUserId = params.consultantUserId;
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
    consultantUserId?: number;
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

    if (params.consultantUserId !== undefined) {
      where.consultantUserId = params.consultantUserId;
    }

    return prisma.company.count({
      where,
    });
  }
  async findAuthorizationRequired(params: { consultantUserId?: number }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const where: Prisma.CompanyWhereInput = {
      isActive: true,
      OR: [
        // Hiç yetkilendirme kaydı bulunmayanlar
        {
          authorization: {
            is: null,
          },
        },

        // Yetki bitiş tarihi bulunmayanlar
        {
          authorization: {
            is: {
              authorizationEndDate: null,
            },
          },
        },

        // Yetkisi geçmiş veya önümüzdeki 6 ay içinde bitecek olanlar
        {
          authorization: {
            is: {
              authorizationEndDate: {
                lte: sixMonthsLater,
              },
            },
          },
        },
      ],
    };

    // Operasyon kullanıcısı yalnızca kendisine atanmış firmaları görür
    if (params.consultantUserId !== undefined) {
      where.consultantUserId = params.consultantUserId;
    }

    return prisma.company.findMany({
      where,
      include: {
        authorization: true,
        documents: {
          where: {
            isActive: true,
            status: "OPEN",
          },
          select: {
            id: true,
            externalDocumentId: true,
            documentNumber: true,
          },
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

  async updateConsultant(
    companyId: number,
    consultant: string,
    consultantUserId?: number | null,
  ) {
    return prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        consultant,
        ...(consultantUserId !== undefined ? { consultantUserId } : {}),
      },
    });
  }
}
