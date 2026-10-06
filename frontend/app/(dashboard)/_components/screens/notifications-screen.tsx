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
import type { UserRole } from "../../_lib/permissions";

type NotificationFilter = "ALL" | "UNREAD" | "READ";
type NotificationSeverity = "critical" | "warning" | "info";

interface NotificationItem {
  id: number;
  title: string;
  description: string;
  type: string;
  targetDate?: string | null;
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
  critical:
    "border-red-100 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
  warning:
    "border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  info: "border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
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
    <div className="flex animate-pulse items-start gap-3 p-3 sm:gap-4 sm:p-5">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-muted sm:h-10 sm:w-10" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="h-3.5 w-1/3 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
        <div className="h-2.5 w-24 rounded bg-muted" />
      </div>
      <div className="hidden h-7 w-20 shrink-0 rounded-lg bg-muted sm:block" />
    </div>
  );
}

function getTurkeyDayTimestamp(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)!.value);

  return Date.UTC(get("year"), get("month") - 1, get("day"));
}

function getExtensionRemainingDays(
  notification: NotificationItem,
  today: number,
): number | null {
  if (
    notification.type !== "EXTENSION_APPLICATION" ||
    !notification.targetDate
  ) {
    return null;
  }

  const target = new Date(notification.targetDate);

  if (Number.isNaN(target.getTime())) return null;

  // Backend ile aynı hesap: hedef tarihe 18 ay ekle,
  // gün ayın sonunu aşıyorsa son güne sabitle.
  const firstDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 18, 1),
  );

  const lastDay = new Date(
    Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0),
  ).getUTCDate();

  const deadline = Date.UTC(
    firstDay.getUTCFullYear(),
    firstDay.getUTCMonth(),
    Math.min(target.getUTCDate(), lastDay),
  );

  return Math.round((deadline - today) / 86_400_000);
}

function getDocumentRemainingDays(
  notification: NotificationItem,
  today: number,
): number | null {
  if (
    notification.type !== "EXTENSION_APPLICATION" ||
    !notification.targetDate
  ) {
    return null;
  }

  const date = new Date(notification.targetDate);

  if (Number.isNaN(date.getTime())) return null;

  const endDay = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  return Math.round((endDay - today) / 86_400_000);
}

