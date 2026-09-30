import { getAccessToken, logoutMockUser } from "@/lib/mock-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logoutMockUser();

    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.replace("/login");
    }

    throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "İstek sırasında bir hata oluştu.");
  }

  return data as T;
}
export async function apiDownload(
  path: string,
  fileName: string,
): Promise<void> {
  const token = getAccessToken();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { headers });

  if (response.status === 401) {
    logoutMockUser();

    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.replace("/login");
    }

    throw new Error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? "Dosya indirilemedi.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
