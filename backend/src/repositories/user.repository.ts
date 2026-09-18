import type { Prisma, User } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const normalizedIdentifier = identifier.trim();

    return prisma.user.findFirst({
      where: {
        OR: [
          {
            username: {
              equals: normalizedIdentifier,
              mode: "insensitive",
            },
          },
          {
            email: {
              equals: normalizedIdentifier,
              mode: "insensitive",
            },
          },
        ],
      },
    });
  }

  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async findConsultantByFullName(
    firstName: string,
    lastName: string,
  ): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        firstName: {
          equals: firstName,
          mode: "insensitive",
        },
        lastName: {
          equals: lastName,
          mode: "insensitive",
        },
        role: {
          in: ["ADMIN", "OPERATION"],
        },
        isActive: true,
      },
    });
  }

  async findSupportConsultants() {
    return prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "OPERATION"],
        },
        isActive: true,
        consultantCompanies: {
          some: {},
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: "insensitive",
        },
      },
    });
  }

  async findCompanyUserByCompanyId(companyId: number): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        companyId,
        role: "COMPANY",
      },
    });
  }
  async companyHasUser(companyId: number): Promise<boolean> {
    const count = await prisma.user.count({
      where: {
        companyId,
        role: "COMPANY",
      },
    });
    return count > 0;
  }
  async findByEmailInsensitive(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email: {
          equals: email.trim(),
          mode: "insensitive",
        },
      },
    });
  }

  async updateCompanyCredentials(
    id: number,
    data: {
      username?: string;
      email?: string | null;
      passwordHash?: string;
      mustChangePassword?: boolean;
    },
  ): Promise<User> {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.passwordHash !== undefined && {
          passwordHash: data.passwordHash,
        }),
        ...(data.mustChangePassword !== undefined && {
          mustChangePassword: data.mustChangePassword,
        }),
        isActive: true,
      },
    });
  }
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  async updatePassword(id: number, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: {
        id,
      },
      data: {
        passwordHash,
      },
    });
  }
}
