"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getSessionUser } from "@/lib/mock-auth";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarClock,
  Clock3,
  FileCheck2,
  History,
  Pencil,
  Upload,
  AlertTriangle,
  ArrowUpRight,
  Ban,
} from "lucide-react";

type CompanyListResponse = {
  success: boolean;
  message: string;
  data: {
    items: unknown[];
    totalCount: number;
  };
};
type DocumentStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "INACTIVE";

type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  extensionDate: string | null;
  supportClass: string | null;
  isActive: boolean;
  status: DocumentStatus;
  company: {
    id: number;
    externalCompanyId: number;
    name: string;
    taxNumber: string;
  };
};

type DocumentListResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiDocument[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      total: number;
      active: number;
      expiring: number;
      expired: number;
      inactive: number;
    };
  };
};
type ImportBatchStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type ApiImportBatch = {
  id: number;
  fileName: string;
  status: ImportBatchStatus;
  uploadedAt: string;
  uploadedBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type ImportBatchListApiResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiImportBatch[];
    totalCount: number;
  };
};

type ApiImportChange = {
  id: number;
  importRowId: number;
  entityType: string;
  changeType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  status: string;
  companyId: number | null;
  documentId: number | null;
  company: {
    id: number;
    externalCompanyId: number;
    name: string;
    taxNumber: string;
  } | null;
  document: {
    id: number;
    externalDocumentId: number;
    documentNumber: string | null;
  } | null;
};

type ImportChangesApiResponse = {
  success: boolean;
  message: string;
  data: {
    totalChangeCount: number;
    fieldSummary: { fieldName: string; count: number }[];
    changes: ApiImportChange[];
  };
};

const CHANGE_FIELD_LABELS: Record<string, string> = {
  documentStartDate: "Belge Başlangıç Tarihi",
  documentEndDate: "Belge Bitiş Tarihi",
  extensionDate: "Uzatma Tarihi",
  documentNumber: "Belge Numarası",
  supportClass: "Destek Sınıfı",
  isActive: "Aktiflik Durumu",
  authorizationEndDate: "Yetki Bitiş Tarihi",
  name: "Firma Adı",
  taxNumber: "Vergi Kimlik No",
  processStatus: "İşlem Durumu",
};

function getChangeFieldLabel(fieldName: string): string {
  return CHANGE_FIELD_LABELS[fieldName] ?? fieldName;
}

function formatChangeValue(value: string | null): string {
  if (!value) {
    return "—";
  }

  const isoDatePattern = /^\d{4}-\d{2}-\d{2}/;

  if (isoDatePattern.test(value)) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("tr-TR");
    }
  }

  return value;
}

const documentHistoryItems = [
  {
    id: 1,
    documentNumber: "521456",
    companyName: "1453 İstanbul Otomat",
    action: "Belge bilgisi güncellendi",
    description: "Belge bitiş tarihi ve işlem durumu güncellendi.",
    date: "Bugün, 10:25",
    type: "UPDATED",
  },
  {
    id: 2,
    documentNumber: "487215",
    companyName: "Örnek Sanayi Limited Şirketi",
    action: "Yeni belge oluşturuldu",
    description: "Firmaya ait yeni teşvik belgesi sisteme eklendi.",
    date: "Dün, 15:40",
    type: "CREATED",
  },
  {
    id: 3,
    documentNumber: "635921",
    companyName: "Akkaş Teknoloji Sanayi ve Ticaret A.Ş.",
    action: "Excel üzerinden aktarıldı",
    description: "Belge bilgileri Excel içe aktarma işlemiyle güncellendi.",
    date: "4 Ağustos 2026, 14:30",
    type: "IMPORTED",
  },
] as const;

