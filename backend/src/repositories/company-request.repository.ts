import { prisma } from "../config/env.js";
import type { Prisma } from "../generated/prisma/client.js";

export interface CompanyRequestListParams {
  skip: number;
  take: number;
  companyId?: number;
  search?: string;
  requestStatus?: string;
}

export class CompanyRequestRepository {
  async findCompanyByExternalCompanyId(externalCompanyId: number) {
    return prisma.company.findUnique({
      where: {
        externalCompanyId,
      },
    });
  }
  async findDocumentByExternalDocumentId(externalDocumentId: number) {
    return prisma.incentiveDocument.findUnique({
      where: {
        externalDocumentId,
      },
      select: {
        id: true,
        externalDocumentId: true,
        companyId: true,
        documentNumber: true,
        company: {
          select: {
            id: true,
            externalCompanyId: true,
            name: true,
          },
        },
      },
    });
  }
  async findByCompanyAndRequestNumber(
    companyId: number,
    requestNumber: number,
  ) {
    return prisma.companyRequest.findUnique({
      where: {
        companyId_requestNumber: {
          companyId,
          requestNumber,
        },
      },
      include: {
        company: true,
      },
    });
  }

  async upsert(params: {
    companyId: number;
    requestNumber: number;
    externalDocumentId?: number | null;
    documentNumber?: string | null;
    note?: string | null;
    requestType?: string | null;
    requestStatus?: string | null;
    department?: string | null;
    assignedPersonnel?: string | null;
    informationPerson?: string | null;
    applicationDate?: Date | null;
    completionDate?: Date | null;
  }) {
    const {
      companyId,
      requestNumber,
      externalDocumentId,
      documentNumber,
      note,
      requestType,
      requestStatus,
      department,
      assignedPersonnel,
      informationPerson,
      applicationDate,
      completionDate,
    } = params;

    return prisma.companyRequest.upsert({
      where: {
        companyId_requestNumber: {
          companyId,
          requestNumber,
        },
      },

      create: {
        companyId,
        requestNumber,
        externalDocumentId,
        documentNumber,
        note,
        requestType,
        requestStatus,
        department,
        assignedPersonnel,
        informationPerson,
        applicationDate,
        completionDate,
      },

      update: {
        externalDocumentId,
        documentNumber,
        note,
        requestType,
        requestStatus,
        department,
        assignedPersonnel,
        informationPerson,
        applicationDate,
        completionDate,
      },
    });
  }

  async findMany(params: CompanyRequestListParams) {
    const where = this.createWhereInput(params);

    return prisma.companyRequest.findMany({
      where,
      skip: params.skip,
      take: params.take,
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
      orderBy: [
        {
          applicationDate: "desc",
        },
        {
          id: "desc",
        },
      ],
    });
  }

  async count(params: Omit<CompanyRequestListParams, "skip" | "take">) {
    const where = this.createWhereInput({
      ...params,
      skip: 0,
      take: 1,
    });

    return prisma.companyRequest.count({
      where,
    });
  }

  private createWhereInput(
    params: CompanyRequestListParams,
  ): Prisma.CompanyRequestWhereInput {
    const search = params.search?.trim();

    const numericSearch =
      search && /^\d+$/.test(search) ? Number(search) : null;

    return {
      companyId: params.companyId,

      requestStatus: params.requestStatus
        ? {
            equals: params.requestStatus,
            mode: "insensitive",
          }
        : undefined,

      OR: search
        ? [
            ...(numericSearch !== null && Number.isSafeInteger(numericSearch)
              ? [
                  {
                    requestNumber: numericSearch,
                  },
                ]
              : []),

            {
              documentNumber: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              requestType: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              requestStatus: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              department: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              assignedPersonnel: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              informationPerson: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              company: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ]
        : undefined,
    };
  }
}
