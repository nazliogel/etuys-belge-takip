import { AppError } from "../errors/app-error.js";
import type { CompanyContactRepository } from "../repositories/company-contact.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyContactService {
  constructor(
    private readonly contactRepository: CompanyContactRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async list(companyId: number) {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    return this.contactRepository.findManyByCompanyId(companyId);
  }

  async create(
    companyId: number,
    params: {
      fullName: string;
      email: string;
      phone: string;
      position: string;
    },
  ) {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    if (typeof params.position !== "string" || !params.position.trim()) {
      throw new AppError("Görev alanı zorunludur.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "CONTACT_POSITION_REQUIRED",
      });
    }

    return this.contactRepository.create({
      companyId,
      fullName: params.fullName.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
      position: params.position.trim(),
    });
  }

  async update(
    companyId: number,
    contactId: number,
    params: {
      fullName: string;
      email: string;
      phone: string;
      position: string;
    },
  ) {
    if (typeof params.position !== "string" || !params.position.trim()) {
      throw new AppError("Görev alanı zorunludur.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "CONTACT_POSITION_REQUIRED",
      });
    }

    return this.contactRepository.update(contactId, companyId, {
      fullName: params.fullName.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
      position: params.position.trim(),
    });
  }
  async updateStatus(companyId: number, contactId: number, isActive: boolean) {
    if (typeof isActive !== "boolean") {
      throw new AppError("Aktif/pasif değeri geçersiz.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "INVALID_CONTACT_STATUS",
      });
    }

    const contact = await this.contactRepository.findById(contactId, companyId);

    if (!contact) {
      throw new AppError("İletişim kişisi bulunamadı.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "CONTACT_NOT_FOUND",
      });
    }

    return this.contactRepository.updateStatus(contactId, companyId, isActive);
  }
}