export function NotificationsScreen({ role }: { role: UserRole }) {
  const notificationEndpoint =
    role === "COMPANY" ? "/company-notifications" : "/notifications";

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [today, setToday] = useState(() => getTurkeyDayTimestamp(new Date()));

  useEffect(() => {
    const updateToday = () => {
      setToday(getTurkeyDayTimestamp(new Date()));
    };

    // Sayfa açıkken ve sekmeye geri dönüldüğünde günü güncelle.
    const intervalId = window.setInterval(updateToday, 60_000);
    window.addEventListener("focus", updateToday);
    document.addEventListener("visibilitychange", updateToday);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", updateToday);
      document.removeEventListener("visibilitychange", updateToday);
    };
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await apiFetch<NotificationListResponse>(
          `${notificationEndpoint}?limit=100`,
        );

        setNotifications(response.data.notifications);
        setUnreadCount(Math.max(0, response.data.unreadCount ?? 0));
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadNotifications();
  }, [notificationEndpoint]);

  const filterCounts = useMemo(
    () => ({
      ALL: notifications.length,
      UNREAD: notifications.filter((item) => !item.isRead).length,
      READ: notifications.filter((item) => item.isRead).length,
    }),
    [notifications],
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

    if (isUpdating || !notification || notification.isRead) {
      return;
    }

    try {
      setIsUpdating(true);
      setErrorMessage(null);

      await apiFetch(`${notificationEndpoint}/${id}/read`, {
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

  async function markAsUnread(id: number) {
    const notification = notifications.find((item) => item.id === id);

    if (
      role !== "COMPANY" ||
      isUpdating ||
      !notification ||
      !notification.isRead
    ) {
      return;
    }

    try {
      setIsUpdating(true);
      setErrorMessage(null);

      const response = await apiFetch<{
        success: boolean;
        data: {
          notificationId: number;
          isRead: boolean;
          unreadCount: number;
        };
      }>(`/company-notifications/${id}/unread`, {
        method: "PATCH",
      });

      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item.id === id ? { ...item, isRead: false, readAt: null } : item,
        ),
      );

      setUnreadCount(response.data.unreadCount);

      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  async function markAllAsRead() {
    if (isUpdating || unreadCount === 0) {
      return;
    }

    try {
      setIsUpdating(true);
      setErrorMessage(null);

      await apiFetch(`${notificationEndpoint}/read-all`, {
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
    <div className="mx-auto max-w-7xl space-y-4 pb-8 sm:space-y-6 sm:pb-12">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">
            Bildirimler
          </h1>

          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Belge, yetki ve sistem işlemleriyle ilgili bildirimleri yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void markAllAsRead()}
          disabled={unreadCount === 0 || isUpdating}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-semibold text-white shadow-xs transition-all hover:from-red-700 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          <CheckCheck size={16} />
          Tümünü Okundu İşaretle
        </button>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs dark:shadow-none sm:gap-4 sm:p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:h-11 sm:w-11">
            <Bell size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Listelenen Bildirim
            </p>
            <p className="text-lg font-bold text-foreground">
              {notifications.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs dark:shadow-none sm:gap-4 sm:p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 sm:h-11 sm:w-11">
            <Bell size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Okunmamış
            </p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {unreadCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs dark:shadow-none sm:gap-4 sm:p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 sm:h-11 sm:w-11">
            <CheckCheck size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Okundu</p>
            <p className="text-lg font-bold text-foreground">
              {filterCounts.READ}
            </p>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs dark:shadow-none">
        <div className="flex flex-col justify-between gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {filterItems.map((filter) => {
              const active = activeFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all sm:px-4 sm:py-2 ${
                    active
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 dark:hover:bg-muted/60"
                  }`}
                >
                  {filter.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {filterCounts[filter.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
            {filteredNotifications.length} bildirim gösteriliyor
          </p>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <NotificationSkeletonRow key={index} />
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const severity = getNotificationSeverity(notification.type);

              const remainingDays =
                role === "COMPANY"
                  ? getExtensionRemainingDays(notification, today)
                  : null;

              const documentRemainingDays =
                role === "COMPANY"
                  ? getDocumentRemainingDays(notification, today)
                  : null;

              return (
                <article
                  key={notification.id}
                  onClick={() => void markAsRead(notification.id)}
                  className={`group flex flex-col gap-3 p-3 transition-colors duration-300 sm:flex-row sm:items-start sm:gap-4 sm:p-5 ${
                    notification.isRead
                      ? "bg-card"
                      : "cursor-pointer bg-red-50/20 hover:bg-red-50/40 dark:bg-red-500/[0.06] dark:hover:bg-red-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3 sm:contents">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-300 sm:h-10 sm:w-10 ${
                        notification.isRead
                          ? "border-border bg-muted text-muted-foreground"
                          : severityIconStyles[severity]
                      }`}
                    >
                      <Icon size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                      {notification.company && (
                        <div className="mb-1 flex items-center gap-1.5">
                          <Building2
                            size={12}
                            className="shrink-0 text-red-500 dark:text-red-400"
                          />
                          <span className="truncate text-[11px] font-semibold text-red-600 dark:text-red-400">
                            {notification.company.name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <h2 className="text-sm font-bold leading-snug text-foreground">
                          {notification.title}
                        </h2>

                        {!notification.isRead && (
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDotStyles[severity]}`}
                            aria-label="Okunmamış bildirim"
                          />
                        )}
                      </div>

                      <p className="mt-1 whitespace-pre-line text-xs leading-5 text-muted-foreground">
                        {notification.description}
                      </p>
                      {documentRemainingDays !== null &&
                        documentRemainingDays >= 0 && (
                          <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                            {documentRemainingDays === 0
                              ? "Belgenizin süresi bugün dolmaktadır."
                              : `Belgenizin süresi ${documentRemainingDays} gün sonra dolacaktır.`}
                          </p>
                        )}

                      {remainingDays !== null && (
                        <div
                          className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                            remainingDays <= 30
                              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                          }`}
                        >
                          <Clock3 size={13} className="shrink-0" />

                          <span>
                            {remainingDays < 0
                              ? "Süre uzatma başvuru süresi doldu"
                              : remainingDays === 0
                                ? "Süre uzatma başvurusu için son gün"
                                : `Süre uzatma başvurusu için kalan: ${remainingDays} gün`}
                          </span>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Clock3 size={12} />
                        {formatNotificationDate(notification.createdAt)}
                      </div>
                    </div>
                  </div>

                  {notification.isRead ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <Check size={14} />
                        Okundu
                      </span>

                      {role === "COMPANY" && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void markAsUnread(notification.id);
                          }}
                          disabled={isUpdating}
                          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Okunmadı olarak işaretle
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void markAsRead(notification.id);
                      }}
                      disabled={isUpdating}
                      className="w-full shrink-0 self-start rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80 shadow-2xs transition-all group-hover:border-red-300 group-hover:text-red-600 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 dark:group-hover:border-red-500/40 dark:group-hover:text-red-400 dark:shadow-none sm:w-auto"
                    >
                      Okundu işaretle
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 py-12 text-center sm:py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Bell size={24} />
            </div>

            <h2 className="mt-4 text-sm font-bold text-foreground">
              {activeEmptyState.title}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {activeEmptyState.description}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
