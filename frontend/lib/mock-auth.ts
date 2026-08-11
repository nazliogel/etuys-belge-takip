export type UserRole = "ADMIN" | "COMPANY";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  companyId?: number | null;
}

interface BackendUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  companyId?: number | null;
}

interface LoginResponse {
  user: BackendUser;
  accessToken: string;
}

const SESSION_KEY = "etuys-session";
const ACCESS_TOKEN_KEY = "etuys-access-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function login(
  email: string,
  password: string,
): Promise<SessionUser> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "E-posta adresi veya şifre hatalı.");
  }

  const result = data as LoginResponse;

  const sessionUser: SessionUser = {
    id: result.user.id,
    name: `${result.user.firstName} ${result.user.lastName}`.trim(),
    email: result.user.email,
    role: result.user.role,
    companyId: result.user.companyId,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));

  localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);

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
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function logoutMockUser(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
