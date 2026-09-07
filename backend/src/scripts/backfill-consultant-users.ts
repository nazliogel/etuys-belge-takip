import { prisma } from "../config/env.js";

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

async function main() {
  console.log("Uzman - firma eşleştirmesi başlıyor...");

  const operationUsers = await prisma.user.findMany({
    where: {
      role: "OPERATION",
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  console.log(`Aktif OPERATION kullanıcı sayısı: ${operationUsers.length}`);

  const userMap = new Map<string, typeof operationUsers>();

  for (const user of operationUsers) {
    const fullName = normalizeName(`${user.firstName} ${user.lastName}`);

    const existing = userMap.get(fullName) ?? [];
    existing.push(user);

    userMap.set(fullName, existing);
  }

  const companies = await prisma.company.findMany({
    where: {
      consultant: {
        not: null,
      },
      consultantUserId: null,
    },
    select: {
      id: true,
      name: true,
      consultant: true,
      consultantUserId: true,
    },
  });

  console.log(`Eşleştirme bekleyen firma sayısı: ${companies.length}`);

  let matchedCount = 0;
  let unmatchedCount = 0;
  let ambiguousCount = 0;

  for (const company of companies) {
    const consultant = company.consultant?.trim();

    if (!consultant) {
      continue;
    }

    const normalizedConsultant = normalizeName(consultant);

    const matchingUsers = userMap.get(normalizedConsultant) ?? [];

    if (matchingUsers.length === 0) {
      unmatchedCount += 1;

      console.log(`EŞLEŞMEDİ | Firma: ${company.name} | Uzman: ${consultant}`);

      continue;
    }

    if (matchingUsers.length > 1) {
      ambiguousCount += 1;

      console.log(
        `BİRDEN FAZLA KULLANICI | Firma: ${company.name} | Uzman: ${consultant}`,
      );

      continue;
    }

    const operationUser = matchingUsers[0];

    await prisma.company.update({
      where: {
        id: company.id,
      },
      data: {
        consultantUserId: operationUser.id,
      },
    });

    matchedCount += 1;

    console.log(
      `EŞLEŞTİ | ${company.name} -> ${operationUser.firstName} ${operationUser.lastName}`,
    );
  }

  console.log("");
  console.log("======================================");
  console.log("EŞLEŞTİRME TAMAMLANDI");
  console.log("======================================");
  console.log(`Eşleşen firma       : ${matchedCount}`);
  console.log(`Eşleşmeyen firma    : ${unmatchedCount}`);
  console.log(`Belirsiz eşleşme    : ${ambiguousCount}`);
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("Eşleştirme sırasında hata oluştu:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
