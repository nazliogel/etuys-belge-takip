export type UserRole = "ADMIN" | "COMPANY";

export interface MockUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyName?: string;
  // Bu kullanıcının erişebileceği firma id'leri (companies-screen.tsx'teki
  // `firmalar` dizisindeki `id` alanıyla eşleşir). ADMIN için gerekmez,
  // çünkü admin zaten tüm firmaları görür. COMPANY rolündeki kullanıcı
  // sadece burada listelenen firmaları görebilir.
  companyIds?: string[];
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string;
  companyIds?: string[];
}

const SESSION_KEY = "etuys-session";

export const mockUsers: MockUser[] = [
  {
    id: 1,
    name: "Erkan Akkaş",
    email: "admin@akkas.com",
    password: "123456",
    role: "ADMIN",
  },
  {
    id: 2,
    name: "1453 İstanbul Otomat",
    email: "firma@ornek.com",
    password: "123456",
    role: "COMPANY",
    companyName:
      "1453 İstanbul Otomat İnşaat Otomotiv Sanayi ve Ticaret Limited Şirketi",
    companyIds: ["1"],
  },
];

export function loginWithMockData(
  email: string,
  password: string,
): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = mockUsers.find(
    (item) =>
      item.email.toLowerCase() === normalizedEmail &&
      item.password === password,
  );

  if (!user) {
    return null;
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyName: user.companyName,
    companyIds: user.companyIds,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

  return sessionUser;
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const session = localStorage.getItem(SESSION_KEY);

  if (!session) {
    return null;
  }

  try {
    return JSON.parse(session) as SessionUser;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function logoutMockUser(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_KEY);
}