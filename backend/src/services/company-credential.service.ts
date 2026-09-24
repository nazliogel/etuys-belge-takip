import { AppError } from "../errors/app-error.js";
import { prisma } from "../config/env.js";
import type { Prisma, UserRole } from "../generated/prisma/client.js";
import type { CompanyContactRepository } from "../repositories/company-contact.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import type { UserRepository } from "../repositories/user.repository.js";
import {
  createCompanyUsername,
  createStrongPassword,
} from "../utils/company-credentials.js";
import { HTTP_STATUS } from "../utils/http-status.js";
import { hashPassword } from "../utils/password.js";

type PrismaTransactionClient = Prisma.TransactionClient;

export class CompanyCredentialService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly contactRepository: CompanyContactRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createEmailDraft(
    companyId: number,
    requesterUserId: number,
    requesterRole: UserRole,
  ) {
    // 1. Yetki kontrolü (aynı kalıyor)
    if (requesterRole !== "ADMIN" && requesterRole !== "OPERATION") {
      throw new AppError(
        "Firma giriş bilgilerini oluşturma yetkiniz bulunmuyor.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
    }

    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new AppError("Firma bulunamadı.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    if (
      requesterRole === "OPERATION" &&
      company.consultantUserId !== requesterUserId
    ) {
      throw new AppError(
        "Bu firma için giriş bilgisi oluşturma yetkiniz bulunmuyor.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
    }

    // 2. Email bul
    const latestContact =
      await this.contactRepository.findLatestByCompanyId(companyId);
    if (!latestContact?.email?.trim()) {
      throw new AppError("Firmaya ait güncel bir e-posta adresi bulunamadı.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "COMPANY_EMAIL_NOT_FOUND",
      });
    }
    const email = latestContact.email.trim().toLowerCase();

    // 3. Email başka kullanıcıda mı?
    const existingCompanyUser =
      await this.userRepository.findCompanyUserByCompanyId(companyId);
    const emailOwner = await this.userRepository.findByEmailInsensitive(email);
    if (emailOwner && emailOwner.id !== existingCompanyUser?.id) {
      throw new AppError(
        `"${email}" adresi başka bir kullanıcı tarafından kullanılıyor.`,
        { statusCode: HTTP_STATUS.CONFLICT, code: "EMAIL_ALREADY_EXISTS" },
      );
    }

    // 4. User yoksa yarat, varsa şifresini resetle
    let username: string;
    let userId: number;
    let plainPassword: string;

    if (!existingCompanyUser) {
      const initial = await this.createInitialCredentials(companyId, { email });
      userId = initial.userId;
      username = initial.username;
      plainPassword = initial.plainPassword;
    } else {
      // Elle eklenmiş eski kullanıcılarda kullanıcı adı boş olabilir.
      // Bu durumda hata vermek yerine firma adından yeni bir kullanıcı adı üretilir.
      const usernameToUse =
        existingCompanyUser.username ??
        (await this.generateUniqueUsername(company.name, prisma));

      const reset = await this.resetPasswordAndEmail(
        existingCompanyUser.id,
        usernameToUse,
        email,
      );

      if (!reset.user.username) {
        throw new AppError("Kullanıcı adı güncellenirken bir sorun oluştu.", {
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          code: "USERNAME_UPDATE_FAILED",
        });
      }

      userId = reset.user.id;
      username = reset.user.username;
      plainPassword = reset.plainPassword;
    }

    // 5. Mail body
    const subject = "Yatırım Teşvik Yönetim Sistemi Giriş Bilgileri";
    const body = [
      "Merhaba,",
      "",
      `${company.name} firması için Yatırım Teşvik Yönetim Sistemi kullanıcı hesabınız oluşturulmuştur.`,
      "",
      `Kullanıcı adı: ${username}`,
      `Geçici şifre: ${plainPassword}`,
      "",
      "Sisteme kullanıcı adınız veya e-posta adresiniz ile giriş yapabilirsiniz.",
      "Güvenliğiniz için giriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.",
      "",
      "Saygılarımla,",
      "İyi çalışmalar dilerim.",
    ].join("\n");

    return {
      companyId: company.id,
      companyName: company.name,
      userId,
      username,
      email,
      password: plainPassword,
      emailDraft: { to: email, subject, body },
    };
  }

  async createInitialCredentials(
    companyId: number,
    options?: {
      email?: string | null;
      tx?: PrismaTransactionClient;
    },
  ): Promise<{
    userId: number;
    username: string;
    plainPassword: string;
  }> {
    const client = options?.tx ?? prisma;

    const company = await client.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    const existingUser = await client.user.findFirst({
      where: { companyId, role: "COMPANY" },
    });

    if (existingUser) {
      throw new AppError("Firma kullanıcısı zaten mevcut.", {
        statusCode: HTTP_STATUS.CONFLICT,
        code: "COMPANY_USER_ALREADY_EXISTS",
      });
    }

    const username = await this.generateUniqueUsername(company.name, client);
    const plainPassword = createStrongPassword();
    const passwordHash = await hashPassword(plainPassword);

    const user = await client.user.create({
      data: {
        firstName: company.name,
        lastName: "",
        username,
        email: options?.email ?? null,
        passwordHash,
        mustChangePassword: true,
        role: "COMPANY",
        isActive: true,
        company: { connect: { id: companyId } },
      },
    });

    if (!user.username) {
      throw new AppError("Kullanıcı adı oluşturulurken bir sorun oluştu.", {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        code: "USERNAME_CREATION_FAILED",
      });
    }

    return {
      userId: user.id,
      username: user.username,
      plainPassword,
    };
  }

  async checkCredentialStatus(
    companyId: number,
    requesterUserId: number,
    requesterRole: UserRole,
  ): Promise<{ hasCredentials: boolean }> {
    if (requesterRole !== "ADMIN" && requesterRole !== "OPERATION") {
      throw new AppError(
        "Firma giriş bilgilerini görüntüleme yetkiniz bulunmuyor.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
    }

    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError("Firma bulunamadı.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    if (
      requesterRole === "OPERATION" &&
      company.consultantUserId !== requesterUserId
    ) {
      throw new AppError(
        "Bu firma için giriş bilgisi görüntüleme yetkiniz bulunmuyor.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
    }

    const hasCredentials = await this.userRepository.companyHasUser(companyId);

    return { hasCredentials };
  }

  private async resetPasswordAndEmail(
    userId: number,
    username: string,
    email: string,
  ): Promise<{
    user: Awaited<ReturnType<UserRepository["updateCompanyCredentials"]>>;
    plainPassword: string;
  }> {
    const plainPassword = createStrongPassword();
    const passwordHash = await hashPassword(plainPassword);

    const user = await this.userRepository.updateCompanyCredentials(userId, {
      username,
      email,
      passwordHash,
      mustChangePassword: true,
    });

    return { user, plainPassword };
  }

  // Çakışma durumunda -2, -3 suffix eklesin
  private async generateUniqueUsername(
    companyName: string,
    client: PrismaTransactionClient,
  ): Promise<string> {
    const base = createCompanyUsername(companyName);

    if (!base) {
      throw new AppError("Firma adından kullanıcı adı oluşturulamadı.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "USERNAME_COULD_NOT_BE_CREATED",
      });
    }

    let candidate = base;
    let suffix = 2;

    while (
      await client.user.findFirst({
        where: { username: { equals: candidate, mode: "insensitive" } },
      })
    ) {
      candidate = `${base}${suffix}`;
      suffix += 1;

      if (suffix > 999) {
        throw new AppError("Benzersiz kullanıcı adı üretilemedi.", {
          statusCode: HTTP_STATUS.CONFLICT,
          code: "USERNAME_GENERATION_FAILED",
        });
      }
    }

    return candidate;
  }
}
