/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  FileText,
  Filter,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { DocumentDetailScreen } from "@/app/(dashboard)/_components/screens/document-detail-screen";
import { apiFetch } from "@/lib/api";

type ApiClosedDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  extensionDate: string | null;
  supportClass: string | null;
  status: "CLOSED" | "CANCELLED";
  isActive?: boolean;
  company: {
    id: number;
    externalCompanyId: number;
    name: string;
    taxNumber: string;
    consultant: string | null;
  };
};

type ClosedDocumentListResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiClosedDocument[];
    totalCount: number;
    page: number;
    limit: number;
  };
};
type AuthMeResponse = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: "ADMIN" | "COMPANY";
    companyId: number | null;
    isActive: boolean;
  };
};

type CompanyDetailResponse = {
  success: boolean;
  message: string;
  data: {
    authorizationEndDate: string | null;
  };
};

/* =====================================================
   SIRALAMA (SORTING) YARDIMCI TİPLERİ
===================================================== */

type SortDirection = "asc" | "desc";

type DocumentSortKey =
  | "documentNumber"
  | "companyName"
  | "consultant"
  | "documentStartDate"
  | "documentEndDate"
  | "extensionDate"
  | "supportClass"
  | "status";

const DATE_SORT_KEYS: ReadonlySet<DocumentSortKey> = new Set([
  "documentStartDate",
  "documentEndDate",
  "extensionDate",
]);

type SortConfig<K extends string> = {
  key: K;
  direction: SortDirection;
} | null;

function toggleSort<K extends string>(
  current: SortConfig<K>,
  key: K,
): SortConfig<K> {
  if (current?.key === key) {
    return current.direction === "asc" ? { key, direction: "desc" } : null;
  }
  return { key, direction: "asc" };
}

function compareValues(valueA: unknown, valueB: unknown): number {
  if (typeof valueA === "number" && typeof valueB === "number") {
    return valueA - valueB;
  }
  return String(valueA ?? "").localeCompare(String(valueB ?? ""), "tr-TR");
}

function SortIcon({ direction }: { direction?: SortDirection }) {
  if (direction === "asc") return <ChevronUp size={12} />;
  if (direction === "desc") return <ChevronDown size={12} />;
  return <ChevronsUpDown size={12} className="opacity-40" />;
}

const STATUS_LABELS: Record<string, string> = {
  CLOSED: "Kapalı",
  CANCELLED: "İptal",
};

function getDocumentSortValue(
  doc: ApiClosedDocument,
  key: DocumentSortKey,
): string | number {
  if (DATE_SORT_KEYS.has(key)) {
    const rawDate =
      key === "documentStartDate"
        ? doc.documentStartDate
        : key === "documentEndDate"
          ? doc.documentEndDate
          : doc.extensionDate;

    if (!rawDate) return Infinity;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(rawDate);
    target.setHours(0, 0, 0, 0);

    if (Number.isNaN(target.getTime())) return Infinity;

    return Math.abs(target.getTime() - today.getTime());
  }

  switch (key) {
    case "documentNumber":
      return doc.documentNumber ?? "";
    case "companyName":
      return doc.company?.name ?? "";
    case "consultant":
      return doc.company?.consultant ?? "";
    case "supportClass":
      return doc.supportClass ?? "";
    case "status":
      return STATUS_LABELS[doc.status] ?? doc.status;
    default:
      return "";
  }
}

