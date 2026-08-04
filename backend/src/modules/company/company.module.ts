import { CompanyController } from "../../controllers/company.controller.js";
import { CompanyRepository } from "../../repositories/company.repository.js";
import { CompanyService } from "../../services/company.service.js";

const companyRepository = new CompanyRepository();

const companyService = new CompanyService(companyRepository);

export const companyController = new CompanyController(companyService);
