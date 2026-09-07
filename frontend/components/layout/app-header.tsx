"use client";

import { Bell, Mail, Menu, MoreVertical, Phone, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { UserRole } from "@/lib/mock-auth";
import { AppSidebar } from "./app-sidebar";

interface AppHeaderProps {
  userName: string;
  role: UserRole;
  consultantName?: string | null;
  consultantPhone?: string | null;
  consultantEmail?: string | null;
}

function normalizeWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("90")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `90${digits.slice(1)}`;
  }

  return `90${digits}`;
}

export function AppHeader({
  userName,
  role,
  consultantName,
  consultantPhone,
  consultantEmail,
}: AppHeaderProps) {
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  const roleLabel =
    role === "ADMIN"
      ? "Sistem Yöneticisi"
      : role === "OPERATION"
        ? "Operasyon Sorumlusu"
        : "Firma Kullanıcısı";

  const isCompany = role === "COMPANY";

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 lg:hidden"
                aria-label="Menüyü aç"
              />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>

          <SheetContent side="left" className="w-[230px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Ana menü</SheetTitle>
            </SheetHeader>

            <AppSidebar />
          </SheetContent>
        </Sheet>

        {!isCompany && (
          <div className="relative hidden w-full max-w-[460px] md:block">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              placeholder="Global arama... (Firma, Belge No, VKN, Yetkili)"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        )}

        {isCompany && consultantName && (
          <div className="hidden min-w-0 items-center gap-4 md:flex">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Uzmanınız
              </p>

              <p className="text-sm font-bold text-slate-800">
                {consultantName}
              </p>
            </div>

            {consultantPhone && (
              <a
                href={`https://wa.me/${normalizeWhatsappPhone(consultantPhone)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-green-600"
              >
                <Phone className="h-4 w-4" />
                {consultantPhone}
              </a>
            )}

            {consultantEmail && (
              <a
                href={`mailto:${consultantEmail}`}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-blue-700"
              >
                <Mail className="h-4 w-4" />
                {consultantEmail}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <Bell className="h-5 w-5" />

          <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            12
          </span>
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <button
          type="button"
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-100"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-blue-100 text-xs font-bold text-blue-700">
              {initials || "K"}
            </AvatarFallback>
          </Avatar>

          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-800">{userName}</p>
            <p className="text-[11px] text-slate-500">{roleLabel}</p>
          </div>

          <MoreVertical className="hidden h-4 w-4 text-slate-400 sm:block" />
        </button>
      </div>
    </header>
  );
}
