import type { User } from "../generated/prisma/client.js";

import { AppError } from "../errors/app-error.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type {
  AuthProfileResponse,
  AuthResponse,
  LoginInput,
  RegisterInput,
} from "../types/auth.js";
import { HTTP_STATUS } from "../utils/http-status.js";
import { signAccessToken } from "../utils/jwt.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { serializeAuthUser } from "../utils/serialize-auth-user.js";
import { fromPrismaUserRole } from "../utils/user-role.js";

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(payload: RegisterInput): Promise<AuthResponse> {
    const normalizedEmail = payload.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new AppError("Email is already in use.", {
        statusCode: HTTP_STATUS.CONFLICT,
        code: "EMAIL_ALREADY_IN_USE",
        errors: [
          {
            field: "email",
            message: "Email is already in use.",
          },
        ],
      });
    }

    const passwordHash = await hashPassword(payload.password);

    const user = await this.userRepository.create({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: payload.role,
      isActive: true,
    });

    return this.createAuthResponse(user);
  }

  async login(payload: LoginInput): Promise<AuthResponse> {
    const normalizedEmail = payload.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw this.createInvalidCredentialsError();
    }

    const isPasswordValid = await comparePassword(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw this.createInvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new AppError("User account is inactive.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "USER_INACTIVE",
      });
    }

    return this.createAuthResponse(user);
  }

  async getProfile(userId: number): Promise<AuthProfileResponse> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "USER_NOT_FOUND",
      });
    }

    return {
      user: serializeAuthUser(user),
    };
  }

  private createAuthResponse(user: User): AuthResponse {
    return {
      user: serializeAuthUser(user),
      accessToken: signAccessToken({
        sub: user.id,
        role: fromPrismaUserRole(user.role),
      }),
    };
  }

  private createInvalidCredentialsError(): AppError {
    return new AppError("Invalid email or password.", {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: "INVALID_CREDENTIALS",
    });
  }
}
