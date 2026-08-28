// app/(dashboard)/layout.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser, getAccessToken, type SessionUser } from "@/lib/mock-auth";
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
    const response = await fetch(`${API_URL}/companies`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();

    // NOT: sendSuccessResponse'un tam olarak neyi hangi anahtar altında
    // sardığını (data.data mı, doğrudan data mı) görmedim — utils/api-response.ts
    // dosyanıza bakıp bu satırı gerekirse düzeltin.
    const company = json?.data?.items?.[0];

    if (!company) {
      return null;
    }

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

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(sessionUser);
  }, [router]);

  // Danışman bilgisi sadece firma sahibi (COMPANY) kullanıcılar için
  // anlamlı — ADMIN için GET /companies tüm firmaları döndürür, "benim
  // danışmanım" diye tekil bir anlamı yok.
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