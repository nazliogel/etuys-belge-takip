"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Mail, Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import { apiFetch } from "@/lib/api";
import type { UserRole } from "../_lib/permissions";

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

export function AppHeader({
  userName,
  role,
  consultantName,
  consultantPhone,
  consultantEmail,
}: AppHeaderProps) {
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-blue-900 bg-blue-800 px-6 text-blue-100 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-tight text-white">
          {panelTitle}
        </h1>
      </div>

      <div className="flex items-center gap-3">
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
                    <FaWhatsapp size={16} color="#22c55e" aria-hidden="true" />
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
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </span>
            )}
          </Link>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-blue-700/80 bg-blue-700/50 px-3.5 py-1.5 transition hover:bg-blue-700/70">
          <div className="text-right">
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
  );
}
