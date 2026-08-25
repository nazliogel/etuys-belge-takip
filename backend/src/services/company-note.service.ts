import { AppError } from "../errors/app-error.js";
import type { CompanyNoteRepository } from "../repositories/company-note.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyNoteService {
  constructor(
    private readonly noteRepository: CompanyNoteRepository,
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

    return this.noteRepository.findManyByCompanyId(companyId);
  }

  async create(companyId: number, text: string, authorId: number) {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    return this.noteRepository.create({
      companyId,
      text: text.trim(),
      authorId,
    });
  }

  async update(companyId: number, noteId: number, text: string) {
    return this.noteRepository.update(noteId, companyId, text.trim());
  }
}
