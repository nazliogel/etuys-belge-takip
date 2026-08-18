"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

/* =====================================================
   TYPES
===================================================== */

type ChangeStatus = "PENDING" | "APPROVED" | "REJECTED";

type ImportChange = {
  id: number;
  importRowId: number | null;
  entityType: "COMPANY" | "COMPANY_AUTHORIZATION" | "INCENTIVE_DOCUMENT";
  changeType: "CREATED" | "UPDATED" | "DEACTIVATED" | "REACTIVATED";
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  status: ChangeStatus;
  rejectedReason?: string | null;
};

type ImportRow = {
  id: number;
  rowNumber: number;
  status: string;
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
  newRowCount: number;
  changedRowCount: number;
  unchangedRowCount: number;
  invalidRowCount: number;
  rows: ImportRow[];
  changes: ImportChange[];
};

type ImportDetailResponse = {
  success: boolean;
  message: string;
  data: ImportDetail;
};

type ReviewResponse = {
  success: boolean;
  message: string;
  data: {
    change: ImportChange;
    summary: {
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
    };
    batchStatus: string;
  };
};

type FilterType = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const PAGE_SIZE = 21;

/* =====================================================
   LABELS
===================================================== */

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

function formatValue(fieldName: string, value: string | null) {
  if (!value) return "—";
  if (
    [
      "authorizationEndDate",
      "documentStartDate",
      "documentEndDate",
      "extensionDate",
    ].includes(fieldName)
  ) {
    return formatDate(value);
  }
  return value;
}

function getFieldLabel(change: ImportChange) {
  if (change.fieldName === "__entity__") {
    if (change.entityType === "COMPANY") return "Yeni Firma";
    if (change.entityType === "COMPANY_AUTHORIZATION")
      return "Yeni Yetki Bilgisi";
    if (change.entityType === "INCENTIVE_DOCUMENT")
      return "Yeni Teşvik Belgesi";
  }
  if (
    change.fieldName === "__missing_in_snapshot__" ||
    change.fieldName === "__presence__"
  ) {
    return "Yeni Listede Yok";
  }
  return fieldLabels[change.fieldName] ?? change.fieldName;
}

/* =====================================================
   PAGE
===================================================== */

