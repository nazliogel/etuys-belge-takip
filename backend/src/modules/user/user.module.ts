import { UserController } from "../../controllers/user.controller.js";
import { CompanyRepository } from "../../repositories/company.repository.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { UserService } from "../../services/user.service.js";

const userRepository = new UserRepository();
const companyRepository = new CompanyRepository();

export const userService = new UserService(userRepository, companyRepository);

export const userController = new UserController(userService);
