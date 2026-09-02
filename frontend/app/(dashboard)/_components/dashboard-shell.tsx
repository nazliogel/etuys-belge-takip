import type { ReactNode } from "react";

import type { UserRole } from "../_lib/permissions";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

interface DashboardShellProps {
  role: UserRole;
  userName: string;
  companyName?: string | null;
  consultantName?: string | null;
  consultantPhone?: string | null;
  consultantEmail?: string | null;
  children: ReactNode;
}

export function DashboardShell({
  role,
  userName,
  consultantName,
  consultantPhone,
  consultantEmail,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar role={role} userName={userName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          userName={userName}
          role={role}
          consultantName={consultantName}
          consultantPhone={consultantPhone}
          consultantEmail={consultantEmail}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