function getHistoryIcon(type: (typeof documentHistoryItems)[number]["type"]) {
  if (type === "CREATED") {
    return FileCheck2;
  }

  if (type === "UPDATED") {
    return Pencil;
  }

  return Upload;
}

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) {
    return null;
  }

  const end = new Date(endDate);
  const today = new Date();

  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - today.getTime();

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isSameDay(date, now)) {
    return `Bugün, ${time}`;
  }

  if (isSameDay(date, yesterday)) {
    return `Dün, ${time}`;
  }

  const dateLabel = date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${dateLabel}, ${time}`;
}

function getBatchStatusBadge(status: ImportBatchStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "UPLOADED":
      return {
        label: "Yüklendi",
        className: "bg-slate-100 text-slate-600",
      };
    case "PROCESSING":
      return {
        label: "İşleniyor",
        className: "bg-blue-50 text-blue-700 border border-blue-200/60",
      };
    case "WAITING_APPROVAL":
      return {
        label: "Onay Bekliyor",
        className: "bg-amber-50 text-amber-700 border border-amber-200/60",
      };
    case "COMPLETED":
      return {
        label: "Tamamlandı",
        className:
          "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
      };
    case "FAILED":
      return {
        label: "Başarısız",
        className: "bg-red-50 text-red-700 border border-red-200/60",
      };
    case "CANCELLED":
      return {
        label: "İptal Edildi",
        className: "bg-slate-100 text-slate-500",
      };
    default:
      return { label: status, className: "bg-slate-100 text-slate-600" };
  }
}

type SummaryItem = {
  title: string;
  value: string;
  description: string;
  icon: typeof Building2;
  href: string;
  clickable: boolean;
};

export function DashboardScreen() {
  const router = useRouter();
  const [totalCompanies, setTotalCompanies] = useState<number | null>(null);
  const [activeDocuments, setActiveDocuments] = useState<number | null>(null);
  const [expiringDocuments, setExpiringDocuments] = useState<number | null>(
    null,
  );
  const [closedCancelledDocuments, setClosedCancelledDocuments] = useState<
    number | null
  >(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<ApiDocument[]>(
    [],
  );
  const [recentImports, setRecentImports] = useState<ApiImportBatch[]>([]);
  const [recentChanges, setRecentChanges] = useState<ApiImportChange[]>([]);
  const [latestImportBatch, setLatestImportBatch] =
    useState<ApiImportBatch | null>(null);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const [
          companyResponse,
          documentResponse,
          expiringResponse,
          importResponse,
        ] = await Promise.all([
            apiFetch<CompanyListResponse>("/companies?page=1&limit=20"),
            apiFetch<DocumentListResponse>("/documents"),
            apiFetch<DocumentListResponse>(
              "/documents?status=EXPIRING&limit=20",
            ),
            apiFetch<ImportBatchListApiResponse>("/imports?page=1&limit=5"),
          ]);

        setTotalCompanies(companyResponse.data.totalCount);
        setActiveDocuments(documentResponse.data.summary.active);
        setExpiringDocuments(documentResponse.data.summary.expiring);
        setClosedCancelledDocuments(documentResponse.data.summary.inactive);

        const sortedExpiringItems = [...expiringResponse.data.items].sort(
          (a, b) => {
            if (!a.documentEndDate && !b.documentEndDate) {
              return 0;
            }
            if (!a.documentEndDate) {
              return 1;
            }
            if (!b.documentEndDate) {
              return -1;
            }

            return (
              new Date(a.documentEndDate).getTime() -
              new Date(b.documentEndDate).getTime()
            );
          },
        );

        setUpcomingDeadlines(sortedExpiringItems);
        setRecentImports(importResponse.data.items);

        const latestBatch = importResponse.data.items[0] ?? null;

        setLatestImportBatch(latestBatch);

        if (latestBatch) {
          const changesResponse = await apiFetch<ImportChangesApiResponse>(
            `/imports/${latestBatch.id}/changes`,
          );

          setRecentChanges(changesResponse.data.changes);
        } else {
          setRecentChanges([]);
        }
      } catch (error) {
        console.error("Dashboard istatistikleri alınamadı:", error);
        setTotalCompanies(0);
        setActiveDocuments(0);
        setExpiringDocuments(0);
        setClosedCancelledDocuments(0);
        setUpcomingDeadlines([]);
        setRecentImports([]);
        setLatestImportBatch(null);
        setRecentChanges([]);
      }
    }

    loadDashboardStats();
  }, []);

  const user = getSessionUser();
  const isCompany = user?.role === "COMPANY";

  const summaryItems: SummaryItem[] = [
    {
      title: "Toplam Firma",
      value: totalCompanies === null ? "..." : String(totalCompanies),
      description: "Sistemde kayıtlı firma",
      icon: Building2,
      href: "/companies",
      clickable: true,
    },
    {
      title: "Aktif Belge",
      value: activeDocuments === null ? "..." : String(activeDocuments),
      description: "Aktif durumda bulunan belge",
      icon: FileCheck2,
      href: "/documents?status=ACTIVE",
      clickable: true,
    },
    {
      title: "Süresi Yaklaşan",
      value: expiringDocuments === null ? "..." : String(expiringDocuments),
      description: "6 ay içinde süresi dolacak belge",
      icon: CalendarClock,
      href: "/documents?status=EXPIRING",
      clickable: true,
    },
    {
      title: "Kapalı / İptal",
      value:
        closedCancelledDocuments === null
          ? "..."
          : String(closedCancelledDocuments),
      description: "Kapatılmış veya iptal edilmiş belge",
      icon: Ban,
      href: "/documents?status=INACTIVE",
      clickable: true,
    },
    {
      title: "Yeni Bildirim",
      value: "7",
      description: "Okunmamış bildirim",
      icon: Bell,
      href: "/notifications",
      clickable: true,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* SAYFA BAŞLIĞI */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <span className="absolute inset-y-0 left-0 w-1 bg-red-600" />
        <div className="flex flex-col justify-between gap-3 pl-2 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                Yönetim Paneli
              </span>

              <span className="h-1 w-1 rounded-full bg-slate-300" />

              <span className="text-[11px] font-medium text-slate-500">
                Genel Bakış
              </span>
            </div>

            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
              Genel Bakış
            </h1>

            <p className="mt-0.5 text-xs text-slate-500">
              Firma, belge ve yetki süreçlerinizin güncel durum özeti.
            </p>
          </div>
        </div>
      </header>

      {/* İSTATİSTİK KARTLARI */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              onClick={
                item.clickable ? () => router.push(item.href) : undefined
              }
              onKeyDown={
                item.clickable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(item.href);
                      }
                    }
                  : undefined
              }
              role={item.clickable ? "link" : undefined}
              tabIndex={item.clickable ? 0 : undefined}
              className={`group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200
  before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-red-600
  ${
    item.clickable
      ? "cursor-pointer hover:-translate-y-0.5 hover:border-red-600 hover:shadow-md focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/40"
      : ""
  }
