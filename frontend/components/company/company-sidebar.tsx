"use client";

import {
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutMockUser } from "@/lib/mock-auth";
import Image from "next/image";

const menuItems = [
  { label: "Genel Bakış", href: "/company/dashboard", icon: LayoutDashboard },
  { label: "Belgelerim", href: "/company/documents", icon: FileText },
  { label: "Bildirimler", href: "/company/notifications", icon: Bell },
  {
    label: "Yetki Bilgilerim",
    href: "/company/authorization",
    icon: ShieldCheck,
  },
];

export default function CompanySidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logoutMockUser();
    router.push("/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* E-TUYS Logo */}
      <div className="border-b border-slate-200 px-6 py-5">
        <Image
          src="/logos/etuys-logo.png"
          alt="E-TUYS Logo"
          width={180}
          height={60}
          priority
          className="h-auto w-full max-w-[180px] object-contain"
        />

        <p className="mt-2 text-xs font-medium text-slate-500">Firma Portalı</p>
      </div>
      {/* Menü */}
      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/company/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
              )}
              <Icon
                size={19}
                className={
                  active
                    ? "text-blue-600"
                    : "text-slate-400 group-hover:text-slate-600"
                }
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Çıkış */}
      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={19} className="text-slate-400" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
