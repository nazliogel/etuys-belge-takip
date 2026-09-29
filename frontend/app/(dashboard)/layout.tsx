// app/(dashboard)/layout.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSessionUser,
  getAccessToken,
  logoutMockUser,
  type SessionUser,
} from "@/lib/mock-auth";
import { DashboardShell } from "./_components/dashboard-shell";

interface MyCompanyInfo {
  consultant: string | null;
  consultantPhone: string | null;
  consultantEmail: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchMyCompany(): Promise<MyCompanyInfo | null> {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/companies/me/consultant`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;

    const json = await response.json();
    const company = json?.data;

    if (!company) return null;

    return {
      consultant: company.consultant ?? null,
      consultantPhone: company.consultantPhone ?? null,
      consultantEmail: company.consultantEmail ?? null,
    };
  } catch {
    return null;
  }
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [myCompany, setMyCompany] = useState<MyCompanyInfo | null>(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function checkSession() {
      const sessionUser = getSessionUser();
      const token = getAccessToken();

      if (!sessionUser || !token) {
        logoutMockUser();
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          logoutMockUser();
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Oturum doğrulanamadı.");
        }

        const result = (await response.json()) as {
          user: { id: number; role: SessionUser["role"] };
        };

        if (result.user.id !== sessionUser.id) {
          logoutMockUser();
          router.replace("/login");
          return;
        }

        if (!cancelled) {
          setUser({ ...sessionUser, role: result.user.role });
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setAuthError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;

    let lastSentAt = 0;
    let sending = false;

    const recordActivity = () => {
      const now = Date.now();
      if (sending || now - lastSentAt < 60_000) return;

      const token = getAccessToken();
      if (!token) {
        logoutMockUser();
        router.replace("/login");
        return;
      }

      lastSentAt = now;
      sending = true;

      void fetch(`${API_URL}/auth/activity`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (response.status === 401 || response.status === 403) {
            logoutMockUser();
            router.replace("/login");
          }
        })
        .catch(() => {
          // Bağlantı hatasında oturumu silme; sonraki harekette yeniden denenecek.
        })
        .finally(() => {
          sending = false;
        });
    };

    window.addEventListener("pointerdown", recordActivity);
    window.addEventListener("keydown", recordActivity);
    window.addEventListener("wheel", recordActivity, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("wheel", recordActivity);
    };
  }, [user, router]);

  useEffect(() => {
    if (user?.role !== "COMPANY") {
      return;
    }

    let cancelled = false;

    fetchMyCompany().then((company) => {
      if (!cancelled) {
        setMyCompany(company);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p>{authError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Tekrar dene
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">
            Oturum kontrol ediliyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      role={user.role}
      userName={user.name}
      companyName={user.companyName}
      consultantName={myCompany?.consultant}
      consultantPhone={myCompany?.consultantPhone}
      consultantEmail={myCompany?.consultantEmail}
    >
      {children}
    </DashboardShell>
  );
}
