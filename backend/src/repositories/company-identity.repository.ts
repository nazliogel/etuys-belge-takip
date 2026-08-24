import { prisma } from "../config/env.js";

export class CompanyIdentityRepository {
  async findByCompanyId(companyId: number) {
    return prisma.companyIdentity.findUnique({
      where: {
        companyId,
      },
    });
  }

  async findByExternalCompanyId(externalCompanyId: number) {
    return prisma.company.findUnique({
      where: {
        externalCompanyId,
      },
      include: {
        identity: true,
      },
    });
  }

  async upsert(params: {
    companyId: number;
    investorStatus?: string | null;
    mersisNumber?: string | null;
    investorType?: string | null;
    investorAddress?: string | null;
    registrationDate?: Date | null;
    tradeRegistryNumber?: string | null;
    nationalId?: string | null;
    city?: string | null;
    district?: string | null;
    mainActivity?: string | null;
  }) {
    const {
      companyId,
      investorStatus,
      mersisNumber,
      investorType,
      investorAddress,
      registrationDate,
      tradeRegistryNumber,
      nationalId,
      city,
      district,
      mainActivity,
    } = params;

    return prisma.companyIdentity.upsert({
      where: {
        companyId,
      },

      create: {
        companyId,
        investorStatus,
        mersisNumber,
        investorType,
        investorAddress,
        registrationDate,
        tradeRegistryNumber,
        nationalId,
        city,
        district,
        mainActivity,
      },

      update: {
        investorStatus,
        mersisNumber,
        investorType,
        investorAddress,
        registrationDate,
        tradeRegistryNumber,
        nationalId,
        city,
        district,
        mainActivity,
      },
    });
  }
}
