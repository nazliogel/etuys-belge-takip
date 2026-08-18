"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";

import { navigationItems } from "../_lib/navigation";
import { hasPermission, type UserRole } from "../_lib/permissions";
import { logoutMockUser } from "@/lib/mock-auth";

interface AppSidebarProps {
  role: UserRole;
  userName?: string;
}

export function AppSidebar({ role, userName }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleItems = navigationItems.filter((item) =>
    hasPermission(role, item.permission),
  );

  const handleLogout = () => {
    logoutMockUser();
    router.replace("/login");
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col bg-gradient-to-b from-blue-800 to-blue-900 border-r border-blue-900 text-blue-100">
      {/* LOGO - Beyaz kart içinde, kenarları yuvarlak */}
      <div className="mx-2 mt-8 flex items-center justify-center rounded-2xl bg-white px-4 py-6 shadow-sm">
        <div className="relative h-18 w-52 shrink-0">
          <Image
            src="/logos/360teşvikk.png"
            alt="Teşvik 360 logo"
            fill
            sizes="208px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* NAVİGASYON */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3 mt-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/documents"
              ? pathname === "/documents" || /^\/documents\/\d+$/.test(pathname)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-red-600 to-red-500 font-semibold text-white shadow-md shadow-red-600/30"
                  : "text-blue-100 font-medium hover:bg-blue-700/60 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={
                  active
                    ? "text-white"
                    : "text-blue-200 transition group-hover:text-white"
                }
              />
              <span>{item.label}</span>

              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* KULLANICI / ÇIKIŞ */}
      <div className="border-t border-blue-900/60 p-3">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl bg-blue-900/40 p-2.5 text-left text-sm border border-blue-900/60 transition hover:bg-red-500/20 hover:border-red-500/50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white shadow-sm shadow-red-600/30">
            {userName?.charAt(0).toUpperCase() ?? "?"}
          </div>

          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-white group-hover:text-red-300 transition">
              {userName ?? "Kullanıcı"}
            </p>
            <p className="text-[11px] text-blue-200">Oturumu Kapat</p>
          </div>

          <LogOut
            size={16}
            className="shrink-0 text-blue-200 group-hover:text-red-300 transition"
          />
        </button>
      </div>
    </aside>
  );
}
