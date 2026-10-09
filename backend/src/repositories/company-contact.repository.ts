import { prisma } from "../config/env.js";

export class CompanyContactRepository {
  async findManyByCompanyId(companyId: number) {
    return prisma.companyContact.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }
  async findLatestByCompanyId(companyId: number) {
    return prisma.companyContact.findFirst({
      where: {
        companyId,
        email: {
          not: "",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
  async create(params: {
    companyId: number;
    fullName: string;
    email: string;
    phone: string;
    position: string;
  }) {
    return prisma.companyContact.create({
      data: params,
    });
  }

  async update(
    id: number,
    companyId: number,
    data: {
      fullName: string;
      email: string;
      phone: string;
      position: string;
    },
  ) {
    return prisma.companyContact.update({
      where: { id, companyId },
      data,
    });
  }
  async findById(id: number, companyId: number) {
    return prisma.companyContact.findFirst({
      where: { id, companyId },
    });
  }

  async updateStatus(id: number, companyId: number, isActive: boolean) {
    return prisma.companyContact.update({
      where: { id, companyId },
      data: { isActive },
    });
  }
}
