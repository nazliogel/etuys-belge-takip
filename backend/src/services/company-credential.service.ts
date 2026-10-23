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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CompanyCredentialService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    // Artık kullanılmıyor (bütün iletişim kişileri doğrudan okunuyor);
    // modüldeki kurulum bozulmasın diye parametre duruyor.
    _contactRepository: CompanyContactRepository,
    private readonly userRepository: UserRepository,
  ) { }

  // Firmanın aktif iletişim kişilerinin geçerli e-posta adresleri.
  // Bir kişinin alanında birden çok adres olabilir ("a@x.com; b@y.com");
  // tekrarlanan adresler bir kez yazılır. En son eklenen kişi en üstte.
  private async getContactEmails(companyId: number): Promise<string[]> {
    const contacts = await prisma.companyContact.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { email: true },
    });

    return [
      ...new Set(
        contacts
          .flatMap((contact) => contact.email.split(/[;,\s]+/))
          .map((address) => address.trim().toLowerCase())
          .filter((address) => EMAIL_PATTERN.test(address)),
      ),
    ];
  }

  async createEmailDraft(
    companyId: number,
    _requesterUserId: number,
    requesterRole: UserRole,
    // Ekranda seçilen adresler. Verilmezse bütün iletişim adresleri kullanılır.
    selectedEmails?: string[],
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

    // Uzmanlar (OPERATION) her firma için giriş bilgisi oluşturabilir.

    // 2. Mailin gideceği adresler: firmanın iletişim adreslerinden
    // ekranda seçilenler. Listede olmayan bir adres kabul edilmez.
    const contactEmails = await this.getContactEmails(companyId);

    if (contactEmails.length === 0) {
      throw new AppError(
        "Firmanın kayıtlı e-posta adresi yok. Lütfen önce firmanın iletişim bilgilerini güncelleyin.",
        {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "COMPANY_EMAIL_NOT_FOUND",
        },
      );
    }

    const selected = selectedEmails?.map((address) =>
      address.trim().toLowerCase(),
    );

    const recipients = selected
      ? contactEmails.filter((address) => selected.includes(address))
      : contactEmails;

    if (recipients.length === 0) {
      throw new AppError(
        "Lütfen firmanın iletişim adreslerinden en az birini seçin.",
        {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "NO_RECIPIENT_SELECTED",
        },
      );
    }

    // 3. Giriş için hesaba tek bir e-posta yazılabilir (sistemde her adres
    // tek kullanıcıya ait). Listede başka bir hesapta kayıtlı olmayan ilk
    // adres seçilir. Hepsi kayıtlıysa hesap e-postasız açılır; firma
    // kullanıcı adıyla giriş yapar.
    const existingCompanyUser =
      await this.userRepository.findCompanyUserByCompanyId(companyId);

    let accountEmail: string | null = null;

    for (const address of recipients) {
      const owner = await this.userRepository.findByEmailInsensitive(address);

      if (!owner || owner.id === existingCompanyUser?.id) {
        accountEmail = address;
        break;
      }
    }

    // Uygun adres yoksa mevcut hesabın e-postası korunur.
    if (!accountEmail && existingCompanyUser?.email) {
      accountEmail = existingCompanyUser.email;
    }

    const emailUsedByAnotherUser = accountEmail === null;

    const mainRecipient =
      accountEmail && recipients.includes(accountEmail)
        ? accountEmail
        : recipients[0];
    const ccRecipients = recipients.filter(
      (address) => address !== mainRecipient,
    );

    // 4. User yoksa yarat, varsa şifresini resetle
    let username: string;
    let userId: number;
    let plainPassword: string;

    if (!existingCompanyUser) {
      const initial = await this.createInitialCredentials(companyId, {
        email: accountEmail,
      });
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
        accountEmail,
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
      "",
      "Şifre:",
      plainPassword,
      "",
      "(Şifreyi kopyalarken yalnızca şifrenin bulunduğu satırı seçiniz.)", "",
      "Giriş adresi: https://tesvik.akkasgroup.com",
      "",
      accountEmail
        ? `Sisteme kullanıcı adınız veya ${accountEmail} e-posta adresi ile giriş yapabilirsiniz.`
        : "Sisteme kullanıcı adınız ile giriş yapabilirsiniz.",
      "",
      "İyi çalışmalar dilerim.",
      "",
      "Saygılarımla,",
    ].join("\n");
    return {
      companyId: company.id,
      companyName: company.name,
      userId,
      username,
      // Hesaba yazılan giriş e-postası (yoksa ilk alıcı, bilgi notu için)
      email: accountEmail ?? recipients[0],
      recipients,
      password: plainPassword,
      // İlk alıcı "Kime", diğerleri "Bilgi (CC)". Kime'ye giriş e-postası
      // konur (seçilenler arasındaysa); firmanın asıl muhatabı o.
      emailDraft: { to: mainRecipient, cc: ccRecipients, subject, body },

      // Ekranda bilgi notu göstermek için: e-posta başka bir hesapta kayıtlı
      // olduğundan firma hesabına yazılmadı, giriş kullanıcı adıyla yapılır.
      emailNotSavedToAccount: emailUsedByAnotherUser,
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
        mustChangePassword: false,
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
    _requesterUserId: number,
    requesterRole: UserRole,
  ): Promise<{ hasCredentials: boolean; emails: string[] }> {
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

    const hasCredentials = await this.userRepository.companyHasUser(companyId);

    // Ekranda mail adresi seçtirmek için firmanın iletişim adresleri.
    const emails = await this.getContactEmails(companyId);

    return { hasCredentials, emails };
  }

  private async resetPasswordAndEmail(
    userId: number,
    username: string,
    email: string | null,
  ): Promise<{
    user: { id: number; username: string | null };
    plainPassword: string;
  }> {
    const plainPassword = createStrongPassword();
    const passwordHash = await hashPassword(plainPassword);

    // E-posta boş olabildiği için (başka hesapta kayıtlıysa) doğrudan
    // güncelliyoruz.
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        email,
        passwordHash,
        mustChangePassword: false,
      },
      select: { id: true, username: true },
    });

    return { user, plainPassword };
  }

  // Asıl iş dosyanın altındaki generateUniqueCompanyUsername fonksiyonunda;
  // UserService (manuel kullanıcı formu) da aynı fonksiyonu kullanıyor.
  private async generateUniqueUsername(
    companyName: string,
    client: PrismaTransactionClient,
  ): Promise<string> {
    return generateUniqueCompanyUsername(companyName, client);
  }
}

export async function generateUniqueCompanyUsername(
  companyName: string,
  client: PrismaTransactionClient = prisma,
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