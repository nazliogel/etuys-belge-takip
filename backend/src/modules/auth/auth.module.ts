import { AuthController } from "../../controllers/auth.controller.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { AuthService } from "../../services/auth.service.js";

const userRepository = new UserRepository();
const authService = new AuthService(userRepository);

export const authController = new AuthController(authService);
