"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Mail, Menu, Phone, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import { apiFetch } from "@/lib/api";
import type { UserRole } from "../_lib/permissions";
import { AppSidebar } from "./app-sidebar";

interface AppHeaderProps {
  userName: string;
  role: UserRole;
  consultantName?: string | null;
  consultantPhone?: string | null;
  consultantEmail?: string | null;
}

interface NotificationCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
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
  const pathname = usePathname();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleLabel =
    role === "ADMIN"
      ? "Yönetici"
      : role === "OPERATION"
        ? "Uzman"
        : "Firma Temsilcisi";

  const panelTitle =
    role === "ADMIN"
      ? "Yönetim Paneli"
      : role === "OPERATION"
        ? "Operasyon Paneli"
        : "Firma Paneli";

  const showConsultantInfo = role === "COMPANY";

  // Menüden bir sayfa seçilince mobil drawer otomatik kapansın
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Drawer açıkken arkadaki sayfa scroll'unu kilitle
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  // Esc tuşu ile drawer kapansın
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (showConsultantInfo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadNotificationCount(0);
      return;
    }

    async function loadUnreadCount() {
      try {
        const response = await apiFetch<NotificationCountResponse>(
          "/notifications?limit=1",
        );

        setUnreadNotificationCount(response.data.unreadCount);
      } catch {
        setUnreadNotificationCount(0);
      }
    }

    const handleNotificationsUpdated = () => {
      void loadUnreadCount();
    };

    void loadUnreadCount();

    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 60_000);

    window.addEventListener(
      "notifications-updated",
      handleNotificationsUpdated,
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "notifications-updated",
        handleNotificationsUpdated,
      );
    };
  }, [showConsultantInfo]);

  const displayedConsultantName = consultantName?.trim() || "—";
  const displayedConsultantPhone = consultantPhone?.trim() || null;
  const displayedConsultantEmail = consultantEmail?.trim() || null;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-blue-900 bg-blue-800 px-3 text-blue-100 backdrop-blur-md sm:px-6">
        {/* SOL: Hamburger + Panel başlığı */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition hover:bg-blue-700/50 lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu size={22} />
          </button>

          <h1 className="truncate text-sm font-bold tracking-tight text-white">
            {panelTitle}
          </h1>
        </div>

        {/* SAĞ: Uzman info / Bildirim / Kullanıcı */}
        <div className="flex items-center gap-2 sm:gap-3">
          {showConsultantInfo && (
            <div className="hidden items-center gap-6 lg:flex">
              <div className="flex min-w-[350px] items-center gap-6 border-r border-blue-600 pr-6">
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-blue-200">
                    Uzmanınız
                  </p>

                  <p className="mt-0.5 whitespace-nowrap text-sm font-semibold text-white">
                    {displayedConsultantName}
                  </p>
                </div>

                <div className="border-l border-blue-600/70 pl-5">
                  {displayedConsultantPhone ? (
                    <p
                      className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-blue-100"
                      title="Uzmanınızın telefon numarası"
                    >
                      <FaWhatsapp
                        size={16}
                        color="#22c55e"
                        aria-hidden="true"
                      />
                      <span>{displayedConsultantPhone}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-blue-300">Telefon bilgisi yok</p>
                  )}

                  {displayedConsultantEmail ? (
                    <a
                      href={`mailto:${displayedConsultantEmail}`}
                      className="mt-0.5 flex items-center gap-2 whitespace-nowrap text-sm font-medium text-blue-100 transition hover:text-white hover:underline"
                      title="E-posta gönder"
                    >
                      <Mail
                        size={16}
                        strokeWidth={2}
                        className="shrink-0 text-blue-100"
                        aria-hidden="true"
                      />

                      <span>{displayedConsultantEmail}</span>
                    </a>
                  ) : (
                    <p className="mt-0.5 text-xs text-blue-300">
                      E-posta bilgisi yok
                    </p>
                  )}
                </div>
              </div>

              <div className="min-w-[210px] text-left">
                <p className="text-[10px] font-medium uppercase tracking-wide text-blue-200">
                  Genel İletişim
                </p>

                <a
                  href="tel:+902164506007"
                  className="mt-1 flex items-center justify-start gap-2 whitespace-nowrap text-[13px] font-medium text-white transition hover:underline"
                  title="Telefonla ara"
                >
                  <Phone
                    size={16}
                    strokeWidth={2}
                    className="shrink-0 text-blue-100"
                    aria-hidden="true"
                  />

                  <span>+90 216 450 60 07 (Pbx)</span>
                </a>

                <a
                  href="mailto:yatirimtesvik@akkasgroup.com"
                  className="mt-1 flex items-center justify-start gap-2 whitespace-nowrap text-[13px] font-medium text-blue-100 transition hover:text-white hover:underline"
                  title="E-posta gönder"
                >
                  <Mail
                    size={16}
                    strokeWidth={2}
                    className="shrink-0 text-blue-100"
                    aria-hidden="true"
                  />

                  <span>yatirimtesvik@akkasgroup.com</span>
                </a>
              </div>
            </div>
          )}

          {!showConsultantInfo && (
            <Link
              href="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-blue-700/80 bg-blue-700/50 text-white transition hover:bg-blue-700"
              title="Bildirimler"
              aria-label={`${unreadNotificationCount} okunmamış bildirim`}
            >
              <Bell size={19} />

              {unreadNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </Link>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-blue-700/80 bg-blue-700/50 px-2 py-1.5 transition hover:bg-blue-700/70 sm:gap-3 sm:px-3.5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-white">
                {userName}
              </p>

              <span className="inline-block text-sm font-medium text-blue-200">
                {roleLabel}
              </span>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-[11px] font-bold text-white shadow-sm shadow-red-600/20">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================
          MOBİL: Uzman + Genel İletişim bandı
          Sadece firma kullanıcısında ve lg altında görünür.
          Header'ın hemen altında sticky durur.
          ============================================================ */}
      {showConsultantInfo && (
        <div className="sticky top-16 z-20 border-b border-blue-900 bg-blue-800 px-3 pb-2 pt-1.5 text-blue-100 lg:hidden">
          {/* Uzman bilgisi + hızlı ikonlar */}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-blue-200">
                Uzmanınız
              </p>
              <p className="truncate text-xs font-bold text-white">
                {displayedConsultantName}
              </p>
            </div>

            {displayedConsultantPhone ? (
              <a
                href={`https://wa.me/${normalizeWhatsappPhone(displayedConsultantPhone)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp ile ara"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/20 text-green-300 transition active:scale-95"
              >
                <FaWhatsapp size={16} />
              </a>
            ) : null}

            {displayedConsultantEmail ? (
              <a
                href={`mailto:${displayedConsultantEmail}`}
                aria-label="Uzmana e-posta gönder"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-100 transition active:scale-95"
              >
                <Mail size={16} />
              </a>
            ) : null}
          </div>

          {/* Genel İletişim satırı */}
          <div className="mt-2 flex items-center gap-2 border-t border-blue-700/50 pt-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-blue-200">
                Genel İletişim
              </p>
              <p className="truncate text-[11px] font-medium text-blue-100">
                yatirimtesvik@akkasgroup.com
              </p>
            </div>

            <a
              href="tel:+902164506007"
              aria-label="Genel iletişim numarasını ara"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-white transition active:scale-95"
            >
              <Phone size={16} />
            </a>

            <a
              href="mailto:yatirimtesvik@akkasgroup.com"
              aria-label="Genel iletişim adresine mail gönder"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-100 transition active:scale-95"
            >
              <Mail size={16} />
            </a>
          </div>
        </div>
      )}

      {/* MOBİL DRAWER — sidebar'ın açılıp kapanan hali */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Karartma (dışarı tıklayınca kapanır) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
            aria-label="Menüyü kapat"
          />

          {/* Drawer — sidebar buraya girer */}
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900/70 text-white transition hover:bg-blue-900"
              aria-label="Menüyü kapat"
            >
              <X size={18} />
            </button>

            <AppSidebar role={role} userName={userName} variant="mobile" />
          </div>
        </div>
      )}
    </>
  );
}
