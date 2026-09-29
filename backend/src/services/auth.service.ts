import type { User } from "../generated/prisma/client.js";

import { AppError } from "../errors/app-error.js";
import type { AuthSessionRepository } from "../repositories/auth-session.repository.js";
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
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authSessionRepository: AuthSessionRepository,
  ) {}

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
    const identifier = payload.identifier.trim();

    const user = await this.userRepository.findByIdentifier(identifier);

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
      throw new AppError("Kullanıcı hesabı pasif durumda.", {
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

  async recordActivity(sessionId: string): Promise<void> {
    const result = await this.authSessionRepository.touch(sessionId);

    if (result.count === 0) {
      throw new AppError("Oturum süresi doldu. Lütfen tekrar giriş yapın.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "SESSION_EXPIRED",
      });
    }
  }

  async logout(sessionId: string): Promise<void> {
    await this.authSessionRepository.revoke(sessionId);
  }

  private async createAuthResponse(user: User): Promise<AuthResponse> {
    const session = await this.authSessionRepository.create(user.id);

    return {
      user: serializeAuthUser(user),
      accessToken: signAccessToken({
        sub: user.id,
        role: fromPrismaUserRole(user.role),
        sessionId: session.id,
      }),
    };
  }

  private createInvalidCredentialsError(): AppError {
    return new AppError("Kullanıcı adı/e-posta veya şifre hatalı.", {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: "INVALID_CREDENTIALS",
    });
  }
}
