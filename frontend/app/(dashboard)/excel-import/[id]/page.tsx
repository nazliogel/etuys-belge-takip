"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

/* =====================================================
   TYPES
===================================================== */

type ImportChange = {
  id: number;
  importRowId: number | null;
  entityType: string;
  changeType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type ImportRow = {
  id: number;
  rowNumber: number;
  status: "PENDING" | "NEW" | "CHANGED" | "UNCHANGED" | "INVALID" | "CONFLICT";
  externalCompanyId: number | null;
  companyName: string | null;
  taxNumber: string | null;
  authorizationEndDate: string | null;
  externalDocumentId: number | null;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  extensionDate: string | null;
  supportClass: string | null;
  processStatus: string | null;
};

type ImportDetail = {
  id: number;
  fileName: string;
  status: string;
  totalRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  newRowCount: number;
  changedRowCount: number;
  unchangedRowCount: number;
  uploadedAt: string;
  reviewedAt?: string | null;
  completedAt?: string | null;
  rows: ImportRow[];
  changes: ImportChange[];
};

type ImportDetailResponse = {
  success: boolean;
  message: string;
  data: ImportDetail;
};

type TabType = "ALL" | "NEW" | "CHANGED";

/* =====================================================
   CONSTANTS
===================================================== */

const PAGE_SIZE = 21;

const fieldLabels: Record<string, string> = {
  name: "Firma Adı",
  taxNumber: "VKN",
  processStatus: "İşlem Durumu",
  authorizationEndDate: "Yetki Bitiş Tarihi",
  documentNumber: "Belge No",
  documentStartDate: "Belge Başlangıç Tarihi",
  documentEndDate: "Belge Bitiş Tarihi",
  extensionDate: "Süre Uzatım Tarihi",
  supportClass: "Destekleme Sınıfı",
};

/* =====================================================
   HELPERS
===================================================== */

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChangeValue(fieldName: string, value: string | null) {
  if (!value) return "-";
  if (fieldName.toLowerCase().includes("date")) return formatDate(value);
  return value;
}

function getChangeLabel(change: ImportChange) {
  if (change.fieldName === "__entity__") {
    if (change.entityType === "COMPANY") return "Yeni Firma";
    if (change.entityType === "INCENTIVE_DOCUMENT") return "Yeni Teşvik Belgesi";
    if (change.entityType === "COMPANY_AUTHORIZATION") return "Firma Yetkisi";
    return "Yeni Kayıt";
  }
  if (change.fieldName === "__missing_in_snapshot__") return "Yeni Listede Yok";
  return fieldLabels[change.fieldName] ?? change.fieldName;
}

/* =====================================================
   PAGE
===================================================== */

export default function ExcelImportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadDetail() {
      try {
        setIsLoading(true);
        setError("");
        const response = await apiFetch<ImportDetailResponse>(
          `/imports/${params.id}`,
        );
        setDetail(response.data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Karşılaştırma raporu alınamadı.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void loadDetail();
  }, [params.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
    setExpandedRowId(null);
  }, [searchTerm, activeTab]);

  // ESC ile modal kapatma
  useEffect(() => {
    if (expandedRowId === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpandedRowId(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expandedRowId]);

  /* ===================================================
     LOADING
  =================================================== */

  if (isLoading) {
    return (
      <div className="bg-slate-50">
        <div className="mx-auto max-w-[1400px] px-3 pt-3 pb-3 sm:px-4">
          <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={22} className="animate-spin text-red-600" />
              <p className="text-xs font-medium text-slate-500">
                Karşılaştırma raporu yükleniyor...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===================================================
     ERROR
  =================================================== */

  if (error || !detail) {
    return (
      <div className="bg-slate-50">
        <div className="mx-auto max-w-[1400px] px-3 pt-3 pb-3 sm:px-4">
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0 text-rose-600"
            />
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Rapor yüklenemedi
              </p>
              <p className="mt-0.5 text-xs text-rose-700">
                {error || "Rapor bulunamadı."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===================================================
     DATA
  =================================================== */

  const newRows = detail.rows.filter((row) => row.status === "NEW");
  const changedRows = detail.rows.filter((row) => row.status === "CHANGED");
  const reviewRows = [...newRows, ...changedRows];

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");

  const filteredRows = reviewRows.filter((row) => {
    if (activeTab !== "ALL" && row.status !== activeTab) return false;
    if (!normalizedSearch) return true;
    const searchableValues = [
      row.companyName,
      row.taxNumber,
      row.externalCompanyId?.toString(),
      row.documentNumber,
      row.externalDocumentId?.toString(),
    ];
    return searchableValues.some((value) =>
      value?.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);
  const firstVisibleRecord = filteredRows.length === 0 ? 0 : pageStart + 1;
  const lastVisibleRecord = Math.min(
    pageStart + PAGE_SIZE,
    filteredRows.length,
  );

  function getRowChanges(rowId: number) {
    return detail!.changes.filter((change) => change.importRowId === rowId);
  }

  function changePage(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setExpandedRowId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-3 pt-3 pb-3 space-y-3 sm:px-4">
        {/* HEADER — sol kırmızı stripe */}
        <header className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
          <span className="absolute left-0 top-0 h-full w-1 bg-red-600" />

          <div className="flex flex-col justify-between gap-3 pl-2 md:flex-row md:items-center">
            <div className="min-w-0">
              {/* Breadcrumb */}
              <nav className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => router.push("/excel-import")}
                  className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Excel Karşılaştırma listesine dön"
                >
                  <ArrowLeft size={11} />
                  Excel Karşılaştırma
                </button>
                <ChevronRight size={11} className="text-slate-300" />
                <span className="font-semibold text-slate-700">
                  Rapor #{detail.id}
                </span>
              </nav>

              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Karşılaştırma Raporu
              </h1>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <FileSpreadsheet size={12} />
                  <span className="truncate font-medium text-slate-700">
                    {detail.fileName}
                  </span>
                </span>
                <span className="hidden text-slate-300 sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={11} />
                  {formatDateTime(detail.uploadedAt)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />

              {detail.status === "WAITING_APPROVAL" && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/excel-import/${detail.id}/approval`)
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Onay Ekranına Geç
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* KPI KARTLARI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard label="Toplam" value={detail.totalRowCount} />
          <KpiCard
            label="Yeni"
            value={detail.newRowCount}
            tone="emerald"
            prefix="+"
          />
          <KpiCard
            label="Değişen"
            value={detail.changedRowCount}
            tone="amber"
          />
          <KpiCard label="Değişmeyen" value={detail.unchangedRowCount} muted />
          <KpiCard
            label="Hatalı"
            value={detail.invalidRowCount}
            tone={detail.invalidRowCount > 0 ? "rose" : undefined}
            muted={detail.invalidRowCount === 0}
          />
        </div>

        {/* TOOLBAR + KARTLAR */}
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  İncelenecek Kayıtlar
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Firma adı, VKN, firma ID veya belge numarası ile arama
                  yapabilirsiniz.
                </p>
              </div>

              <div className="relative w-full lg:w-72">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Firma, VKN veya belge no ara..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-400 transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Aramayı temizle"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Tab chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip
                active={activeTab === "ALL"}
                onClick={() => setActiveTab("ALL")}
                label="Tümü"
                count={reviewRows.length}
              />
              <FilterChip
                active={activeTab === "NEW"}
                onClick={() => setActiveTab("NEW")}
                label="Yeni"
                count={newRows.length}
              />
              <FilterChip
                active={activeTab === "CHANGED"}
                onClick={() => setActiveTab("CHANGED")}
                label="Değişen"
                count={changedRows.length}
              />

              <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
                {filteredRows.length > 0 && (
                  <span className="font-semibold tabular-nums">
                    {firstVisibleRecord}–{lastVisibleRecord} / {filteredRows.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Kartlar */}
          {paginatedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Search size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Kayıt bulunamadı
                </p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">
                  Arama kelimenizi veya seçili filtreyi değiştirebilirsiniz.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginatedRows.map((row) => {
                const changes = getRowChanges(row.id);
                const isNew = row.status === "NEW";

                return (
                  <article
                    key={row.id}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Kart header */}
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <RowTypeBadge isNew={isNew} />
                            {row.externalCompanyId && (
                              <span className="font-mono text-[10px] text-slate-400">
                                ID: {row.externalCompanyId}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-900">
                            {row.companyName ?? "Firma adı bulunamadı"}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                            {row.taxNumber && (
                              <>
                                <span>
                                  VKN:{" "}
                                  <span className="font-mono font-semibold text-slate-700">
                                    {row.taxNumber}
                                  </span>
                                </span>
                                <Separator />
                              </>
                            )}
                            {row.documentNumber && (
                              <>
                                <span>
                                  Belge:{" "}
                                  <span className="font-semibold text-slate-700">
                                    {row.documentNumber}
                                  </span>
                                </span>
                                <Separator />
                              </>
                            )}
                            <span>
                              Yetki Bitiş:{" "}
                              <span className="font-semibold text-slate-700">
                                {formatDate(row.authorizationEndDate)}
                              </span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedRowId(row.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          Detay
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>

                    {/* YENİ KAYIT — her zaman 2x2 = 4 alan, belge yoksa fallback alanlar */}
                    {isNew && (
                      <div className="flex-1 border-t border-slate-100 bg-emerald-50/20 px-4 py-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <CardInfo
                            label="İşlem Durumu"
                            value={row.processStatus ?? "—"}
                          />
                          <CardInfo
                            label={
                              row.documentNumber ? "Belge No" : "Belge Durumu"
                            }
                            value={row.documentNumber ?? "Belge yok"}
                          />

                          {row.documentNumber ? (
                            <>
                              <CardInfo
                                label="Destekleme Sınıfı"
                                value={row.supportClass ?? "—"}
                              />
                              <CardInfo
                                label="Süre Uzatım"
                                value={
                                  row.extensionDate
                                    ? formatDate(row.extensionDate)
                                    : "—"
                                }
                              />
                            </>
                          ) : (
                            <>
                              <CardInfo
                                label="VKN"
                                value={row.taxNumber ?? "—"}
                                mono
                              />
                              <CardInfo
                                label="Yetki Bitiş"
                                value={formatDate(row.authorizationEndDate)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* DEĞİŞEN KAYIT — en fazla 2 değişiklik önizleme */}
                    {!isNew && (
                      <div className="flex-1 border-t border-slate-100">
                        {changes.length === 0 ? (
                          <div className="px-4 py-3 text-[11px] text-slate-500">
                            Değişiklik detayı bulunamadı.
                          </div>
                        ) : (
                          <>
                            <div className="divide-y divide-slate-100">
                              {changes.slice(0, 2).map((change) => (
                                <div key={change.id} className="px-4 py-3">
                                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                                    {getChangeLabel(change)}
                                  </p>

                                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
                                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                                        Eski
                                      </p>
                                      <p className="mt-0.5 break-words text-xs font-medium text-slate-600 line-through decoration-slate-300">
                                        {formatChangeValue(
                                          change.fieldName,
                                          change.oldValue,
                                        )}
                                      </p>
                                    </div>

                                    <div className="hidden justify-center sm:flex">
                                      <ArrowRight
                                        size={13}
                                        className="text-slate-300"
                                      />
                                    </div>

                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5">
                                      <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700">
                                        Yeni
                                      </p>
                                      <p className="mt-0.5 break-words text-xs font-bold text-emerald-900">
                                        {formatChangeValue(
                                          change.fieldName,
                                          change.newValue,
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {changes.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setExpandedRowId(row.id)}
                                className="flex w-full items-center justify-center gap-1 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50/50"
                              >
                                +{changes.length - 2} değişiklik daha
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                  </article>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}
          {filteredRows.length > PAGE_SIZE && (
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={changePage}
            />
          )}
        </div>
      </div>

      {/* DETAY MODAL */}
      {expandedRowId !== null && (() => {
        const row = detail.rows.find((r) => r.id === expandedRowId);
        if (!row) return null;
        return (
          <DetailModal
            row={row}
            changes={getRowChanges(row.id)}
            onClose={() => setExpandedRowId(null)}
          />
        );
      })()}
    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function StatusBadge({ status }: { status: string }) {
  const meta: Record<
    string,
    { label: string; text: string; dot: string }
  > = {
    COMPLETED: {
      label: "Tamamlandı",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    WAITING_APPROVAL: {
      label: "Onay Bekliyor",
      text: "text-amber-800",
      dot: "bg-amber-500 animate-pulse",
    },
    PROCESSING: {
      label: "İşleniyor",
      text: "text-red-700",
      dot: "bg-red-500 animate-pulse",
    },
    UPLOADED: {
      label: "Yüklendi",
      text: "text-slate-700",
      dot: "bg-slate-400",
    },
    FAILED: {
      label: "Hatalı",
      text: "text-rose-700",
      dot: "bg-rose-500",
    },
  };

  const item = meta[status] ?? {
    label: status,
    text: "text-slate-700",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${item.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  tone,
  muted,
  prefix = "",
}: {
  label: string;
  value: number;
  tone?: "emerald" | "amber" | "rose";
  muted?: boolean;
  prefix?: string;
}) {
  const toneMap = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  } as const;

  const dotMap = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  } as const;

  const valueClass = tone
    ? toneMap[tone]
    : muted
      ? "text-slate-500"
      : "text-slate-900";

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-1.5">
        {tone && (
          <span className={`h-1.5 w-1.5 rounded-full ${dotMap[tone]}`} />
        )}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>
        {value > 0 && prefix}
        {value.toLocaleString("tr-TR")}
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-red-600 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
      <span
        className={`rounded px-1 text-[10px] font-bold tabular-nums ${
          active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function RowTypeBadge({ isNew }: { isNew: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        isNew
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      }`}
    >
      <span
        className={`h-1 w-1 rounded-full ${
          isNew ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {isNew ? "Yeni" : "Değişti"}
    </span>
  );
}

function CardInfo({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 break-words text-xs font-semibold text-slate-800 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-semibold text-slate-800 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

function DetailModal({
  row,
  changes,
  onClose,
}: {
  row: ImportRow;
  changes: ImportChange[];
  onClose: () => void;
}) {
  const isNew = row.status === "NEW";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="relative border-b border-slate-100 px-5 py-4">
          <span className="absolute left-0 top-0 h-full w-1 bg-red-600" />
          <div className="flex items-start justify-between gap-3 pl-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isNew
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      isNew ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {isNew ? "Yeni" : "Değişti"}
                </span>
                {row.externalCompanyId && (
                  <span className="font-mono text-[11px] text-slate-500">
                    ID: {row.externalCompanyId}
                  </span>
                )}
              </div>
              <h3
                id="detail-modal-title"
                className="mt-1.5 text-base font-bold text-slate-900"
              >
                {row.companyName ?? "Firma adı bulunamadı"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] space-y-5 overflow-y-auto p-5">
          {/* Tüm değişiklikler (sadece DEĞİŞEN kayıtta) */}
          {!isNew && changes.length > 0 && (
            <section>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <span className="h-1 w-1 rounded-full bg-amber-500" />
                Tüm Değişiklikler ({changes.length})
              </p>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                {changes.map((change) => (
                  <div key={change.id} className="bg-white px-3 py-2.5">
                    <p className="mb-1.5 text-xs font-semibold text-slate-700">
                      {getChangeLabel(change)}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div className="rounded-md border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          Eski
                        </p>
                        <p className="mt-0.5 break-words text-xs font-medium text-slate-600 line-through decoration-slate-300">
                          {formatChangeValue(change.fieldName, change.oldValue)}
                        </p>
                      </div>
                      <div className="hidden justify-center sm:flex">
                        <ArrowRight size={13} className="text-slate-300" />
                      </div>
                      <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700">
                          Yeni
                        </p>
                        <p className="mt-0.5 break-words text-xs font-bold text-emerald-900">
                          {formatChangeValue(change.fieldName, change.newValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tüm alanlar */}
          <section>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Kayıt Detayı
            </p>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailItem label="Firma ID" value={row.externalCompanyId} mono />
              <DetailItem label="VKN" value={row.taxNumber} mono />
              <DetailItem
                label="Belge ID"
                value={row.externalDocumentId}
                mono
              />
              <DetailItem label="Belge No" value={row.documentNumber} />
              <DetailItem
                label="Yetki Bitiş"
                value={formatDate(row.authorizationEndDate)}
              />
              <DetailItem
                label="Belge Başlangıç"
                value={formatDate(row.documentStartDate)}
              />
              <DetailItem
                label="Belge Bitiş"
                value={formatDate(row.documentEndDate)}
              />
              <DetailItem
                label="Süre Uzatım"
                value={formatDate(row.extensionDate)}
              />
              <DetailItem
                label="Destekleme Sınıfı"
                value={row.supportClass}
              />
              <DetailItem label="İşlem Durumu" value={row.processStatus} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="text-[11px] text-slate-500">
            ESC ile kapatabilirsiniz
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function Separator() {
  return (
    <span aria-hidden className="text-slate-300">
      •
    </span>
  );
}

/* =====================================================
   PAGINATION
===================================================== */

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);
  const pages = [];
  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:flex-row">
      <p className="text-[11px] text-slate-500">
        Sayfa{" "}
        <strong className="font-semibold text-slate-700 tabular-nums">
          {currentPage}
        </strong>{" "}
        /{" "}
        <span className="tabular-nums">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={12} />
          Önceki
        </button>

        {startPage > 1 && (
          <>
            <PageButton
              page={1}
              active={currentPage === 1}
              onClick={onPageChange}
            />
            {startPage > 2 && (
              <span className="px-1 text-[11px] text-slate-400">…</span>
            )}
          </>
        )}

        {pages.map((page) => (
          <PageButton
            key={page}
            page={page}
            active={currentPage === page}
            onClick={onPageChange}
          />
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-1 text-[11px] text-slate-400">…</span>
            )}
            <PageButton
              page={totalPages}
              active={currentPage === totalPages}
              onClick={onPageChange}
            />
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sonraki
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function PageButton({
  page,
  active,
  onClick,
}: {
  page: number;
  active: boolean;
  onClick: (page: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(page)}
      className={`hidden h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums transition-colors sm:inline-flex ${
        active
          ? "bg-red-600 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {page}
    </button>
  );
}