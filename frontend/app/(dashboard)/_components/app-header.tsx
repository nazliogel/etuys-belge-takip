import type { UserRole } from "../_lib/permissions";
import { ShieldCheck, Building2 } from "lucide-react";

interface AppHeaderProps {
  userName: string;
  role: UserRole;
}

export function AppHeader({ userName, role }: AppHeaderProps) {
  const isAdmin = role === "ADMIN";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-800/60 bg-[#0F172A] px-6 text-slate-200 backdrop-blur-md">
      {/* SOL KISIM - Sayfa Başlığı ve Rol Indicator */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight">
            {isAdmin ? "Yönetim Paneli" : "Firma Paneli"}
          </h1>
         
        </div>
      </div>

      {/* SAĞ KISIM - Kullanıcı Profil Kartı */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/40 border border-slate-800/80 px-3.5 py-1.5 transition hover:bg-slate-800/60">
          <div className="text-right">
            <p className="text-xs font-semibold text-white leading-tight">
              {userName}
            </p>
            <span className="inline-block text-[10px] font-medium text-slate-400">
              {isAdmin ? "Sistem Yöneticisi" : "Firma Temsilcisi"}
            </span>
          </div>

          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-[11px] font-bold text-white shadow-sm shadow-red-600/20">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
