"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Info,
  ShieldAlert,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

type NotificationFilter = "ALL" | "UNREAD" | "READ";
type NotificationSeverity = "critical" | "warning" | "info";

interface NotificationItem {
  id: number;
  title: string;
  description: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  company: {
    id: number;
    name: string;
  } | null;
}

interface NotificationListResponse {
  success: boolean;
  message: string;
  data: {
    listedCount: number;
    unreadCount: number;
    notifications: NotificationItem[];
  };
}

const filterItems: Array<{
  label: string;
  value: NotificationFilter;
}> = [
  { label: "Tümü", value: "ALL" },
  { label: "Okunmamış", value: "UNREAD" },
  { label: "Okundu", value: "READ" },
];

const emptyStateCopy: Record<
  NotificationFilter,
  { title: string; description: string }
> = {
  ALL: {
    title: "Bildirim bulunamadı",
    description: "Henüz herhangi bir bildiriminiz yok.",
  },
  UNREAD: {
    title: "Her şey güncel",
    description: "Okunmamış bildiriminiz bulunmuyor.",
  },
  READ: {
    title: "Okunmuş bildirim yok",
    description: "Henüz okuduğunuz bir bildirim bulunmuyor.",
  },
};

function getNotificationIcon(type: string) {
  if (
    type === "DOCUMENT_EXPIRING" ||
    type === "DOCUMENT_EXPIRED" ||
    type === "EXTENSION_EXPIRING"
  ) {
    return FileText;
  }

  if (type === "AUTHORIZATION_EXPIRING" || type === "AUTHORIZATION_EXPIRED") {
    return ShieldAlert;
  }

  return Info;
}

function getNotificationSeverity(type: string): NotificationSeverity {
  if (type === "DOCUMENT_EXPIRED" || type === "AUTHORIZATION_EXPIRED") {
    return "critical";
  }

  if (
    type === "DOCUMENT_EXPIRING" ||
    type === "EXTENSION_EXPIRING" ||
    type === "AUTHORIZATION_EXPIRING"
  ) {
    return "warning";
  }

  return "info";
}

const severityIconStyles: Record<NotificationSeverity, string> = {
  critical: "border-red-100 bg-red-50 text-red-600",
  warning: "border-amber-100 bg-amber-50 text-amber-600",
  info: "border-sky-100 bg-sky-50 text-sky-600",
};

const severityDotStyles: Record<NotificationSeverity, string> = {
  critical: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-sky-600",
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMinutes < 1) {
    return "Az önce";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} dakika önce`;
  }

  if (isSameDay(date, now)) {
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} saat önce`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, yesterday)) {
    return `Dün ${new Intl.DateTimeFormat("tr-TR", { timeStyle: "short" }).format(date)}`;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Bildirimler yüklenirken bir hata oluştu.";
}

function NotificationSkeletonRow() {
  return (
    <div className="flex animate-pulse items-start gap-4 p-5">
      <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="h-3.5 w-1/3 rounded bg-slate-100" />
        <div className="h-3 w-2/3 rounded bg-slate-100" />
        <div className="h-2.5 w-24 rounded bg-slate-100" />
      </div>
      <div className="h-7 w-20 shrink-0 rounded-lg bg-slate-100" />
    </div>
  );
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await apiFetch<NotificationListResponse>(
          "/notifications?limit=100",
        );

        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadNotifications();
  }, []);

  const filterCounts = useMemo(
    () => ({
      ALL: notifications.length,
      UNREAD: unreadCount,
      READ: notifications.length - unreadCount,
    }),
    [notifications.length, unreadCount],
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "UNREAD") {
      return notifications.filter((notification) => !notification.isRead);
    }

    if (activeFilter === "READ") {
      return notifications.filter((notification) => notification.isRead);
    }

    return notifications;
  }, [activeFilter, notifications]);

  async function markAsRead(id: number) {
    const notification = notifications.find((item) => item.id === id);

    if (!notification || notification.isRead) {
      return;
    }

    try {
      setIsUpdating(true);
      setErrorMessage(null);

      await apiFetch(`/notifications/${id}/read`, {
        method: "PATCH",
      });

      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item.id === id
            ? {
                ...item,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));

      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) {
      return;
    }

    try {
      setIsUpdating(true);
      setErrorMessage(null);

      await apiFetch("/notifications/read-all", {
        method: "PATCH",
      });

      const readAt = new Date().toISOString();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt ?? readAt,
        })),
      );

      setUnreadCount(0);

      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  const activeEmptyState = emptyStateCopy[activeFilter];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
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
          onClick={() => void markAllAsRead()}
          disabled={unreadCount === 0 || isUpdating}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-semibold text-white shadow-xs transition-all hover:from-red-700 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck size={16} />
          Tümünü Okundu İşaretle
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Bell size={20} />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Okunmamış</p>
            <p className="text-lg font-bold text-red-600">{unreadCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
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

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {filterItems.map((filter) => {
              const active = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    active
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    {filterCounts[filter.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs font-medium text-slate-500">
            {filteredNotifications.length} bildirim gösteriliyor
          </p>
        </div>

        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, index) => (
              <NotificationSkeletonRow key={index} />
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const severity = getNotificationSeverity(notification.type);

              return (
                <article
                  key={notification.id}
                  onClick={() => void markAsRead(notification.id)}
                  className={`group flex flex-col gap-4 p-5 transition-colors duration-300 sm:flex-row sm:items-start ${
                    notification.isRead
                      ? "bg-white"
                      : "cursor-pointer bg-red-50/20 hover:bg-red-50/40"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-300 ${
                      notification.isRead
                        ? "border-slate-200 bg-slate-50 text-slate-400"
                        : severityIconStyles[severity]
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {notification.company && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <Building2
                          size={12}
                          className="shrink-0 text-red-500"
                        />
                        <span className="truncate text-[11px] font-semibold text-red-600">
                          {notification.company.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        {notification.title}
                      </h2>

                      {!notification.isRead && (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${severityDotStyles[severity]}`}
                          aria-label="Okunmamış bildirim"
                        />
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {notification.description}
                    </p>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                      <Clock3 size={12} />
                      {formatNotificationDate(notification.createdAt)}
                    </div>
                  </div>

                  {notification.isRead ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <Check size={14} />
                      Okundu
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void markAsRead(notification.id);
                      }}
                      disabled={isUpdating}
                      className="shrink-0 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all group-hover:border-red-200 group-hover:text-red-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Okundu işaretle
                    </button>
                  )}
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
              {activeEmptyState.title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {activeEmptyState.description}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
