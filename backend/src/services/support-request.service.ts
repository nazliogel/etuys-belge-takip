import { AppError } from "../errors/app-error.js";

import type { SupportRequestRepository } from "../repositories/support-request.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";

import type {
  SupportRequestStatus,
  UserRole,
} from "../generated/prisma/client.js";

type AuthUser = {
  id: number;
  role: UserRole;
};

type CreateSupportRequestInput = {
  description: string;
};

export class SupportRequestService {
  constructor(
    private readonly supportRequestRepository: SupportRequestRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async create(user: AuthUser, input: CreateSupportRequestInput) {
    if (user.role !== "COMPANY") {
      throw new AppError(
        "Destek talebi yalnızca firma kullanıcıları tarafından oluşturulabilir.",
        {
          statusCode: 403,
          code: "SUPPORT_REQUEST_CREATE_FORBIDDEN",
        },
      );
    }

    const company = await this.companyRepository.findByUserId(user.id);

    if (!company) {
      throw new AppError("Kullanıcıya bağlı firma bulunamadı.", {
        statusCode: 404,
        code: "COMPANY_NOT_FOUND",
      });
    }

    const description = input.description?.trim();

    if (!description) {
      throw new AppError("Destek talebi açıklaması zorunludur.", {
        statusCode: 400,
        code: "SUPPORT_REQUEST_DESCRIPTION_REQUIRED",
      });
    }

    return this.supportRequestRepository.createWithNextTicketNumber({
      companyId: company.id,
      assignedToId: company.consultantUserId,
      description,
    });
  }

  async list(user: AuthUser, status?: SupportRequestStatus) {
    if (user.role === "ADMIN") {
      return this.supportRequestRepository.findMany({
        status,
      });
    }

    if (user.role === "OPERATION") {
      return this.supportRequestRepository.findMany({
        assignedToId: user.id,
        status,
      });
    }

    if (user.role === "COMPANY") {
      const company = await this.companyRepository.findByUserId(user.id);

      if (!company) {
        throw new AppError("Kullanıcıya bağlı firma bulunamadı.", {
          statusCode: 404,
          code: "COMPANY_NOT_FOUND",
        });
      }

      return this.supportRequestRepository.findMany({
        companyId: company.id,
        status,
      });
    }

    throw new AppError("Bu işlem için yetkiniz bulunmamaktadır.", {
      statusCode: 403,
      code: "SUPPORT_REQUEST_LIST_FORBIDDEN",
    });
  }

  async getById(user: AuthUser, id: number) {
    const request = await this.supportRequestRepository.findById(id);

    if (!request) {
      throw new AppError("Destek talebi bulunamadı.", {
        statusCode: 404,
        code: "SUPPORT_REQUEST_NOT_FOUND",
      });
    }

    if (user.role === "ADMIN") {
      return request;
    }

    if (user.role === "OPERATION" && request.assignedToId === user.id) {
      if (!request.viewedAt) {
        return this.supportRequestRepository.markViewed(id);
      }

      return request;
    }

    if (user.role === "COMPANY") {
      const company = await this.companyRepository.findByUserId(user.id);

      if (company && request.companyId === company.id) {
        return request;
      }
    }

    throw new AppError("Bu destek talebine erişim yetkiniz yok.", {
      statusCode: 403,
      code: "SUPPORT_REQUEST_ACCESS_FORBIDDEN",
    });
  }

  async markInProgress(user: AuthUser, id: number) {
    const request = await this.supportRequestRepository.findById(id);

    if (!request) {
      throw new AppError("Destek talebi bulunamadı.", {
        statusCode: 404,
        code: "SUPPORT_REQUEST_NOT_FOUND",
      });
    }

    if (request.status === "RESOLVED") {
      throw new AppError("Çözülmüş bir destek talebi tekrar işleme alınamaz.", {
        statusCode: 400,
        code: "SUPPORT_REQUEST_ALREADY_RESOLVED",
      });
    }

    if (request.status === "IN_PROGRESS") {
      return request;
    }

    if (user.role === "ADMIN") {
      return this.supportRequestRepository.markInProgress(id);
    }

    if (user.role === "OPERATION" && request.assignedToId === user.id) {
      return this.supportRequestRepository.markInProgress(id);
    }

    throw new AppError(
      "Bu destek talebini işleme alma yetkiniz bulunmamaktadır.",
      {
        statusCode: 403,
        code: "SUPPORT_REQUEST_IN_PROGRESS_FORBIDDEN",
      },
    );
  }

  async resolve(user: AuthUser, id: number) {
    const request = await this.supportRequestRepository.findById(id);

    if (!request) {
      throw new AppError("Destek talebi bulunamadı.", {
        statusCode: 404,
        code: "SUPPORT_REQUEST_NOT_FOUND",
      });
    }

    if (request.status === "RESOLVED") {
      return request;
    }

    if (user.role === "ADMIN") {
      return this.supportRequestRepository.resolve(id);
    }

    if (user.role === "OPERATION" && request.assignedToId === user.id) {
      return this.supportRequestRepository.resolve(id);
    }

    throw new AppError("Bu destek talebini çözme yetkiniz bulunmamaktadır.", {
      statusCode: 403,
      code: "SUPPORT_REQUEST_RESOLVE_FORBIDDEN",
    });
  }
}
