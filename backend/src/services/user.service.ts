import bcrypt from "bcrypt";

import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../generated/prisma/client.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import type { UserRepository } from "../repositories/user.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: number | null;
};

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async createUser(payload: CreateUserInput, requesterRole: UserRole) {
    if (requesterRole !== "ADMIN") {
      throw new AppError("Only admins can create users.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "FORBIDDEN",
      });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError(
        "Bu e-posta adresi sistemde başka bir kullanıcı tarafından kullanılıyor.",
        {
          statusCode: HTTP_STATUS.CONFLICT,
          code: "EMAIL_ALREADY_EXISTS",
          errors: [
            {
              field: "email",
              message:
                "Bu e-posta adresi sistemde başka bir kullanıcı tarafından kullanılıyor. Lütfen farklı bir e-posta adresi girin.",
            },
          ],
        },
      );
    }

    if (payload.role === "COMPANY" && !payload.companyId) {
      throw new AppError("Company users must be assigned to a company.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "COMPANY_REQUIRED",
      });
    }

    if (payload.role === "ADMIN" && payload.companyId) {
      throw new AppError("Admin users cannot be assigned to a company.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "ADMIN_COMPANY_NOT_ALLOWED",
      });
    }

    let companyId: number | null = null;

    if (payload.role === "COMPANY") {
      const company = await this.companyRepository.findById(payload.companyId!);

      if (!company) {
        throw new AppError("Company not found.", {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "COMPANY_NOT_FOUND",
        });
      }

      companyId = company.id;
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await this.userRepository.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: normalizedEmail,
      passwordHash,
      role: payload.role,
      isActive: true,

      ...(companyId
        ? {
            company: {
              connect: {
                id: companyId,
              },
            },
          }
        : {}),
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
