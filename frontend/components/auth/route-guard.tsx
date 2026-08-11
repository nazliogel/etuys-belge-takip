"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser, type UserRole } from "@/lib/mock-auth";
import { roleToRoutePrefix } from "@/lib/role-route";

interface RouteGuardProps {
  children: ReactNode;
  // Tek bir rol ya da rol dizisi kabul eder. Belirtilmezse herkes girebilir.
  allowedRole?: UserRole | UserRole[];
}

export default function RouteGuard({ children, allowedRole }: RouteGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const user = getSessionUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    if (allowedRole) {
      const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];

      if (!allowedRoles.includes(user.role)) {
        router.replace(`/${roleToRoutePrefix(user.role)}/dashboard`);
        return;
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsChecking(false);
  }, [allowedRole, router]);

  if (isChecking) {
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

  return children;
}