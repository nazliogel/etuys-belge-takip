"use client";

// Belgeler ekranının görsel alt bileşenleri.

import { ChevronDown, ChevronsUpDown, ChevronUp, ShieldAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AuthorizationStatus, SortDirection } from "./types";

export function SortIcon({ direction }: { direction?: SortDirection }) {
  if (direction === "asc") return <ChevronUp size={12} />;
  if (direction === "desc") return <ChevronDown size={12} />;
  return <ChevronsUpDown size={12} className="opacity-40" />;
}

/* =====================================================
   SÜTUN FİLTRE (checkbox) DROPDOWN'I
   Uzman / Destekleme Sınıfı / Durum gibi az sayıda farklı
   değer alabilen sütunlarda, "sırala" yerine "filtrele"
   kullanımı çok daha kullanışlı: kullanıcı istediği kadar
   değeri aynı anda seçip listeyi daraltabiliyor.
===================================================== */
export function ColumnFilterDropdown({
  title,
  options,
  selected,
  onToggle,
  onClear,
  onClose,
  anchorRect,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  if (!anchorRect || typeof document === "undefined") {
    return null;
  }

  const dropdownWidth = 224;

  const left = Math.max(
    8,
    Math.min(
      anchorRect.left + anchorRect.width / 2 - dropdownWidth / 2,
      window.innerWidth - dropdownWidth - 8,
    ),
  );

  return createPortal(
    <div
      data-column-filter
      className="fixed z-[9999] w-56 rounded-xl border border-border bg-popover p-2 text-left normal-case text-popover-foreground shadow-xl"
      style={{
        top: anchorRect.bottom + 6,
        left,
      }}
    >
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-semibold text-red-600 hover:underline dark:text-red-400"
            >
              Temizle
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Filtreyi kapat"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {options.length === 0 ? (
          <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
            Seçenek yok
          </p>
        ) : (
          options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={() => onToggle(option.value)}
                className="h-3.5 w-3.5 shrink-0 rounded border-border text-red-600 focus:ring-2 focus:ring-red-500/20"
              />

              <span className="truncate">{option.label}</span>
            </label>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
}

/* =====================================================
   ALT BİLEŞENLER
===================================================== */

export function OperationStat({
  label,
  value,
  icon,
  valueClass = "text-foreground",
  onClick,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  valueClass?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full items-center gap-2 px-2.5 py-2.5 text-left transition hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500/30"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>

        <p className={`mt-0.5 truncate text-lg font-extrabold ${valueClass}`}>
          {value}
        </p>
      </div>
    </button>
  );
}

export function AuthorizationStatusBadge({ status }: { status: AuthorizationStatus }) {
  const config = {
    MISSING: {
      label: "Yetki Yok",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    },
    EXPIRED: {
      label: "Yetkisi Bitmiş",
      className:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
    },
    EXPIRING: {
      label: "6 Ay İçinde Bitecek",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    },
  };

  const current = config[status];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${current.className}`}
    >
      {current.label}
    </span>
  );
}

export function AuthorizationWarning({ variant }: { variant: "admin" | "company" }) {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 sm:h-11 sm:w-11">
            <ShieldAlert size={21} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Yetkilendirme gerekli
            </span>
            <h3 className="mt-1 text-sm font-bold text-foreground sm:text-base">
              Yetki süreniz dolmuştur.
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              Firmanın belge bilgilerinin görüntülenebilmesi için yeniden
              yetkilendirme yapılmalıdır.
            </p>
          </div>
        </div>

        {variant === "company" && (
          <div className="border-t border-border pt-2.5 lg:w-72 lg:shrink-0 lg:border-l lg:border-t-0 lg:py-1 lg:pl-3 lg:pt-0">
            <p className="text-xs font-medium leading-5 text-muted-foreground">
              Yetkilendirme işlemi için lütfen uzmanınız ile iletişime geçiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      label: string;
      dot: string;
      text: string;
      bg: string;
      border: string;
    }
  > = {
    ACTIVE: {
      label: "Aktif",
      dot: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-200/60 dark:border-emerald-500/30",
    },

    EXPIRED: {
      label: "Kapatma Yapılacak",
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-200/60 dark:border-red-500/30",
    },

    // getBadgeStatus'un döndürdüğü "Kapatma Yapılacak" görünümü
    CLOSURE_ELIGIBLE: {
      label: "Kapatma Yapılacak",
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-200 dark:border-red-500/30",
    },

    // getBadgeStatus'un döndürdüğü "Uzatma Yapılabilir" görünümü
    EXTENSION_ELIGIBLE: {
      label: "Uzatma Yapılabilir",
      dot: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200 dark:border-amber-500/30",
    },

    CLOSED: {
      label: "Kapalı",
      dot: "bg-blue-500",
      text: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      border: "border-blue-200 dark:border-blue-500/30",
    },

    CANCELLED: {
      label: "İptal",
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-300",
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-200/60 dark:border-red-500/30",
    },
    INACTIVE: {
      label: "Kapalı-İptal",
      dot: "bg-slate-400",
      text: "text-muted-foreground",
      bg: "bg-muted",
      border: "border-border",
    },
    AUTHORIZATION_EXPIRED: {
      label: "Yetkisi Bitmiş",
      dot: "bg-blue-500",
      text: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      border: "border-blue-200 dark:border-blue-500/30",
    },
  };

  const c = config[status] ?? {
    label: status,
    dot: "bg-slate-400",
    text: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  };

  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}