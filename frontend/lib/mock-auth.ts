export type UserRole = "admin" | "company";

export interface MockUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyName?: string;
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string;
}

const SESSION_KEY = "etuys-session";

export const mockUsers: MockUser[] = [
  {
    id: 1,
    name: "Erkan Akkaş",
    email: "admin@akkas.com",
    password: "123456",
    role: "admin",
  },
  {
    id: 2,
    name: "1453 İstanbul Otomat",
    email: "firma@ornek.com",
    password: "123456",
    role: "company",
    companyName:
      "1453 İstanbul Otomat İnşaat Otomotiv Sanayi ve Ticaret Limited Şirketi",
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
