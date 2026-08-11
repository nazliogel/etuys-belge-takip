"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CheckCheck,
  Clock3,
  FileText,
  Info,
  ShieldAlert,
} from "lucide-react";

type NotificationFilter = "ALL" | "UNREAD" | "READ";

interface NotificationItem {
  id: number;
  title: string;
  description: string;
  date: string;
  type: "DOCUMENT" | "AUTHORIZATION" | "INFO";
  isRead: boolean;
  companyName?: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "Belge süresi yaklaşıyor",
    description:
      "1453 İstanbul Otomat firmasının 521456 numaralı belgesinin süresi yaklaşıyor.",
    date: "Bugün, 09:42",
    type: "DOCUMENT",
    isRead: false,
    companyName: "1453 İstanbul Otomat",
  },
  {
    id: 2,
    title: "Yetki süresi güncellendi",
    description:
      "Örnek Sanayi Limited Şirketinin yetki bitiş tarihi güncellendi.",
    date: "Dün, 16:18",
    type: "AUTHORIZATION",
    isRead: false,
    companyName: "Örnek Sanayi Limited Şirketi",
  },
  {
    id: 3,
    title: "Excel aktarımı tamamlandı",
    description:
      "Yüklenen Excel dosyasındaki firma ve belge kayıtları başarıyla işlendi.",
    date: "4 Ağustos 2026, 14:30",
    type: "INFO",
    isRead: true,
  },
  {
    id: 4,
    title: "Yeni firma kaydı oluşturuldu",
    description: "Akkaş Teknoloji Sanayi ve Ticaret A.Ş. sisteme eklendi.",
    date: "3 Ağustos 2026, 11:15",
    type: "INFO",
    isRead: true,
    companyName: "Akkaş Teknoloji Sanayi ve Ticaret A.Ş.",
  },
];

const filterItems: Array<{
  label: string;
  value: NotificationFilter;
}> = [
  { label: "Tümü", value: "ALL" },
  { label: "Okunmamış", value: "UNREAD" },
  { label: "Okundu", value: "READ" },
];

function getNotificationIcon(type: NotificationItem["type"]) {
  if (type === "DOCUMENT") {
    return FileText;
  }

  if (type === "AUTHORIZATION") {
    return ShieldAlert;
  }

  return Info;
}

export function NotificationsScreen() {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("ALL");

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "UNREAD") {
      return notifications.filter((notification) => !notification.isRead);
    }

    if (activeFilter === "READ") {
      return notifications.filter((notification) => notification.isRead);
    }

    return notifications;
  }, [activeFilter, notifications]);

  function toggleNotification(id: number) {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === id
          ? { ...notification, isRead: !notification.isRead }
          : notification,
      ),
    );
  }

  function markAllAsRead() {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        isRead: true,
      })),
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* BAŞLIK & AKSİYON */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bildirimler
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Belge, yetki ve sistem işlemleriyle ilgili bildirimleri yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-semibold text-white shadow-xs transition-all hover:from-red-700 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCheck size={16} />
          Tümünü Okundu İşaretle
        </button>
      </section>

      {/* ÖZET STATS */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Toplam Bildirim
            </p>
            <p className="text-lg font-bold text-slate-900">
              {notifications.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Okunmamış</p>
            <p className="text-lg font-bold text-red-600">{unreadCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Okundu</p>
            <p className="text-lg font-bold text-slate-900">
              {notifications.length - unreadCount}
            </p>
          </div>
        </div>
      </section>

      {/* BİLDİRİM LİSTESİ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* FİLTRE & SAYI */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {filterItems.map((filter) => {
              const active = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    active
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <p className="text-xs font-medium text-slate-500">
            {filteredNotifications.length} bildirim gösteriliyor
          </p>
        </div>

        {/* LİSTE */}
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);

              return (
                <article
                  key={notification.id}
                  className={`flex flex-col gap-4 p-5 transition-colors sm:flex-row sm:items-start ${
                    notification.isRead ? "bg-white" : "bg-red-50/20"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      notification.isRead
                        ? "border-slate-200 bg-slate-50 text-slate-500"
                        : "border-red-100 bg-red-50 text-red-600"
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {notification.companyName && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <Building2
                          size={12}
                          className="shrink-0 text-red-500"
                        />
                        <span className="truncate text-[11px] font-semibold text-red-600">
                          {notification.companyName}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        {notification.title}
                      </h2>

                      {!notification.isRead && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-red-600"
                          aria-label="Okunmamış bildirim"
                        />
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {notification.description}
                    </p>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                      <Clock3 size={12} />
                      {notification.date}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleNotification(notification.id)}
                    className="shrink-0 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                  >
                    {notification.isRead
                      ? "Okunmadı işaretle"
                      : "Okundu işaretle"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Bell size={24} />
            </div>

            <h2 className="mt-4 text-sm font-bold text-slate-800">
              Bildirim bulunamadı
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Seçtiğiniz filtreye uygun bildirim bulunmuyor.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
