import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../generated/prisma/client.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import type { CompanyRequestRepository } from "../repositories/company-request.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyRequestService {
  constructor(
    private readonly repository: CompanyRequestRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async upsertFromExcel(params: {
    requestNumber: number;
    externalDocumentId: number;
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
    const document = await this.repository.findDocumentByExternalDocumentId(
      params.externalDocumentId,
    );

    if (!document) {
      throw new AppError(
        `Document not found for Belge Id: ${params.externalDocumentId}`,
        {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "DOCUMENT_NOT_FOUND",
        },
      );
    }

    return this.repository.upsert({
      companyId: document.companyId,
      requestNumber: params.requestNumber,
      externalDocumentId: params.externalDocumentId,
      documentNumber: params.documentNumber ?? document.documentNumber,
      note: params.note,
      requestType: params.requestType,
      requestStatus: params.requestStatus,
      department: params.department,
      assignedPersonnel: params.assignedPersonnel,
      informationPerson: params.informationPerson,
      applicationDate: params.applicationDate,
      completionDate: params.completionDate,
    });
  }

  async getRequests(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      requestStatus?: string;
      companyId?: number;
    },
    userId: number,
    role: UserRole,
  ) {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;

    let companyId = params.companyId;

    if (role === "COMPANY") {
      const company = await this.companyRepository.findByUserId(userId);

      if (!company) {
        throw new AppError("Company is not assigned to this user.", {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "USER_COMPANY_NOT_FOUND",
        });
      }

      // COMPANY rolündeki kullanıcı URL'den başka bir companyId
      // gönderse bile yalnızca kendi firmasının kayıtlarını görür.
      companyId = company.id;
    }

    const [items, totalCount] = await Promise.all([
      this.repository.findMany({
        skip,
        take: limit,
        companyId,
        search: params.search,
        requestStatus: params.requestStatus,
      }),

      this.repository.count({
        companyId,
        search: params.search,
        requestStatus: params.requestStatus,
      }),
    ]);

    return {
      items,
      totalCount,
      page,
      limit,
      totalPages: Math.max(Math.ceil(totalCount / limit), 1),
    };
  }
}