export default function ImportApprovalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("PENDING");
  const [currentPage, setCurrentPage] = useState(1);
  const [processingChangeId, setProcessingChangeId] = useState<number | null>(
    null,
  );
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [approveAllProgress, setApproveAllProgress] = useState({
    done: 0,
    total: 0,
  });
  const [actionError, setActionError] = useState("");

  async function loadDetail() {
    const response = await apiFetch<ImportDetailResponse>(
      `/imports/${params.id}`,
    );
    setDetail(response.data);
  }

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setError("");
        await loadDetail();
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Onay verileri alınamadı.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [params.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [filter, searchTerm]);

  async function reviewChange(
    changeId: number,
    status: "APPROVED" | "REJECTED",
  ) {
    if (processingChangeId !== null || isApprovingAll) return;
    const rejectedReason: string | null = null;

    try {
      setProcessingChangeId(changeId);
      setActionError("");
      await apiFetch<ReviewResponse>(
        `/imports/${params.id}/changes/${changeId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, rejectedReason }),
        },
      );
      await loadDetail();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Karar kaydedilemedi.",
      );
    } finally {
      setProcessingChangeId(null);
    }
  }

  async function handleApproveAll() {
    if (!detail || isApprovingAll) return;

    const pendingChanges = detail.changes.filter(
      (change) => change.status === "PENDING",
    );
    if (pendingChanges.length === 0) return;

    const entityPriority: Record<string, number> = {
      COMPANY: 1,
      COMPANY_AUTHORIZATION: 2,
      INCENTIVE_DOCUMENT: 3,
    };

    const orderedChanges = [...pendingChanges].sort((a, b) => {
      const aCreated =
        a.changeType === "CREATED" || a.fieldName === "__entity__";
      const bCreated =
        b.changeType === "CREATED" || b.fieldName === "__entity__";
      if (aCreated && !bCreated) return -1;
      if (!aCreated && bCreated) return 1;
      return (
        (entityPriority[a.entityType] ?? 99) -
        (entityPriority[b.entityType] ?? 99)
      );
    });

    try {
      setIsApprovingAll(true);
      setActionError("");
      setApproveAllProgress({ done: 0, total: orderedChanges.length });

      for (let index = 0; index < orderedChanges.length; index += 1) {
        const change = orderedChanges[index];
        await apiFetch(`/imports/${params.id}/changes/${change.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "APPROVED" }),
        });
        setApproveAllProgress({
          done: index + 1,
          total: orderedChanges.length,
        });
      }
      await loadDetail();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? `Toplu onay durduruldu: ${error.message}`
          : "Toplu onay sırasında bir hata oluştu.",
      );
      await loadDetail();
    } finally {
      setIsApprovingAll(false);
    }
  }

  /* ===================================================
     LOADING / ERROR
  =================================================== */

  if (isLoading) {
    return (
      <div className="bg-slate-50">
        <div className="mx-auto max-w-[1400px] px-3 pt-3 pb-3 sm:px-4">
          <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={22} className="animate-spin text-red-600" />
              <p className="text-xs font-medium text-slate-500">
                Onay ekranı hazırlanıyor...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="bg-slate-50">
        <div className="mx-auto max-w-[1400px] px-3 pt-3 pb-3 sm:px-4">
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Onay ekranı yüklenemedi
              </p>
              <p className="mt-0.5 text-xs text-rose-700">
                {error || "Import bulunamadı."}
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

  const pendingCount = detail.changes.filter(
    (c) => c.status === "PENDING",
  ).length;
  const approvedCount = detail.changes.filter(
    (c) => c.status === "APPROVED",
  ).length;
  const rejectedCount = detail.changes.filter(
    (c) => c.status === "REJECTED",
  ).length;
  const totalCount = detail.changes.length;

  const rowMap = new Map(detail.rows.map((row) => [row.id, row]));
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");

  const filteredChanges = detail.changes.filter((change) => {
    if (filter !== "ALL" && change.status !== filter) return false;
    if (!normalizedSearch) return true;
    const row = change.importRowId ? rowMap.get(change.importRowId) : undefined;
    const values = [
      row?.companyName,
      row?.taxNumber,
      row?.externalCompanyId?.toString(),
      row?.documentNumber,
      row?.externalDocumentId?.toString(),
      getFieldLabel(change),
    ];
    return values.some((value) =>
      value?.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
    );
  });

  const groupedRows = (() => {
    const groups = new Map<
      string,
      {
        key: string;
        row: ImportRow | null;
        changes: ImportChange[];
      }
    >();

    for (const change of filteredChanges) {
      const row = change.importRowId
        ? (rowMap.get(change.importRowId) ?? null)
        : null;
      const key = row ? `row-${row.id}` : `change-${change.id}`;
      const existing = groups.get(key);
      if (existing) {
        existing.changes.push(change);
      } else {
        groups.set(key, { key, row, changes: [change] });
      }
    }
    return Array.from(groups.values());
  })();

  const totalPages = Math.max(1, Math.ceil(groupedRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedGroups = groupedRows.slice(startIndex, startIndex + PAGE_SIZE);

  const isCompleted = detail.status === "COMPLETED";

  /* ===================================================
     RENDER
  =================================================== */

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
                  className="rounded-md px-1 py-0.5 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  Excel Karşılaştırma
                </button>
                <ChevronRight size={11} className="text-slate-300" />
                <button
                  type="button"
                  onClick={() => router.push(`/excel-import/${params.id}`)}
                  className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <ArrowLeft size={11} />
                  Rapor #{detail.id}
                </button>
                <ChevronRight size={11} className="text-slate-300" />
                <span className="font-semibold text-slate-700">
                  Değişiklik Onayı
                </span>
              </nav>

              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Değişiklik Onayı
                </h1>
                <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 ring-1 ring-red-200">
                  Admin Onayı
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <FileSpreadsheet size={12} />
                  <span className="truncate font-medium text-slate-700">
                    {detail.fileName}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  İnceleme Tamamlandı
                </span>
              )}

              {detail.status === "WAITING_APPROVAL" && pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleApproveAll()}
                  disabled={isApprovingAll || processingChangeId !== null}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApprovingAll ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      {approveAllProgress.done} / {approveAllProgress.total}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      Tümünü Onayla ({pendingCount})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* KPI kartları + progress */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Bekleyen"
            value={pendingCount}
            tone={pendingCount > 0 ? "amber" : undefined}
            pulse={pendingCount > 0 && !isCompleted}
          />
          <KpiCard label="Onaylanan" value={approvedCount} tone="emerald" />
          <KpiCard
            label="Reddedilen"
            value={rejectedCount}
            tone={rejectedCount > 0 ? "rose" : undefined}
          />
          <KpiCard label="Toplam" value={totalCount} muted />
        </div>

        {/* Bilgilendirme */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5">
          <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-[11px] leading-4 text-amber-800">
            <strong className="font-semibold">Onayla</strong> dediğiniz
            değişiklik canlı veritabanına hemen uygulanır.{" "}
            <strong className="font-semibold">Reddet</strong> dediğiniz
            değişiklik canlı veritabanını etkilemez.
          </p>
        </div>

        {/* ACTION ERROR */}
        {actionError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-600" />
            <p>{actionError}</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Değişiklikler
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Her satırın hemen sağındaki butonlarla karar verin.
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
                placeholder="Firma, VKN, belge no veya alan ara..."
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

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              active={filter === "PENDING"}
              onClick={() => setFilter("PENDING")}
              label="Bekleyen"
              count={pendingCount}
              tone={pendingCount > 0 ? "amber" : undefined}
            />
            <FilterChip
              active={filter === "APPROVED"}
              onClick={() => setFilter("APPROVED")}
              label="Onaylanan"
              count={approvedCount}
            />
            <FilterChip
              active={filter === "REJECTED"}
              onClick={() => setFilter("REJECTED")}
              label="Reddedilen"
              count={rejectedCount}
            />
            <FilterChip
              active={filter === "ALL"}
              onClick={() => setFilter("ALL")}
              label="Tümü"
              count={totalCount}
            />

            <div className="ml-auto text-[11px] tabular-nums text-slate-500">
              {groupedRows.length > 0 && (
                <>
                  <span className="font-semibold">
                    {startIndex + 1}–
                    {Math.min(startIndex + PAGE_SIZE, groupedRows.length)}
                  </span>
                  {" / "}
                  {groupedRows.length} firma
                </>
              )}
            </div>
          </div>
        </div>

       
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paginatedGroups.length === 0 ? (
           <div className="col-span-full flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Search size={22} />
              </div>
              <div>
                <p>
                  Gösterilecek değişiklik yok
                </p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">
                  Aramayı veya filtreyi değiştirmeyi deneyin.
                </p>
              </div>
            </div>
          ) : (
            paginatedGroups.map((group) => {
              const row = group.row;
              return (
                <article
                  key={group.key}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Firma başlığı */}
                  <div className="relative border-b border-slate-100 bg-slate-50/40 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet
                            size={14}
                            className="shrink-0 text-slate-400"
                          />
                          <h3 className="truncate text-sm font-bold text-slate-900">
                            {row?.companyName ?? "Firma bilgisi bulunamadı"}
                          </h3>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          {row?.externalCompanyId && (
                            <span>
                              ID:{" "}
                              <span className="font-mono font-semibold text-slate-700">
                                {row.externalCompanyId}
                              </span>
                            </span>
                          )}
                          {row?.taxNumber && (
                            <span>
                              VKN:{" "}
                              <span className="font-mono font-semibold text-slate-700">
                                {row.taxNumber}
                              </span>
                            </span>
                          )}
                          {row?.documentNumber && (
                            <span>
                              Belge:{" "}
                              <span className="font-semibold text-slate-700">
                                {row.documentNumber}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                        {group.changes.length} değişiklik
                      </span>
                    </div>
                  </div>

                  {/* Değişiklikler */}
                  <div className="divide-y divide-slate-100">
                    {group.changes.map((change) => {
                      const processing = processingChangeId === change.id;
                      return (
                        <div
                          key={change.id}
                          className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-start xl:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                              <span className="h-1 w-1 rounded-full bg-amber-500" />
                              {getFieldLabel(change)}
                            </p>

                            <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
                              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                                  Eski
                                </p>
                                <p className="mt-0.5 break-words text-xs font-medium text-slate-600 line-through decoration-slate-300">
                                  {formatValue(
                                    change.fieldName,
                                    change.oldValue,
                                  )}
                                </p>
                              </div>

                              <div className="hidden justify-center md:flex">
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
                                  {formatValue(
                                    change.fieldName,
                                    change.newValue,
                                  )}
                                </p>
                              </div>
                            </div>

                            {change.status === "REJECTED" &&
                              change.rejectedReason && (
                                <p className="mt-2 flex items-start gap-1.5 rounded-md bg-rose-50/70 px-2 py-1 text-[11px] text-rose-700">
                                  <Info
                                    size={11}
                                    className="mt-0.5 shrink-0 text-rose-500"
                                  />
                                  <span>
                                    <strong className="font-semibold">
                                      Red nedeni:
                                    </strong>{" "}
                                    {change.rejectedReason}
                                  </span>
                                </p>
                              )}
                          </div>

                          {/* Karar */}
                          <div className="flex shrink-0 items-center gap-1.5">
                            {change.status === "PENDING" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={processing || isApprovingAll}
                                  onClick={() =>
                                    void reviewChange(change.id, "REJECTED")
                                  }
                                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {processing ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <XCircle size={13} />
                                  )}
                                  Reddet
                                </button>
                                <button
                                  type="button"
                                  disabled={processing || isApprovingAll}
                                  onClick={() =>
                                    void reviewChange(change.id, "APPROVED")
                                  }
                                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {processing ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Check size={13} />
                                  )}
                                  Onayla
                                </button>
                              </>
                            ) : change.status === "APPROVED" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 size={13} />
                                Onaylandı
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                                <XCircle size={13} />
                                Reddedildi
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:flex-row">
              <p className="text-[11px] text-slate-500">
                Sayfa{" "}
                <strong className="font-semibold tabular-nums text-slate-700">
                  {safePage}
                </strong>{" "}
                / <span className="tabular-nums">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={12} />
                  Önceki
                </button>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, safePage + 1))
                  }
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sonraki
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
}

/* =====================================================
   COMPONENTS
===================================================== */

function KpiCard({
  label,
  value,
  tone,
  muted,
  pulse,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "amber" | "rose";
  muted?: boolean;
  pulse?: boolean;
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
          <span className="relative flex h-1.5 w-1.5">
            {pulse && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  tone === "amber"
                    ? "bg-amber-400"
                    : tone === "rose"
                      ? "bg-rose-400"
                      : "bg-emerald-400"
                }`}
              />
            )}
            <span
              className={`relative h-1.5 w-1.5 rounded-full ${dotMap[tone]}`}
            />
          </span>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueClass}`}>
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
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "amber";
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
      {tone === "amber" && !active && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      )}
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
