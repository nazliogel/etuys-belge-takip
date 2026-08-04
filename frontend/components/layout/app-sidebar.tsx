"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Firmalar",
    href: "/companies",
    icon: Building2,
  },
  {
    title: "Belgeler",
    href: "/documents",
    icon: FileText,
  },
  {
    title: "Excel İçe Aktarma",
    href: "/imports",
    icon: FileSpreadsheet,
  },
  {
    title: "Kullanıcılar",
    href: "/users",
    icon: Users,
  },
  {
    title: "Bildirimler",
    href: "/notifications",
    icon: Bell,
    badge: 12,
  },
  {
    title: "Raporlar",
    href: "/reports",
    icon: History,
  },
  {
    title: "Takvim",
    href: "/calendar",
    icon: CalendarDays,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[230px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-[76px] items-center border-b border-slate-100 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <p className="text-base font-bold tracking-tight text-slate-900">
              e-TUYS
            </p>
            <p className="text-[11px] font-medium text-blue-600">
              Belge Takip Sistemi
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center justify-between rounded-lg px-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-[17px] w-[17px]" />
                {item.title}
              </span>

              {item.badge ? (
                <span
                  className={cn(
                    "flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    isActive
                      ? "bg-white text-blue-600"
                      : "bg-red-500 text-white",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1.5 border-t border-slate-100 p-3">
        <Link
          href="/settings"
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Settings className="h-[17px] w-[17px]" />
          Ayarlar
        </Link>

        <button
          type="button"
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-[17px] w-[17px]" />
          Çıkış
        </button>
      </div>
    </aside>
  );
}
