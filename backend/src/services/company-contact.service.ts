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
    },
  ) {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    return this.contactRepository.create({
      companyId,
      fullName: params.fullName.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
    });
  }

  async update(
    companyId: number,
    contactId: number,
    params: {
      fullName: string;
      email: string;
      phone: string;
    },
  ) {
    return this.contactRepository.update(contactId, companyId, {
      fullName: params.fullName.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
    });
  }
}