/* =====================================================
   SÜTUN FİLTRE (checkbox) DROPDOWN'I
===================================================== */
function ColumnFilterDropdown({
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

function StatusBadge({ status }: { status: "CLOSED" | "CANCELLED" }) {
  const config =
    status === "CLOSED"
      ? {
          label: "Kapalı",
          dot: "bg-blue-500",
          text: "text-blue-700 dark:text-blue-300",
          bg: "bg-blue-50 dark:bg-blue-500/10",
          border: "border-blue-200 dark:border-blue-500/30",
        }
      : {
          label: "İptal",
          dot: "bg-red-500",
          text: "text-red-700 dark:text-red-300",
          bg: "bg-red-50 dark:bg-red-500/10",
          border: "border-red-200/60 dark:border-red-500/30",
        };

  return (
    <span
      className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR").format(parsed);
}
function hasValidAuthorization(authorizationEndDate: string | null): boolean {
  if (!authorizationEndDate) {
    return false;
  }

  const endDate = new Date(authorizationEndDate);
  const today = new Date();

  if (Number.isNaN(endDate.getTime())) {
    return false;
  }

  endDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return endDate.getTime() >= today.getTime();
}

// /closed-documents ucu sayfa sayfa gezilerek arama kriterine uyan TÜM
// kayıtlar tek dizide toplanır. Böylece filtre / sıralama, o an ekranda
// olan 20 kayıt değil eşleşen TÜM kayıtlar üzerinde çalışır.
async function fetchAllClosedDocuments(
  extraParams?: URLSearchParams,
): Promise<ApiClosedDocument[]> {
  const limit = 100;

  const firstParams = new URLSearchParams(extraParams);
  firstParams.set("page", "1");
  firstParams.set("limit", String(limit));

  const firstResponse = await apiFetch<ClosedDocumentListResponse>(
    `/closed-documents?${firstParams.toString()}`,
  );

  const totalPages = Math.ceil(firstResponse.data.totalCount / limit);

  if (totalPages <= 1) {
    return firstResponse.data.items;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => {
      const pageParams = new URLSearchParams(extraParams);
      pageParams.set("page", String(index + 2));
      pageParams.set("limit", String(limit));
      return apiFetch<ClosedDocumentListResponse>(
        `/closed-documents?${pageParams.toString()}`,
      );
    }),
  );

  return [
    ...firstResponse.data.items,
    ...remainingResponses.flatMap((response) => response.data.items),
  ];
}

const PAGE_SIZE = 20;

export function ClosedDocumentsScreen() {
  const [documents, setDocuments] = useState<ApiClosedDocument[]>([]);
  const [, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCompanyUser, setIsCompanyUser] = useState(false);
  const [authorizationEndDate, setAuthorizationEndDate] = useState<
    string | null
  >(null);
  const [isAuthorizationLoading, setIsAuthorizationLoading] = useState(true);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // --- SIRALAMA / SÜTUN FİLTRE STATE'LERİ ---
  const [documentSortConfig, setDocumentSortConfig] =
    useState<SortConfig<DocumentSortKey>>(null);
  const [consultantFilter, setConsultantFilter] = useState<Set<string>>(
    new Set(),
  );
  const [supportClassFilter, setSupportClassFilter] = useState<Set<string>>(
    new Set(),
  );
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [openFilterColumn, setOpenFilterColumn] = useState<
    "consultant" | "supportClass" | "status" | null
  >(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(
    null,
  );

  useEffect(() => {
    if (!openFilterColumn) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (
        target.closest("[data-column-filter]") ||
        target.closest("[data-column-filter-button]")
      ) {
        return;
      }

      setOpenFilterColumn(null);
      setFilterAnchorRect(null);
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openFilterColumn]);

  function handleDocumentSort(key: DocumentSortKey) {
    setDocumentSortConfig((current) => toggleSort(current, key));
  }

  function toggleFilterValue(
    setFilter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string,
  ) {
    setFilter((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  useEffect(() => {
    async function loadAuthorization() {
      setIsAuthorizationLoading(true);

      try {
        const authResponse = await apiFetch<AuthMeResponse>("/auth/me");
        const user = authResponse.user;
        const isCompany = user.role === "COMPANY";

        setIsCompanyUser(isCompany);

        if (!isCompany || !user.companyId) {
          setAuthorizationEndDate(null);
          return;
        }

        const companyResponse = await apiFetch<CompanyDetailResponse>(
          `/companies/${user.companyId}`,
        );
        setAuthorizationEndDate(
          companyResponse.data.authorizationEndDate ?? null,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "";

        if (message.includes("yetki süresi dolmuştur")) {
          setIsCompanyUser(true);
          setAuthorizationEndDate(null);
          return;
        }

        console.error("Yetkilendirme bilgisi alınamadı:", error);
        setIsCompanyUser(false);
        setAuthorizationEndDate(null);
      } finally {
        setIsAuthorizationLoading(false);
      }
    }

    void loadAuthorization();
  }, []);

  /* KAPALI BELGELERİ API'DEN GETİR (TÜM sayfalar) */
  useEffect(() => {
    async function loadClosedDocuments() {
      setIsLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams();

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }

        const allDocuments = await fetchAllClosedDocuments(params);

        setDocuments(allDocuments);
        setTotalCount(allDocuments.length);
      } catch (error) {
        setDocuments([]);
        setTotalCount(0);

        const message =
          error instanceof Error
            ? error.message
            : "Kapalı belgeler yüklenemedi.";

        if (message.includes("yetki süresi dolmuştur")) {
          setLoadError("");
          return;
        }

        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadClosedDocuments();
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setConsultantFilter(new Set());
    setSupportClassFilter(new Set());
    setStatusFilter(new Set());
    setOpenFilterColumn(null);
    setFilterAnchorRect(null);
    setDocumentSortConfig(null);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    if (activeDocumentId) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, [activeDocumentId]);

  const authorizationIsValid = hasValidAuthorization(authorizationEndDate);

  // Sütun başlığındaki filtre kutucuklarının seçenek listeleri, filtre
  // uygulanmadan ÖNCEKİ veriden türetilir — böylece bir filtre
  // uygulandığında diğer sütunların seçenekleri daralmaz/kaybolmaz.
  const consultantOptions = useMemo(() => {
    const values = new Set<string>();
    documents.forEach((doc) => {
      values.add(doc.company?.consultant ?? "-");
    });
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "tr-TR"))
      .map((value) => ({ value, label: value }));
  }, [documents]);

  const supportClassOptions = useMemo(() => {
    const values = new Set<string>();
    documents.forEach((doc) => {
      values.add(doc.supportClass ?? "-");
    });
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "tr-TR"))
      .map((value) => ({ value, label: value }));
  }, [documents]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    documents.forEach((doc) => {
      values.add(STATUS_LABELS[doc.status] ?? doc.status);
    });
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "tr-TR"))
      .map((value) => ({ value, label: value }));
  }, [documents]);

  const visibleDocumentsFiltered = documents.filter((doc) => {
    if (
      consultantFilter.size > 0 &&
      !consultantFilter.has(doc.company?.consultant ?? "-")
    ) {
      return false;
    }

    if (
      supportClassFilter.size > 0 &&
      !supportClassFilter.has(doc.supportClass ?? "-")
    ) {
      return false;
    }

    if (
      statusFilter.size > 0 &&
      !statusFilter.has(STATUS_LABELS[doc.status] ?? doc.status)
    ) {
      return false;
    }

    return true;
  });

  const visibleDocuments = useMemo(() => {
    if (!documentSortConfig) return visibleDocumentsFiltered;

    return [...visibleDocumentsFiltered].sort((a, b) => {
      const comparison = compareValues(
        getDocumentSortValue(a, documentSortConfig.key),
        getDocumentSortValue(b, documentSortConfig.key),
      );
      return documentSortConfig.direction === "asc" ? comparison : -comparison;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDocumentsFiltered, documentSortConfig]);

  const paginatedVisibleDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return visibleDocuments.slice(startIndex, endIndex);
  }, [visibleDocuments, currentPage]);

  const displayedTotalPages = Math.max(
    1,
    Math.ceil(visibleDocuments.length / PAGE_SIZE),
  );

  const documentHeadings: {
    label: string;
    key?: DocumentSortKey;
    filterType?: "consultant" | "supportClass" | "status";
  }[] = [
    { label: "Belge No", key: "documentNumber" },
    { label: "Firma", key: "companyName" },
    { label: "Uzman", key: "consultant", filterType: "consultant" },
    { label: "Belge Başlangıç", key: "documentStartDate" },
    { label: "Belge Bitiş", key: "documentEndDate" },
    { label: "Süre Uzatım", key: "extensionDate" },
    {
      label: "Destekleme Sınıfı",
      key: "supportClass",
      filterType: "supportClass",
    },
    { label: "Durum", key: "status", filterType: "status" },
    { label: "Detay" },
  ];

  const activeFilterCountByColumn: Record<string, number> = {
    consultant: consultantFilter.size,
    supportClass: supportClassFilter.size,
    status: statusFilter.size,
  };

  // Ortak boş / yükleme / hata durum bayrakları — hem mobil kart hem masaüstü
  // tablo tarafından kullanılır.
  const showLoader = isLoading || isAuthorizationLoading;
  const showError = !showLoader && Boolean(loadError);
  const showEmpty =
    !showLoader && !loadError && paginatedVisibleDocuments.length === 0;
  const showAuthWarning = showEmpty && isCompanyUser && !authorizationIsValid;

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200/60 bg-red-50 text-red-600 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <Archive size={17} />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
              Kapalı Durumdaki Belgeler
            </h1>

            <p className="mt-0.5 text-[11px] font-medium leading-5 text-muted-foreground sm:text-xs">
              Süresi dolmuş, iptal edilmiş veya tamamlanmış tüm teşvik
              belgelerini görüntüleyin.
            </p>
          </div>
        </div>
      </section>

      {/* BELGE LİSTESİ */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:rounded-2xl">
        {/* Başlık + arama */}
        <div className="flex flex-col gap-3 border-b border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">
              Kapalı Belge Listesi
            </h2>

            <p className="text-xs font-medium text-muted-foreground">
              Belge numarası, tarih ve durum bilgileri
            </p>
          </div>

          <div className="relative w-full sm:w-64 sm:shrink-0">
            <Search
              size={17}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Belge numarası ile ara..."
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-9 text-base text-foreground transition-all placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 sm:py-1.5 sm:pl-8 sm:pr-2.5 sm:text-xs"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Aramayı temizle"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* MOBİL: KART GÖRÜNÜMÜ (md altında) */}
        <div className="md:hidden">
          {showLoader ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Belgeler yükleniyor...
              </p>
            </div>
          ) : showError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Belgeler yüklenemedi
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
            </div>
          ) : showEmpty ? (
            <div className="px-3 py-6 text-center">
              {showAuthWarning ? (
                <AuthorizationWarning />
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  {documents.length > 0
                    ? "Seçilen kritere uygun belge bulunamadı."
                    : "Belge bulunamadı."}
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {paginatedVisibleDocuments.map((doc) => {
                const isSelected = activeDocumentId === String(doc.id);

                return (
                  <li
                    key={doc.id}
                    className={
                      isSelected ? "bg-red-500/5 dark:bg-red-500/10" : ""
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDocumentId(isSelected ? null : String(doc.id))
                      }
                      className="w-full px-3 py-3 text-left transition active:bg-muted"
                    >
                      {/* Üst satır: belge no + durum */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              isSelected
                                ? "border-red-600 bg-red-600 text-white"
                                : "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            <FileText size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {doc.documentNumber ?? "-"}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              ID: {doc.externalDocumentId}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>

                      {/* Firma + uzman */}
                      <div className="mt-2 rounded-lg bg-muted/60 px-2 py-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Firma
                        </p>
                        <p className="truncate text-xs font-semibold text-foreground">
                          {doc.company?.name ?? "Firma bilgisi bulunamadı"}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          VKN: {doc.company?.taxNumber ?? "-"}
                          {doc.company?.consultant && (
                            <>
                              {" • "}
                              Uzman:{" "}
                              <span className="font-semibold text-foreground/80">
                                {doc.company.consultant}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Tarihler + destek */}
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Başlangıç
                          </p>
                          <p className="font-medium text-foreground/80">
                            {formatDate(doc.documentStartDate)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Bitiş
                          </p>
                          <p className="font-medium text-foreground/80">
                            {formatDate(doc.documentEndDate)}
                          </p>
                        </div>
                        {doc.extensionDate && (
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Süre Uzatım
                            </p>
                            <p className="font-medium text-foreground/80">
                              {formatDate(doc.extensionDate)}
                            </p>
                          </div>
                        )}
                        {doc.supportClass && (
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Destek Sınıfı
                            </p>
                            <p className="truncate font-medium text-foreground/80">
                              {doc.supportClass}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Aç butonu */}
                      <div className="mt-2.5 flex justify-end">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                            isSelected
                              ? "bg-red-600 text-white"
                              : "bg-muted text-foreground/80"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check size={12} />
                              Görüntüleniyor
                            </>
                          ) : (
                            <>
                              Görüntüle
                              <ChevronRight size={12} />
                            </>
                          )}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* TABLET+ : TABLO GÖRÜNÜMÜ (sıralama + filtreleme dahil) */}
        <div className="hidden md:block">
          <div className="max-h-[480px] w-full overflow-auto overscroll-contain">
            <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
              </colgroup>

              <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                <tr>
                  {documentHeadings.map((heading) => {
                    const activeFilterCount = heading.filterType
                      ? activeFilterCountByColumn[heading.filterType]
                      : 0;

                    return (
                      <th
                        key={heading.label}
                        className="relative px-3 py-1.5 text-center"
                      >
                        <span className="inline-flex items-center gap-1">
                          {heading.key ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleDocumentSort(
                                  heading.key as DocumentSortKey,
                                )
                              }
                              className="inline-flex items-center gap-1 uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {heading.label}
                              <SortIcon
                                direction={
                                  documentSortConfig?.key === heading.key
                                    ? documentSortConfig.direction
                                    : undefined
                                }
                              />
                            </button>
                          ) : (
                            heading.label
                          )}

                          {heading.filterType && (
                            <button
                              type="button"
                              data-column-filter-button
                              onClick={(event) => {
                                const rect =
                                  event.currentTarget.getBoundingClientRect();

                                setOpenFilterColumn((current) => {
                                  if (current === heading.filterType) {
                                    setFilterAnchorRect(null);
                                    return null;
                                  }

                                  setFilterAnchorRect(rect);
                                  return heading.filterType ?? null;
                                });
                              }}
                              className={`relative rounded p-0.5 transition-colors ${
                                activeFilterCount > 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              title="Filtrele"
                            >
                              <Filter size={12} />
                              {activeFilterCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white">
                                  {activeFilterCount}
                                </span>
                              )}
                            </button>
                          )}
                        </span>

                        {heading.filterType === "consultant" &&
                          openFilterColumn === "consultant" && (
                            <ColumnFilterDropdown
                              title="Uzman"
                              options={consultantOptions}
                              selected={consultantFilter}
                              onToggle={(value) =>
                                toggleFilterValue(setConsultantFilter, value)
                              }
                              onClear={() => setConsultantFilter(new Set())}
                              onClose={() => {
                                setOpenFilterColumn(null);
                                setFilterAnchorRect(null);
                              }}
                              anchorRect={filterAnchorRect}
                            />
                          )}

                        {heading.filterType === "supportClass" &&
                          openFilterColumn === "supportClass" && (
                            <ColumnFilterDropdown
                              title="Destekleme Sınıfı"
                              anchorRect={filterAnchorRect}
                              options={supportClassOptions}
                              selected={supportClassFilter}
                              onToggle={(value) =>
                                toggleFilterValue(setSupportClassFilter, value)
                              }
                              onClear={() => setSupportClassFilter(new Set())}
                              onClose={() => {
                                setOpenFilterColumn(null);
                                setFilterAnchorRect(null);
                              }}
                            />
                          )}

                        {heading.filterType === "status" &&
                          openFilterColumn === "status" && (
                            <ColumnFilterDropdown
                              title="Durum"
                              anchorRect={filterAnchorRect}
                              options={statusOptions}
                              selected={statusFilter}
                              onToggle={(value) =>
                                toggleFilterValue(setStatusFilter, value)
                              }
                              onClear={() => setStatusFilter(new Set())}
                              onClose={() => {
                                setOpenFilterColumn(null);
                                setFilterAnchorRect(null);
                              }}
                            />
                          )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {showLoader ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <p className="text-sm font-medium text-muted-foreground">
                        Belgeler yükleniyor...
                      </p>
                    </td>
                  </tr>
                ) : showError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Belgeler yüklenemedi
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {loadError}
                      </p>
                    </td>
                  </tr>
                ) : showEmpty ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      {showAuthWarning ? (
                        <AuthorizationWarning />
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">
                          {documents.length > 0
                            ? "Seçilen kritere uygun belge bulunamadı."
                            : "Belge bulunamadı."}
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedVisibleDocuments.map((doc) => {
                    const isSelected = activeDocumentId === String(doc.id);

                    return (
                      <tr
                        key={doc.id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-red-500/5 dark:bg-red-500/10"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                                isSelected
                                  ? "border-red-600 bg-red-600 text-white"
                                  : "border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              <FileText size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {doc.documentNumber ?? "-"}
                              </p>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                ID: {doc.externalDocumentId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="max-w-xs px-3 py-1.5">
                          <p
                            title={doc.company?.name ?? undefined}
                            className="truncate text-xs font-semibold text-foreground"
                          >
                            {doc.company?.name ?? "Firma bilgisi bulunamadı"}
                          </p>

                          <p className="mt-1 text-left text-[11px] text-muted-foreground">
                            VKN: {doc.company?.taxNumber ?? "-"}
                          </p>
                        </td>

                        <td className="px-3 py-1.5 text-center">
                          <p
                            title={doc.company?.consultant ?? undefined}
                            className="truncate text-xs font-semibold text-foreground/80"
                          >
                            {doc.company?.consultant ?? "-"}
                          </p>
                        </td>

                        <td className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground">
                          {formatDate(doc.documentStartDate)}
                        </td>

                        <td className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground">
                          {formatDate(doc.documentEndDate)}
                        </td>

                        <td className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground">
                          {formatDate(doc.extensionDate)}
                        </td>

                        <td className="px-3 py-1.5 text-center">
                          <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                            {doc.supportClass ?? "-"}
                          </span>
                        </td>

                        <td className="px-3 py-1.5 text-center">
                          <StatusBadge status={doc.status} />
                        </td>

                        <td className="px-3 py-1.5 text-center">
                          <div className="flex items-center justify-center px-1">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDocumentId(
                                  isSelected ? null : String(doc.id),
                                )
                              }
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                isSelected
                                  ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                                  : "bg-muted text-foreground/80 hover:bg-muted/80"
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
        </div>

        {/* SAYFALAMA */}
        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Sayfa {currentPage} / {displayedTotalPages}
          </p>

          <div className="flex w-full items-center justify-center gap-1.5 sm:w-auto sm:justify-end">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Önceki
            </button>

            <button
              type="button"
              disabled={currentPage >= displayedTotalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
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
          className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Seçili Belge Detayı
            </p>

            <button
              type="button"
              onClick={() => setActiveDocumentId(null)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
            >
              <X size={14} />
              Kapat
            </button>
          </div>

          <div className="min-w-0 p-2 sm:p-3">
            <DocumentDetailScreen
              documentId={activeDocumentId}
              inline
              variant="company"
              isClosed
            />
          </div>
        </section>
      )}
    </div>
  );
}

/* =====================================================
   ALT BİLEŞENLER
===================================================== */

function AuthorizationWarning() {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-border bg-muted/40 px-4 py-4 text-left sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 sm:h-11 sm:w-11">
            <ShieldAlert size={20} strokeWidth={1.8} />
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

        <div className="border-t border-border pt-3 sm:pt-4 lg:w-72 lg:shrink-0 lg:border-l lg:border-t-0 lg:py-1 lg:pl-5 lg:pt-0">
          <p className="text-xs font-medium leading-5 text-muted-foreground">
            Yetkilendirme işlemi için lütfen danışmanınız ile iletişime geçiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
