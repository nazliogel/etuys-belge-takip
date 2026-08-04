"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import RouteGuard from "@/components/auth/route-guard";
import { logoutMockUser } from "@/lib/mock-auth";

interface AdminPanelLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { label: "Genel Bakış", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Firmalar", href: "/admin/companies", icon: Building2 },
  { label: "Belgeler", href: "/admin/documents", icon: FileText },
  { label: "Bildirimler", href: "/admin/notifications", icon: Bell },
  { label: "Kullanıcılar", href: "/admin/users", icon: Users },
  { label: "Ayarlar", href: "/admin/settings", icon: Settings },
];

export default function AdminPanelLayout({ children }: AdminPanelLayoutProps) {
  const router = useRouter();

  function handleLogout() {
    logoutMockUser();
    router.push("/login");
  }

  return (
    <RouteGuard allowedRole="admin">
      <div className="flex min-h-screen bg-slate-950 text-white">
        <aside className="w-64 border-r border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Akkaş Teknoloji
            </p>
            <h1 className="mt-2 text-xl font-bold text-white">
              Yönetim Paneli
            </h1>
          </div>

          <nav className="space-y-2 p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
                >
                  <Icon size={19} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 items-center justify-between border-b border-slate-800 bg-slate-900 px-8">
            <div>
              <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
              <p className="text-sm text-slate-400">
                Firma, belge ve yetki süreçlerini yönetin.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
            >
              <LogOut size={17} />
              Çıkış Yap
            </button>
          </header>

          <main className="flex-1 bg-slate-950 p-8">{children}</main>
        </div>
      </div>
    </RouteGuard>
  );
}
