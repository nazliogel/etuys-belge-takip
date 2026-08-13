"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
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

const PAGE_SIZE = 20;

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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("tr-TR");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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

  if (fieldName.toLowerCase().includes("date")) {
    return formatDate(value);
  }

  return value;
}

function getChangeLabel(change: ImportChange) {
  if (change.fieldName === "__entity__") {
    if (change.entityType === "COMPANY") {
      return "Yeni Firma";
    }

    if (change.entityType === "INCENTIVE_DOCUMENT") {
      return "Yeni Teşvik Belgesi";
    }

    if (change.entityType === "COMPANY_AUTHORIZATION") {
      return "Firma Yetkisi";
    }

    return "Yeni Kayıt";
  }

  if (change.fieldName === "__missing_in_snapshot__") {
    return "Yeni Listede Yok";
  }

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

  /* ===================================================
     LOAD
  =================================================== */

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

  /* Arama veya tab değişirse ilk sayfaya dön */
  useEffect(() => {
    setCurrentPage(1);
    setExpandedRowId(null);
  }, [searchTerm, activeTab]);

  /* ===================================================
     LOADING
  =================================================== */

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-red-600" />

          <p className="text-sm font-medium text-slate-500">
            Karşılaştırma raporu yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  /* ===================================================
     ERROR
  =================================================== */

  if (error || !detail) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error || "Rapor bulunamadı."}
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
    /* TAB */
    if (activeTab !== "ALL" && row.status !== activeTab) {
      return false;
    }

    /* ARAMA YOKSA */
    if (!normalizedSearch) {
      return true;
    }

    /* ARAMA */
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

  function toggleDetail(rowId: number) {
    setExpandedRowId((current) => (current === rowId ? null : rowId));
  }

  function changePage(page: number) {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);
    setExpandedRowId(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="mx-auto max-w-7xl pb-12">
      {/* GERİ */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Excel Karşılaştırma
      </button>

      {/* HEADER */}
      <header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">
            Karşılaştırma Raporu
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Excel Veri Değişiklikleri
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <FileSpreadsheet size={16} />
              {detail.fileName}
            </span>

            <span className="hidden text-slate-300 sm:inline">•</span>

            <span>{formatDateTime(detail.uploadedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={detail.status} />

          {detail.status === "WAITING_APPROVAL" && (
            <button
              type="button"
              onClick={() => router.push(`/excel-import/${detail.id}/approval`)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700"
            >
              Onay Ekranına Geç
            </button>
          )}
        </div>
      </header>

      {/* =================================================
          ÖZET
      ================================================= */}

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-5">
          <SummaryItem label="Toplam" value={detail.totalRowCount} />

          <SummaryItem label="Yeni" value={detail.newRowCount} type="new" />

          <SummaryItem
            label="Değişen"
            value={detail.changedRowCount}
            type="changed"
          />

          <SummaryItem label="Değişmeyen" value={detail.unchangedRowCount} />

          <SummaryItem
            label="Hatalı"
            value={detail.invalidRowCount}
            type={detail.invalidRowCount > 0 ? "error" : undefined}
          />
        </div>
      </section>

      {/* =================================================
          ARAMA + TAB
      ================================================= */}

      <section className="mt-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              İncelenecek Kayıtlar
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Firma adı, VKN, firma ID veya belge numarası ile arama
              yapabilirsiniz.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* ARAMA */}
            <div className="relative w-full sm:w-[340px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Firma, VKN veya belge no ara..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Aramayı temizle"
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* TABLAR */}
            <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-white p-1">
              <TabButton
                active={activeTab === "ALL"}
                onClick={() => setActiveTab("ALL")}
                label="Tümü"
                count={reviewRows.length}
              />

              <TabButton
                active={activeTab === "NEW"}
                onClick={() => setActiveTab("NEW")}
                label="Yeni"
                count={newRows.length}
              />

              <TabButton
                active={activeTab === "CHANGED"}
                onClick={() => setActiveTab("CHANGED")}
                label="Değişen"
                count={changedRows.length}
              />
            </div>
          </div>
        </div>

        {/* ARAMA SONUCU BİLGİSİ */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {searchTerm ? (
              <>
                <strong className="text-slate-700">
                  {filteredRows.length}
                </strong>{" "}
                kayıt bulundu
              </>
            ) : (
              <>
                Toplam{" "}
                <strong className="text-slate-700">
                  {filteredRows.length}
                </strong>{" "}
                kayıt
              </>
            )}
          </p>

          {filteredRows.length > 0 && (
            <p className="text-xs text-slate-400">
              {firstVisibleRecord}–{lastVisibleRecord} gösteriliyor
            </p>
          )}
        </div>
      </section>

      {/* =================================================
          KARTLAR
      ================================================= */}

      {paginatedRows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <Search size={24} className="mx-auto text-slate-300" />

          <p className="mt-3 text-sm font-semibold text-slate-800">
            Kayıt bulunamadı
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Arama kelimenizi veya seçili filtreyi değiştirebilirsiniz.
          </p>
        </div>
      ) : (
        <section className="mt-4 grid items-start gap-4 xl:grid-cols-2">
          {paginatedRows.map((row) => {
            const changes = getRowChanges(row.id);
            const isExpanded = expandedRowId === row.id;

            const isNew = row.status === "NEW";

            return (
              <article
                key={row.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                {/* KART HEADER */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            isNew
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isNew ? "YENİ" : "DEĞİŞTİ"}
                        </span>
                      </div>

                      <h3 className="mt-2 text-sm font-bold leading-5 text-slate-900">
                        {row.companyName ?? "Firma adı bulunamadı"}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        {row.documentNumber && (
                          <>
                            <span>
                              Belge No:{" "}
                              <strong className="font-semibold text-slate-700">
                                {row.documentNumber}
                              </strong>
                            </span>

                            <Separator />
                          </>
                        )}

                        <span>
                          Yetki Bitiş:{" "}
                          <strong className="font-semibold text-slate-700">
                            {formatDate(row.authorizationEndDate)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDetail(row.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      Detay
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* =========================================
                    YENİ KAYIT
                ========================================= */}

                {isNew && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <CardInfo
                        label="İşlem Durumu"
                        value={row.processStatus ?? "-"}
                      />

                      {row.documentNumber ? (
                        <CardInfo label="Belge No" value={row.documentNumber} />
                      ) : (
                        <CardInfo
                          label="Belge Durumu"
                          value="Belge bulunmuyor"
                        />
                      )}

                      {row.supportClass && (
                        <CardInfo
                          label="Destekleme Sınıfı"
                          value={row.supportClass}
                        />
                      )}

                      {row.extensionDate && (
                        <CardInfo
                          label="Süre Uzatım"
                          value={formatDate(row.extensionDate)}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* =========================================
                    DEĞİŞEN KAYIT
                ========================================= */}

                {!isNew && (
                  <div className="border-t border-slate-100">
                    {changes.length === 0 ? (
                      <div className="px-5 py-4 text-xs text-slate-500">
                        Değişiklik detayı bulunamadı.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {changes.map((change) => (
                          <div key={change.id} className="px-5 py-4">
                            <p className="text-xs font-bold text-slate-700">
                              {getChangeLabel(change)}
                            </p>

                            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_24px_1fr] sm:items-center">
                              {/* ESKİ */}
                              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  Eski
                                </p>

                                <p className="mt-1 break-words text-xs font-medium text-slate-600">
                                  {formatChangeValue(
                                    change.fieldName,
                                    change.oldValue,
                                  )}
                                </p>
                              </div>

                              {/* OK */}
                              <div className="hidden justify-center sm:flex">
                                <ArrowRight
                                  size={15}
                                  className="text-slate-300"
                                />
                              </div>

                              {/* YENİ */}
                              <div className="rounded-lg bg-emerald-50/70 px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/70">
                                  Yeni
                                </p>

                                <p className="mt-1 break-words text-xs font-bold text-slate-900">
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
                    )}
                  </div>
                )}

                {/* =========================================
                    DETAY
                ========================================= */}

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Kayıt Detayı
                    </p>

                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      <DetailItem
                        label="Firma ID"
                        value={row.externalCompanyId}
                      />

                      <DetailItem label="VKN" value={row.taxNumber} />

                      <DetailItem
                        label="Belge ID"
                        value={row.externalDocumentId}
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

                      <DetailItem
                        label="İşlem Durumu"
                        value={row.processStatus}
                      />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {/* =================================================
          PAGINATION
      ================================================= */}

      {filteredRows.length > PAGE_SIZE && (
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={changePage}
        />
      )}
    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
        <CheckCircle2 size={15} />
        Tamamlandı
      </span>
    );
  }

  if (status === "WAITING_APPROVAL") {
    return (
      <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/15">
        <Clock3 size={15} />
        Onay Bekliyor
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
      {status}
    </span>
  );
}

function SummaryItem({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type?: "new" | "changed" | "error";
}) {
  let valueClass = "text-slate-900";

  if (type === "new") {
    valueClass = "text-emerald-700";
  }

  if (type === "changed") {
    valueClass = "text-amber-700";
  }

  if (type === "error") {
    valueClass = "text-rose-700";
  }

  return (
    <div className="border-b border-r border-slate-100 px-5 py-4 last:border-r-0 sm:border-b-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>

      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>
        {value.toLocaleString("tr-TR")}
      </p>
    </div>
  );
}

function TabButton({
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
      className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {label}

      <span
        className={`rounded px-1.5 py-0.5 text-[10px] ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CardInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium text-slate-400">{label}</p>

      <p className="mt-1 break-words text-xs font-semibold text-slate-700">
        {value ?? "-"}
      </p>
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
    <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        Sayfa <strong className="text-slate-700">{currentPage}</strong> /{" "}
        {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
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
              <span className="px-1 text-xs text-slate-400">...</span>
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
              <span className="px-1 text-xs text-slate-400">...</span>
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
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sonraki
          <ChevronRight size={14} />
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
      className={`hidden h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold transition sm:inline-flex ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {page}
    </button>
  );
}