`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition ${
                    item.clickable
                      ? "group-hover:bg-red-600 group-hover:text-white"
                      : ""
                  }`}
                >
                  <Icon size={18} />
                </div>
                {item.clickable && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-400 transition group-hover:text-red-600">
                    <ArrowUpRight size={13} />
                  </span>
                )}
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {item.title}
                </p>
                <p className="mt-0.5 text-2xl font-extrabold text-slate-900 tracking-tight">
                  {item.value}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 font-medium">
                  {item.description}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* YAKLAŞAN SÜRELER & SON İŞLEMLER GRID */}
      <section
        className={`grid gap-6 ${isCompany ? "grid-cols-1" : "xl:grid-cols-2"}`}
      >
        {/* YAKLAŞAN SÜRELER */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <CalendarClock size={16} />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Yaklaşan Süreler
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Yakında süresi dolacak belge ve yetkiler.
                </p>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {upcomingDeadlines.length} Kayıt
            </span>
          </div>

          <div className="max-h-[264px] divide-y divide-slate-100 overflow-y-auto px-5">
            {expiringDocuments === null ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Yükleniyor...
              </p>
            ) : upcomingDeadlines.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                Süresi yaklaşan belge bulunmuyor.
              </p>
            ) : (
              upcomingDeadlines.map((document) => {
                const daysLeft = getDaysRemaining(document.documentEndDate);

                return (
                  <div
                    key={document.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-3 last:pb-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <div>
                        <p className="font-semibold text-sm text-slate-900">
                          {document.company.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {daysLeft !== null ? (
                            <>
                              Belge süresinin dolmasına{" "}
                              <strong className="text-amber-600">
                                {daysLeft} gün
                              </strong>{" "}
                              kaldı.
                            </>
                          ) : (
                            "Belge bitiş tarihi bulunmuyor."
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg bg-amber-50 border border-amber-200/60 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      Yaklaşıyor
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SON İŞLEMLER */}
        {!isCompany && (
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Clock3 size={16} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Son İşlemler
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {latestImportBatch
                      ? `${latestImportBatch.fileName} • ${formatEventDate(latestImportBatch.uploadedAt)}`
                      : "Sistem üzerinde gerçekleştirilen son hareketler."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {latestImportBatch && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      getBatchStatusBadge(latestImportBatch.status)
                        .className
                    }`}
                  >
                    {getBatchStatusBadge(latestImportBatch.status).label}
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {recentChanges.length} Değişiklik
                </span>
              </div>
            </div>

            <div className="max-h-[264px] divide-y divide-slate-100 overflow-y-auto px-5">
              {expiringDocuments === null ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Yükleniyor...
                </p>
              ) : recentChanges.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Son Excel yüklemesinde değişiklik bulunmuyor.
                </p>
              ) : (
                recentChanges.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-start gap-3.5 py-3 first:pt-3 last:pb-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Pencil size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-900">
                        {change.company?.name ??
                          change.document?.documentNumber ??
                          "Kayıt"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {getChangeFieldLabel(change.fieldName)}:{" "}
                        <span className="text-slate-400 line-through">
                          {formatChangeValue(change.oldValue)}
                        </span>{" "}
                        →{" "}
                        <span className="font-semibold text-emerald-600">
                          {formatChangeValue(change.newValue)}
                        </span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* BELGE İŞLEM GEÇMİŞİ */}
        {!isCompany && (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:col-span-2">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <History size={16} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Belge İşlem Geçmişi
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Belgeler üzerinde gerçekleştirilen detaylı işlem dökümü.
                  </p>
                </div>
              </div>

              <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
                Son {documentHistoryItems.length} İşlem
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {documentHistoryItems.map((item) => {
                const HistoryIcon = getHistoryIcon(item.type);

                return (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center justify-between"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                        <HistoryIcon size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm text-slate-900">
                            {item.action}
                          </h3>

                          <span className="rounded-md bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Belge No: {item.documentNumber}
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-semibold text-slate-800">
                          {item.companyName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-400 self-end sm:self-center">
                      <Clock3 size={13} />
                      {item.date}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}