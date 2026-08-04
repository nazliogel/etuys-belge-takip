"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getSessionUser } from "@/lib/mock-auth";

export default function CompanyHeader() {
  const [userName, setUserName] = useState("Firma Kullanıcısı");
  const [companyName, setCompanyName] = useState("");
  const [initials, setInitials] = useState("FK");

  useEffect(() => {
    const user = getSessionUser();
    if (user) {
      setUserName(user.name);
      setCompanyName(user.companyName ?? "");
      const parts = user.name.trim().split(" ");
      const first = parts[0]?.[0] ?? "";
      const second = parts[parts.length - 1]?.[0] ?? "";
      setInitials((first + second).toUpperCase() || "FK");
    }
  }, []);

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
      {/* Sol: Arama */}
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Belge no, işlem veya bildirim ara..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Sağ: Bildirim + Kullanıcı */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          aria-label="Bildirimler"
        >
          <Bell size={19} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <button
          type="button"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2.5 py-2 pr-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white">
            {initials}
          </div>

          <div className="hidden max-w-52 md:block">
            <p className="truncate text-sm font-semibold text-slate-900">
              {userName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {companyName || "Firma Kullanıcısı"}
            </p>
          </div>

          <ChevronDown size={16} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}
