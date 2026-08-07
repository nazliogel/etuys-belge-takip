import type { ReactNode } from "react";
import RouteGuard from "@/components/auth/route-guard";
import CompanyHeader from "@/components/company/company-header";
import CompanySidebar from "@/components/company/company-sidebar";

interface CompanyLayoutProps {
  children: ReactNode;
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  return (
    <RouteGuard allowedRole="COMPANY">
      <div className="flex min-h-screen bg-slate-50">
        <CompanySidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <CompanyHeader />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </RouteGuard>
  );
}