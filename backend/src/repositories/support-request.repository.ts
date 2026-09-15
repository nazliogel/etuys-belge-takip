import type {
  Prisma,
  SupportRequestStatus,
} from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

type CreateSupportRequestParams = {
  companyId: number;
  assignedToId?: number | null;
  description: string;
};

export class SupportRequestRepository {
  async createWithNextTicketNumber(params: CreateSupportRequestParams) {
    return prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: {
          id: params.companyId,
        },
        data: {
          supportRequestSequence: {
            increment: 1,
          },
        },
        select: {
          supportRequestSequence: true,
        },
      });

      const ticketNumber = `T${String(company.supportRequestSequence).padStart(
        4,
        "0",
      )}`;

      return tx.supportRequest.create({
        data: {
          ticketNumber,

          company: {
            connect: {
              id: params.companyId,
            },
          },

          assignedTo: params.assignedToId
            ? {
                connect: {
                  id: params.assignedToId,
                },
              }
            : undefined,

          topic: "DOCUMENT_GENERAL",

          section: null,
          externalDocumentId: null,
          documentNumber: null,
          relatedRecordId: null,
          relatedRecordName: null,

          description: params.description,
          status: "SENT",
        },

        include: {
          company: true,
          assignedTo: true,
        },
      });
    });
  }

  async findById(id: number) {
    return prisma.supportRequest.findUnique({
      where: { id },
      include: {
        company: true,
        assignedTo: true,
      },
    });
  }

  async findMany(params: {
    companyId?: number;
    assignedToId?: number;
    status?: SupportRequestStatus;
  }) {
    const where: Prisma.SupportRequestWhereInput = {};

    if (params.companyId) {
      where.companyId = params.companyId;
    }

    if (params.assignedToId) {
      where.assignedToId = params.assignedToId;
    }

    if (params.status) {
      where.status = params.status;
    }

    return prisma.supportRequest.findMany({
      where,
      include: {
        company: true,
        assignedTo: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // Talebi okundu/görüldü yap
  async markViewed(id: number) {
    return prisma.supportRequest.update({
      where: { id },
      data: {
        viewedAt: new Date(),
      },
      include: {
        company: true,
        assignedTo: true,
      },
    });
  }

  // Talebi tekrar okunmadı yap
  async markUnread(id: number) {
    return prisma.supportRequest.update({
      where: { id },
      data: {
        viewedAt: null,
      },
      include: {
        company: true,
        assignedTo: true,
      },
    });
  }

  // Giriş yapan uzmana ait okunmamış talep sayısı
  async countUnreadByAssignedTo(assignedToId: number) {
    return prisma.supportRequest.count({
      where: {
        assignedToId,
        viewedAt: null,
      },
    });
  }

  async markInProgress(id: number) {
    return prisma.supportRequest.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
      },
      include: {
        company: true,
        assignedTo: true,
      },
    });
  }

  async resolve(id: number) {
    return prisma.supportRequest.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
      include: {
        company: true,
        assignedTo: true,
      },
    });
  }
}
