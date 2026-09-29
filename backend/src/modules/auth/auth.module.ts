import { AuthController } from "../../controllers/auth.controller.js";
import { AuthSessionRepository } from "../../repositories/auth-session.repository.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { AuthService } from "../../services/auth.service.js";

const userRepository = new UserRepository();
const authSessionRepository = new AuthSessionRepository();

const authService = new AuthService(userRepository, authSessionRepository);

export const authController = new AuthController(authService);
