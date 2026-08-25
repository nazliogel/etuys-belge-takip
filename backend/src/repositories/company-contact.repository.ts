import { prisma } from "../config/env.js";

export class CompanyContactRepository {
  async findManyByCompanyId(companyId: number) {
    return prisma.companyContact.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(params: {
    companyId: number;
    fullName: string;
    email: string;
    phone: string;
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
    },
  ) {
    return prisma.companyContact.update({
      where: { id, companyId },
      data,
    });
  }
}
