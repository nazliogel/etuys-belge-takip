import { prisma } from "../config/env.js";
import type { IncentiveDocumentConditionStatus } from "../generated/prisma/client.js";

export type ConditionListFilters = {
  status?: IncentiveDocumentConditionStatus;
  search?: string;
};

export class IncentiveDocumentConditionRepository {
  async findMany(filters: ConditionListFilters = {}) {
    const search = filters.search?.trim();

    return prisma.incentiveDocumentCondition.findMany({
      where: {
        isActive: true,
        ...(filters.status ? { status: filters.status } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  }

  async create(data: {
    title: string;
    description: string;
    sortOrder: number;
    status: IncentiveDocumentConditionStatus;
  }) {
    return prisma.incentiveDocumentCondition.create({ data });
  }

  async findActiveById(id: number) {
    return prisma.incentiveDocumentCondition.findFirst({
      where: { id, isActive: true },
    });
  }

  async update(
    id: number,
    data: {
      title?: string;
      description?: string;
      sortOrder?: number;
      status?: IncentiveDocumentConditionStatus;
    },
  ) {
    return prisma.incentiveDocumentCondition.updateMany({
      where: { id, isActive: true },
      data,
    });
  }

  async setActive(id: number, isActive: boolean) {
    return prisma.incentiveDocumentCondition.updateMany({
      where: { id, isActive: true },
      data: { isActive },
    });
  }

  async reorder(items: Array<{ id: number; sortOrder: number }>) {
    return prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        prisma.incentiveDocumentCondition.updateMany({
          where: { id, isActive: true },
          data: { sortOrder },
        }),
      ),
    );
  }
}