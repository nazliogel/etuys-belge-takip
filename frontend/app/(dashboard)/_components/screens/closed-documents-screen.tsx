"use client";

import {
  Archive,
  Ban,
  CalendarX,
  Check,
  ChevronRight,
  FileText,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DocumentDetailScreen } from "@/app/(dashboard)/_components/screens/document-detail-screen";
import { apiFetch } from "@/lib/api";

type ClosureReason = "EXPIRED" | "CANCELLED" | "COMPLETED" | "OTHER";

type ApiClosedDocument = {
  id: number;
  documentNumber: string | null;
  companyId: number;
  companyName: string;
  taxNumber: string;
  documentStartDate: string | null;
  documentEndDate: string | null;
  closedDate: string | null;
  closureReason: ClosureReason | null;
  supportClass: string | null;
};

type ClosedDocumentListResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiClosedDocument[];
    totalCount: number;
  };
};

const PAGE_SIZE = 20;

type ReasonFilter = "all" | ClosureReason;

const reasonOptions: { key: ReasonFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "EXPIRED", label: "Süresi Dolmuş" },
  { key: "CANCELLED", label: "İptal Edilmiş" },
  { key: "COMPLETED", label: "Tamamlanmış" },
  { key: "OTHER", label: "Diğer" },
];

function formatDate(date: string | null): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR").format(parsed);
}

export function ClosedDocumentsScreen() {
  const [page, setPage] = useState(1);
  const [documents] = useState<ApiClosedDocument[]>([]);
  const totalCount = documents.length;
  const isLoading = false;
  const loadError = "";
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isFilterOpen]);

  useEffect(() => {
    if (activeDocumentId) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  }, [activeDocumentId]);

  const stats = useMemo(() => {
    return {
      toplam: totalCount,
      suresiDolmus: documents.filter((d) => d.closureReason === "EXPIRED")
        .length,
      iptalEdilmis: documents.filter((d) => d.closureReason === "CANCELLED")
        .length,
      tamamlanmis: documents.filter((d) => d.closureReason === "COMPLETED")
        .length,
    };
  }, [documents, totalCount]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const firstRecord = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRecord = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-5">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm">
            <Archive size={17} />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Kapalı Durumdaki Belgeler
            </h1>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Süresi dolmuş, iptal edilmiş veya tamamlanmış tüm teşvik
              belgelerini görüntüleyin.
            </p>
          </div>
        </div>
      </section>

      {/* OPERASYON ÖZETİ */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 md:grid-cols-4 md:divide-y-0">
          <ClosedStat
            label="Toplam Kapalı"
            value={String(stats.toplam)}
            icon={<Archive size={15} />}
          />

          <ClosedStat
            label="Süresi Dolmuş"
            value={String(stats.suresiDolmus)}
            icon={<CalendarX size={15} />}
            valueClass="text-amber-600"
          />

          <ClosedStat
            label="İptal Edilmiş"
            value={String(stats.iptalEdilmis)}
            icon={<Ban size={15} />}
            valueClass="text-red-600"
          />

          <ClosedStat
            label="Tamamlanmış"
            value={String(stats.tamamlanmis)}
            icon={<Check size={15} />}
            valueClass="text-emerald-600"
          />
        </div>
      </section>

      {/* BELGE LİSTESİ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Kapalı Belge Listesi
            </h2>

            <p className="text-xs font-medium text-slate-500">
              Belge numarası, firma adı ve kapanma bilgileri
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            {/* Arama */}
            <div className="relative w-full lg:w-72">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Belge no, firma veya vergi no ile ara..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  aria-label="Aramayı temizle"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtre */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setIsFilterOpen((current) => !current)}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition sm:w-auto ${
                  reasonFilter !== "all"
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter size={14} />
                Kapanma Nedeni
                {reasonFilter !== "all" && (
                  <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    1
                  </span>
                )}
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  <p className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Kapanma Nedeni
                  </p>

                  {reasonOptions.map((option) => {
                    const isActive = reasonFilter === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setReasonFilter(option.key);
                          setPage(1);
                          setIsFilterOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition ${
                          isActive
                            ? "bg-red-50 text-red-700"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                        {isActive && <Check size={15} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Belge No</th>
                <th className="px-6 py-3.5">Firma</th>
                <th className="px-6 py-3.5">Belge Bitiş</th>
                <th className="px-6 py-3.5">Kapanma Tarihi</th>
                <th className="px-6 py-3.5">Kapanma Nedeni</th>
                <th className="px-6 py-3.5">Destek Sınıfı</th>
                <th className="px-6 py-3.5 text-right">Detay</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Belgeler yükleniyor...
                    </p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-red-700">
                      Belgeler yüklenemedi
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Kapalı belge bulunamadı.
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isSelected = activeDocumentId === String(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      className={`transition-colors ${
                        isSelected ? "bg-red-50/40" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              isSelected
                                ? "border-red-600 bg-red-600 text-white"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            <FileText size={16} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {doc.documentNumber ?? "-"}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              ID: #{doc.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {doc.companyName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {doc.taxNumber}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.documentEndDate)}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.closedDate)}
                      </td>

                      <td className="px-6 py-4">
                        <ClosureBadge reason={doc.closureReason} />
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {doc.supportClass ?? "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDocumentId(
                                isSelected ? null : String(doc.id),
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} />
                                Görüntüleniyor
                              </>
                            ) : (
                              <>
                                Görüntüle
                                <ChevronRight size={14} />
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* SAYFALAMA */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">
            <span className="font-bold text-slate-700">
              {firstRecord}-{lastRecord}
            </span>{" "}
            arası, toplam{" "}
            <span className="font-bold text-slate-700">{totalCount}</span> kayıt
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-red-600/20"
            >
              {page} / {totalPages}
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      </section>

      {/* SEÇİLİ BELGE DETAYI */}
      {activeDocumentId && (
        <section
          ref={detailRef}
          className="scroll-mt-6 space-y-4 border-t border-dashed border-slate-200 pt-8"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Seçili Belge Detayı
            </p>
            <button
              type="button"
              onClick={() => setActiveDocumentId(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={14} />
              Kapat
            </button>
          </div>

          <DocumentDetailScreen
            documentId={activeDocumentId}
            inline
            variant="admin"
          />
        </section>
      )}
    </div>
  );
}

/* =====================================================
   ALT BİLEŞENLER
===================================================== */

function ClosedStat({
  label,
  value,
  icon,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className={`mt-0.5 truncate text-lg font-extrabold ${valueClass}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ClosureBadge({ reason }: { reason: ClosureReason | null }) {
  const config: Record<
    ClosureReason,
    {
      label: string;
      dot: string;
      text: string;
      bg: string;
      border: string;
    }
  > = {
    EXPIRED: {
      label: "Süresi Dolmuş",
      dot: "bg-amber-500",
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200/60",
    },
    CANCELLED: {
      label: "İptal Edilmiş",
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200/60",
    },
    COMPLETED: {
      label: "Tamamlanmış",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200/60",
    },
    OTHER: {
      label: "Diğer",
      dot: "bg-slate-400",
      text: "text-slate-600",
      bg: "bg-slate-100",
      border: "border-slate-200",
    },
  };

  const key = reason ?? "OTHER";
  const c = config[key];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
