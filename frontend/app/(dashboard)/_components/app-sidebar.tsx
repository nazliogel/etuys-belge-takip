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
    <aside className="sticky top-0 flex h-screen w-64 flex-col bg-[#0F172A] border-r border-slate-800/60 text-slate-300">
      {/* LOGO ALANI - Giriş Ekranındaki Cam Efekti Kart Yapısı */}
     <div className="flex flex-col items-center gap-3 px-5 py-6">
        <div className="relative h-36 w-52 shrink-0 overflow-hidden">
          <Image
            src="/logos/etuys--logo.png"
            alt="E-TUYS logo"
            fill
            sizes="208px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* NAVİGASYON */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-red-600 to-red-500 font-semibold text-white shadow-md shadow-red-600/20"
                  : "text-slate-400 font-medium hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={
                  active
                    ? "text-white"
                    : "text-slate-400 transition group-hover:text-white"
                }
              />
              <span>{item.label}</span>

              {/* Aktiflik Noktası */}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* KULLANICI / ÇIKIŞ */}
      <div className="border-t border-slate-800/60 p-3">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl bg-slate-800/40 p-2.5 text-left text-sm border border-slate-800/80 transition hover:bg-red-500/10 hover:border-red-500/30"
        >
          {/* Avatar / Baş Harf */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white shadow-sm shadow-red-600/20">
            {userName?.charAt(0).toUpperCase() ?? "?"}
          </div>

          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-white group-hover:text-red-400 transition">
              {userName ?? "Kullanıcı"}
            </p>
            <p className="text-[11px] text-slate-500">Oturumu Kapat</p>
          </div>

          <LogOut size={16} className="shrink-0 text-slate-400 group-hover:text-red-400 transition" />
        </button>
      </div>
    </aside>
  );
}