import { prisma } from "../config/env.js";

export class CompanyNoteRepository {
  async findManyByCompanyId(companyId: number) {
    return prisma.companyNote.findMany({
      where: { companyId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(params: { companyId: number; text: string; authorId: number }) {
    return prisma.companyNote.create({
      data: params,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async update(id: number, companyId: number, text: string) {
    return prisma.companyNote.update({
      where: { id, companyId },
      data: { text },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
