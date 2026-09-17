"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Filter,
  FileText,
  Search,
  ShieldCheck,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
import {
  clearSelectedDocument,
  setSelectedDocument,
} from "@/app/(dashboard)/_lib/selected-document";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentDetailScreen } from "./document-detail-screen";
import { AdminDocumentDetailScreen } from "./admin-document-detail-screen";

type DocumentStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "INACTIVE";

type StoredDocumentStatus = "OPEN" | "CLOSED" | "CANCELLED";

/* =====================================================
   SIRALAMA (SORTING) YARDIMCI TİPLERİ
===================================================== */

type SortDirection = "asc" | "desc";

// Belge tablosu için sıralanabilir sütunlar
type DocumentSortKey =
  | "documentNumber"
  | "companyName"
  | "consultant"
  | "documentStartDate"
  | "documentEndDate"
  | "extensionDate"
  | "authorizationEndDate"
  | "supportClass"
  | "status";

// Tarih sütunları: sıralama "bugüne en yakın -> en uzak" mantığıyla çalışır.
const DATE_SORT_KEYS: ReadonlySet<DocumentSortKey> = new Set([
  "documentStartDate",
  "documentEndDate",
  "extensionDate",
  "authorizationEndDate",
]);

// Yetkilendirme (authorization-required) tablosu için sıralanabilir sütunlar
type AuthSortKey =
  | "externalCompanyId"
  | "name"
  | "taxNumber"
  | "consultant"
  | "authorizationEndDate"
  | "authorizationStatus";

type SortConfig<K extends string> = {
  key: K;
  direction: SortDirection;
} | null;

function toggleSort<K extends string>(
  current: SortConfig<K>,
  key: K,
): SortConfig<K> {
  if (current?.key === key) {
    // asc -> desc -> sıralama yok
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

// Belirtilen durum değeri için Türkçe görünen etiket (filtre listesinde ve
// StatusBadge'de kullanılan aynı sözlük).
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  EXPIRED: "Kapatma Yapılacak",
  CLOSED: "Kapalı",
  CANCELLED: "İptal",
  INACTIVE: "Kapalı-İptal",
};

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
  documentStatus?: StoredDocumentStatus;

  company?: {
    id: number;
    externalCompanyId: number;
    name: string;
    taxNumber: string;
    consultant: string | null;
    authorizationEndDate: string | null;
  };
};
type CompanyApiDocument = Omit<
  ApiDocument,
  "status" | "documentStatus" | "company"
> & {
  status: StoredDocumentStatus;
};
type OpenDocumentTab = {
  key: string;
  id: string;
  documentNumber: string | null;
  isClosed: boolean;
};

type AuthMeResponse = {
  user: {
    id: number;
    role: "ADMIN" | "COMPANY";
    companyId: number | null;
  };
};

type CompanyDetailResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    externalCompanyId: number;
    name: string;
    taxNumber: string;
    consultant: string | null;
    authorizationEndDate: string | null;
    documents: CompanyApiDocument[];
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
type ClosedDocumentListResponse = {
  success: boolean;
  message: string;
  data: {
    items: Array<
      Omit<ApiDocument, "status" | "isActive" | "documentStatus"> & {
        status: "CLOSED" | "CANCELLED";
        isActive?: boolean;
      }
    >;
    totalCount: number;
  };
};

type ClosedApiDocument = ClosedDocumentListResponse["data"]["items"][number];

type ExtensionEligibleResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiDocument[];
    totalCount: number;
  };
};

type ClosureEligibleResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiDocument[];
    totalCount: number;
  };
};

type AuthorizationStatus = "MISSING" | "EXPIRED" | "EXPIRING";

type AuthorizationRequiredCompany = {
  id: number;
  externalCompanyId: number;
  name: string;
  taxNumber: string;
  processStatus: string | null;
  consultant: string | null;
  consultantPhone: string | null;
  consultantEmail: string | null;
  isActive: boolean;
  authorizationEndDate: string | null;
  authorizationStatus: AuthorizationStatus;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

type AuthorizationRequiredResponse = {
  success: boolean;
  message: string;
  data: {
    items: AuthorizationRequiredCompany[];
    totalCount: number;
  };
};

type DocumentDetailResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    company: {
      authorizationEndDate: string | null;
    };
  };
};

interface DocumentsScreenProps {
  companyId?: string;
  selectedDocumentId?: string | null;
  variant?: "admin" | "company";
  onSelectDocument?: (
    documentId: string,
    documentNumber: string | null,
  ) => void;
}

// `extraParams` ile (ör. search) filtrelenmiş kapalı/iptal belgelerin
// TÜMÜ, sayfa sayfa gezilerek tek dizide toplanır. Böylece "İptal" gibi bir
// filtre uygulandığında sadece o an ekranda olan 20 kayıt değil, eşleşen
// TÜM kayıtlar arasında arama/filtreleme/sıralama yapılabilir.
async function fetchAllClosedDocuments(
  extraParams?: URLSearchParams,
): Promise<ClosedApiDocument[]> {
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

// Aynı mantık: /documents endpointinin TÜM sayfaları tek seferde çekilir.
// `summary` ilk sayfadan alınır (backend zaten toplam/aktif/vb. sayıları
// sayfadan bağımsız, tüm filtrelenmiş küme için döndürür).
async function fetchAllDocuments(baseParams: URLSearchParams): Promise<{
  items: ApiDocument[];
  summary: DocumentListResponse["data"]["summary"];
}> {
  const limit = 100;

  const firstParams = new URLSearchParams(baseParams);
  firstParams.set("page", "1");
  firstParams.set("limit", String(limit));

  const first = await apiFetch<DocumentListResponse>(
    `/documents?${firstParams.toString()}`,
  );

  const totalPages = first.data.totalPages;

  if (totalPages <= 1) {
    return { items: first.data.items, summary: first.data.summary };
  }

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => {
      const pageParams = new URLSearchParams(baseParams);
      pageParams.set("page", String(index + 2));
      pageParams.set("limit", String(limit));
      return apiFetch<DocumentListResponse>(
        `/documents?${pageParams.toString()}`,
      );
    }),
  );

  return {
    items: [
      ...first.data.items,
      ...rest.flatMap((response) => response.data.items),
    ],
    summary: first.data.summary,
  };
}
function formatDate(date: string | null): string {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR").format(parsedDate);
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

function calculateDocumentStatus(document: {
  isActive: boolean;
  documentEndDate: string | null;
  extensionDate?: string | null;
  status?: string;
}): DocumentStatus {
  if (
    !document.isActive ||
    document.status === "CLOSED" ||
    document.status === "CANCELLED"
  ) {
    return "INACTIVE";
  }

  if (!document.documentEndDate) {
    return "ACTIVE";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const documentEndDate = new Date(document.documentEndDate);
  documentEndDate.setHours(0, 0, 0, 0);

  let effectiveEndDate = documentEndDate;

  if (document.extensionDate) {
    const extensionDate = new Date(document.extensionDate);
    extensionDate.setHours(0, 0, 0, 0);

    // Tarihler farklıysa süre uzatımı yapılmıştır.
    if (
      !Number.isNaN(extensionDate.getTime()) &&
      extensionDate.getTime() !== documentEndDate.getTime()
    ) {
      effectiveEndDate = extensionDate;
    }
  }

  if (effectiveEndDate < today) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

// Belgenin, o an tablo satırında gösterilen "gerçek" durum değeri. Filtre ve
// StatusBadge aynı değeri kullanır (INACTIVE ise ham CLOSED/CANCELLED
// değerine düşülür).
function getDisplayStatus(doc: ApiDocument): string {
  return doc.status === "INACTIVE"
    ? (doc.documentStatus ?? "INACTIVE")
    : doc.status;
}

// Belge tablosu satırından, verilen sütun anahtarına göre karşılaştırılabilir
// bir değer üretir (string ya da number). Tarih sütunlarında değer, bugüne
// olan MUTLAK uzaklık (ms) olarak döner; böylece "asc" yönü bugüne en yakın
// tarihi en üste, "desc" yönü en uzak tarihi en üste getirir.
function getDocumentSortValue(
  doc: ApiDocument,
  key: DocumentSortKey,
): string | number {
  if (DATE_SORT_KEYS.has(key)) {
    const rawDate =
      key === "documentStartDate"
        ? doc.documentStartDate
        : key === "documentEndDate"
          ? doc.documentEndDate
          : key === "extensionDate"
            ? doc.extensionDate
            : (doc.company?.authorizationEndDate ?? null);

    if (!rawDate) return Infinity; // tarihi olmayanlar en sona

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
      return getDisplayStatus(doc);
    default:
      return "";
  }
}

function getAuthSortValue(
  company: AuthorizationRequiredCompany,
  key: AuthSortKey,
): string | number {
  switch (key) {
    case "externalCompanyId":
      return company.externalCompanyId;
    case "name":
      return company.name ?? "";
    case "taxNumber":
      return company.taxNumber ?? "";
    case "consultant":
      return company.consultant ?? "";
    case "authorizationEndDate": {
      if (!company.authorizationEndDate) return Infinity;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const target = new Date(company.authorizationEndDate);
      target.setHours(0, 0, 0, 0);

      if (Number.isNaN(target.getTime())) return Infinity;

      // Yetkilendirme bitişi de bugüne en yakından en uzağa sıralanır.
      return Math.abs(target.getTime() - today.getTime());
    }
    case "authorizationStatus":
      return company.authorizationStatus ?? "";
    default:
      return "";
  }
}

/* =====================================================
   SÜTUN FİLTRE (checkbox) DROPDOWN'I
   Uzman / Destekleme Sınıfı / Durum gibi az sayıda farklı
   değer alabilen sütunlarda, "sırala" yerine "filtrele"
   kullanımı çok daha kullanışlı: kullanıcı istediği kadar
   değeri aynı anda seçip listeyi daraltabiliyor.
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
      className="fixed z-[9999] w-56 rounded-xl border border-slate-200 bg-white p-2 text-left normal-case shadow-xl"
      style={{
        top: anchorRect.bottom + 6,
        left,
      }}
    >
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-semibold text-red-600 hover:underline"
            >
              Temizle
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Filtreyi kapat"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {options.length === 0 ? (
          <p className="px-1.5 py-1 text-xs font-medium text-slate-400">
            Seçenek yok
          </p>
        ) : (
          options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={() => onToggle(option.value)}
                className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-red-600 focus:ring-2 focus:ring-red-500/20"
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
export function DocumentsScreen({
  companyId,
  variant = "company",
}: DocumentsScreenProps) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const requestedStatus = searchParams.get("status");
  const requestedView = searchParams.get("view");
  const isExtensionEligibleView = requestedView === "extension-eligible";
  const isClosureEligibleView = requestedView === "closure-eligible";

  const isAuthorizationRequiredView =
    requestedView === "authorization-required";
  const status: DocumentStatus | undefined =
    requestedStatus === "ACTIVE" ||
    requestedStatus === "EXPIRING" ||
    requestedStatus === "EXPIRED" ||
    requestedStatus === "INACTIVE"
      ? requestedStatus
      : undefined;

  const [currentPage, setCurrentPage] = useState(1);
  const [openDocuments, setOpenDocuments] = useState<OpenDocumentTab[]>([]);
  const [activeDocumentKey, setActiveDocumentKey] = useState<string | null>(
    null,
  );
  const [totalPages, setTotalPages] = useState(1);
  const [showCompanyExtensionEligible, setShowCompanyExtensionEligible] =
    useState(false);
  const [closedDocumentCount, setClosedDocumentCount] = useState(0);
  const [extensionEligibleCount, setExtensionEligibleCount] = useState(0);
  const [closureEligibleCount, setClosureEligibleCount] = useState(0);

  const [authorizationRequiredCount, setAuthorizationRequiredCount] =
    useState(0);

  const [authorizationRequiredCompanies, setAuthorizationRequiredCompanies] =
    useState<AuthorizationRequiredCompany[]>([]);
  const [companyExtensionEligibleIds, setCompanyExtensionEligibleIds] =
    useState<Set<number>>(new Set());
  const [showCompanyClosureEligible, setShowCompanyClosureEligible] =
    useState(false);

  const [companyClosureEligibleIds, setCompanyClosureEligibleIds] = useState<
    Set<number>
  >(new Set());
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    inactive: 0,
  });
  const [documents, setDocuments] = useState<ApiDocument[]>([]);

  const [companyStatusFilter, setCompanyStatusFilter] =
    useState<DocumentStatus | null>(null);

  const [authorizationEndDate, setAuthorizationEndDate] = useState<
    string | null
  >(null);

  const [isAuthorizationLoading, setIsAuthorizationLoading] = useState(
    variant === "company",
  );
  const [searchQuery, setSearchQuery] = useState("");

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
  // --- SIRALAMA STATE'LERİ ---
  const [documentSortConfig, setDocumentSortConfig] =
    useState<SortConfig<DocumentSortKey>>(null);
  const [authSortConfig, setAuthSortConfig] =
    useState<SortConfig<AuthSortKey>>(null);

  function handleDocumentSort(key: DocumentSortKey) {
    setDocumentSortConfig((current) => toggleSort(current, key));
  }

  function handleAuthSort(key: AuthSortKey) {
    setAuthSortConfig((current) => toggleSort(current, key));
  }

  // --- SÜTUN FİLTRE STATE'LERİ (Uzman / Destekleme Sınıfı / Durum) ---

  const [consultantFilter, setConsultantFilter] = useState<Set<string>>(
    new Set(),
  );
  const [supportClassFilter, setSupportClassFilter] = useState<Set<string>>(
    new Set(),
  );
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

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

  const visibleAuthorizationCompaniesUnsorted =
    authorizationRequiredCompanies.filter((company) => {
      const normalizedSearch = searchQuery.trim().toLocaleLowerCase("tr-TR");

      if (!normalizedSearch) return true;

      return [
        company.name,
        company.taxNumber,
        String(company.externalCompanyId),
        company.consultant,
      ].some((value) =>
        value?.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
      );
    });

  const visibleAuthorizationCompanies = useMemo(() => {
    if (!authSortConfig) return visibleAuthorizationCompaniesUnsorted;

    return [...visibleAuthorizationCompaniesUnsorted].sort((a, b) => {
      const comparison = compareValues(
        getAuthSortValue(a, authSortConfig.key),
        getAuthSortValue(b, authSortConfig.key),
      );
      return authSortConfig.direction === "asc" ? comparison : -comparison;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleAuthorizationCompaniesUnsorted, authSortConfig]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const documentTabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenDocuments([]);
    setActiveDocumentKey(null);
  }, [companyId]);
  useEffect(() => {
    async function loadCompanyAuthorization() {
      if (variant !== "company" || companyId) {
        setIsAuthorizationLoading(false);
        return;
      }

      setIsAuthorizationLoading(true);

      try {
        const authResponse = await apiFetch<AuthMeResponse>("/auth/me");
        const userCompanyId = authResponse.user.companyId;

        if (!userCompanyId) {
          setAuthorizationEndDate(null);
          return;
        }

        const companyResponse = await apiFetch<CompanyDetailResponse>(
          `/companies/${userCompanyId}`,
        );

        setAuthorizationEndDate(
          companyResponse.data.authorizationEndDate ?? null,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Yetkilendirme bilgisi alınamadı.";

        if (message.includes("yetki süresi dolmuştur")) {
          setAuthorizationEndDate(null);
          return;
        }

        console.error("Firma yetkilendirmesi alınamadı:", error);
        setAuthorizationEndDate(null);
      } finally {
        setIsAuthorizationLoading(false);
      }
    }

    void loadCompanyAuthorization();
  }, [companyId, variant]);
  useEffect(() => {
    async function loadDocuments() {
      // Firma yetkisi kontrol edilirken belge isteği gönderme.
      if (variant === "company" && !companyId && isAuthorizationLoading) {
        return;
      }

      setIsLoading(true);
      setLoadError("");

      // Firma yetkisi yoksa belge API'lerini hiç çağırma.
      if (
        variant === "company" &&
        !companyId &&
        !hasValidAuthorization(authorizationEndDate)
      ) {
        setDocuments([]);
        setOpenDocuments([]);
        setActiveDocumentKey(null);
        clearSelectedDocument();
        setSummary({
          total: 0,
          active: 0,
          expiring: 0,
          expired: 0,
          inactive: 0,
        });
        setClosedDocumentCount(0);
        setExtensionEligibleCount(0);
        setClosureEligibleCount(0);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      try {
        if (companyId) {
          const [
            response,
            allClosedDocuments,
            extensionResponse,
            closureResponse,
          ] = await Promise.all([
            apiFetch<CompanyDetailResponse>(`/companies/${companyId}`),
            fetchAllClosedDocuments(),
            apiFetch<ExtensionEligibleResponse>(
              "/documents/extension-eligible",
            ),
            apiFetch<ClosureEligibleResponse>("/documents/closure-eligible"),
          ]);
          setAuthorizationEndDate(response.data.authorizationEndDate ?? null);

          const openDocuments: ApiDocument[] = response.data.documents.map(
            (document) => ({
              ...document,
              documentStatus: document.status,
              status: calculateDocumentStatus(document),
              company: {
                id: response.data.id,
                externalCompanyId: response.data.externalCompanyId,
                name: response.data.name,
                taxNumber: response.data.taxNumber,
                consultant: response.data.consultant,
                authorizationEndDate:
                  response.data.authorizationEndDate ?? null,
              },
            }),
          );

          const companyClosedDocuments: ApiDocument[] = allClosedDocuments
            .filter((document) => document.company?.id === response.data.id)
            .map((document) => ({
              ...document,
              isActive: false,
              status: "INACTIVE",
              documentStatus: document.status,
              company: {
                id: response.data.id,
                externalCompanyId: response.data.externalCompanyId,
                name: response.data.name,
                taxNumber: response.data.taxNumber,
                consultant: response.data.consultant,
                authorizationEndDate:
                  response.data.authorizationEndDate ?? null,
              },
            }));

          const documentsByExternalId = new Map<number, ApiDocument>();

          openDocuments.forEach((document) => {
            documentsByExternalId.set(document.externalDocumentId, document);
          });

          companyClosedDocuments.forEach((document) => {
            documentsByExternalId.set(document.externalDocumentId, document);
          });

          const mappedDocuments = Array.from(documentsByExternalId.values());
          const companyAuthorizationIsValid = hasValidAuthorization(
            response.data.authorizationEndDate ?? null,
          );
          const companyExtensionEligibleDocuments =
            extensionResponse.data.items.filter(
              (document) => document.company?.id === response.data.id,
            );

          const eligibleDocumentIds = new Set(
            companyExtensionEligibleDocuments.map((document) => document.id),
          );
          const companyClosureEligibleDocuments =
            closureResponse.data.items.filter(
              (document) => document.company?.id === response.data.id,
            );

          const closureEligibleDocumentIds = new Set(
            companyClosureEligibleDocuments.map((document) => document.id),
          );
          setDocuments(mappedDocuments);
          setExtensionEligibleCount(
            companyAuthorizationIsValid
              ? companyExtensionEligibleDocuments.length
              : 0,
          );

          setCompanyExtensionEligibleIds(
            companyAuthorizationIsValid ? eligibleDocumentIds : new Set(),
          );

          setClosureEligibleCount(
            companyAuthorizationIsValid
              ? companyClosureEligibleDocuments.length
              : 0,
          );

          setCompanyClosureEligibleIds(
            companyAuthorizationIsValid
              ? closureEligibleDocumentIds
              : new Set(),
          );

          // Uzatma/kapatma yapılabilir olarak işaretlenmiş belgeler kendi
          // kartlarında (Süre Uzatma / Kapatma Yapılacaklar) sayıldığı için
          // "Aktif" sayısına ayrıca dahil edilmiyor; aksi halde bir belge aynı
          // anda hem Aktif hem Uzatma Yapılabilir kartında görünüyordu.
          const activeMappedDocuments = companyAuthorizationIsValid
            ? mappedDocuments.filter(
                (document) =>
                  document.status !== "INACTIVE" &&
                  !eligibleDocumentIds.has(document.id) &&
                  !closureEligibleDocumentIds.has(document.id),
              )
            : [];

          setSummary({
            // Toplam belge sayısı, yetki durumundan bağımsız olarak firmanın
            // sahip olduğu TÜM belgeleri sayar (açık + kapalı/iptal).
            total: mappedDocuments.length,

            active: activeMappedDocuments.length,

            expiring: companyAuthorizationIsValid
              ? mappedDocuments.filter(
                  (document) =>
                    document.status === "EXPIRING" &&
                    !eligibleDocumentIds.has(document.id) &&
                    !closureEligibleDocumentIds.has(document.id),
                ).length
              : 0,

            expired: companyAuthorizationIsValid
              ? mappedDocuments.filter(
                  (document) =>
                    document.status === "EXPIRED" &&
                    !eligibleDocumentIds.has(document.id) &&
                    !closureEligibleDocumentIds.has(document.id),
                ).length
              : 0,

            // Kapalı/İptal belgeler yalnızca kendi kategorisinde kalır.
            inactive: mappedDocuments.filter(
              (document) => document.status === "INACTIVE",
            ).length,
          });

          setClosedDocumentCount(companyClosedDocuments.length);
          setTotalPages(1);
          setAuthorizationEndDate(response.data.authorizationEndDate);

          return;
        }

        const params = new URLSearchParams({
          page: String(currentPage),
          limit: "20",
        });

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        if (isAuthorizationRequiredView) {
          const [
            authorizationResponse,
            summaryResponse,
            closedResponse,
            extensionResponse,
            closureResponse,
          ] = await Promise.all([
            apiFetch<AuthorizationRequiredResponse>(
              "/companies/authorization-required",
            ),
            apiFetch<DocumentListResponse>("/documents?page=1&limit=1"),
            apiFetch<ClosedDocumentListResponse>(
              "/closed-documents?page=1&limit=1",
            ),
            apiFetch<ExtensionEligibleResponse>(
              "/documents/extension-eligible",
            ),
            apiFetch<ClosureEligibleResponse>("/documents/closure-eligible"),
          ]);

          setAuthorizationRequiredCompanies(authorizationResponse.data.items);
          setAuthorizationRequiredCount(authorizationResponse.data.totalCount);

          setSummary(summaryResponse.data.summary);
          setClosedDocumentCount(closedResponse.data.totalCount);
          setExtensionEligibleCount(extensionResponse.data.totalCount);
          setCompanyExtensionEligibleIds(
            new Set(
              extensionResponse.data.items.map((document) => document.id),
            ),
          );

          setClosureEligibleCount(closureResponse.data.totalCount);
          setCompanyClosureEligibleIds(
            new Set(closureResponse.data.items.map((document) => document.id)),
          );

          setDocuments([]);
          setTotalPages(1);
          setAuthorizationEndDate(null);

          return;
        }
        if (isExtensionEligibleView) {
          const [extensionResponse, summaryResponse, closedResponse] =
            await Promise.all([
              apiFetch<ExtensionEligibleResponse>(
                "/documents/extension-eligible",
              ),
              apiFetch<DocumentListResponse>("/documents?page=1&limit=1"),
              apiFetch<ClosedDocumentListResponse>(
                "/closed-documents?page=1&limit=1",
              ),
            ]);

          const normalizedSearch = searchQuery
            .trim()
            .toLocaleLowerCase("tr-TR");

          const eligibleDocuments = extensionResponse.data.items
            .filter((document) => {
              if (!normalizedSearch) return true;

              return [
                document.documentNumber,
                document.company?.name,
                document.company?.taxNumber,
              ].some((value) =>
                value?.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
              );
            })
            .map((document) => ({
              ...document,
              status: calculateDocumentStatus(document),
            }));

          setDocuments(eligibleDocuments);
          setSummary(summaryResponse.data.summary);
          setClosedDocumentCount(closedResponse.data.totalCount);
          setExtensionEligibleCount(extensionResponse.data.totalCount);
          setTotalPages(1);
          setAuthorizationEndDate(null);

          return;
        }
        if (isClosureEligibleView) {
          const [
            closureResponse,
            summaryResponse,
            closedResponse,
            extensionResponse,
            authorizationResponse,
          ] = await Promise.all([
            apiFetch<ClosureEligibleResponse>("/documents/closure-eligible"),
            apiFetch<DocumentListResponse>("/documents?page=1&limit=1"),
            apiFetch<ClosedDocumentListResponse>(
              "/closed-documents?page=1&limit=1",
            ),
            apiFetch<ExtensionEligibleResponse>(
              "/documents/extension-eligible",
            ),
            apiFetch<AuthorizationRequiredResponse>(
              "/companies/authorization-required",
            ),
          ]);

          const normalizedSearch = searchQuery
            .trim()
            .toLocaleLowerCase("tr-TR");

          const eligibleDocuments = closureResponse.data.items
            .filter((document) => {
              if (!normalizedSearch) return true;

              return [
                document.documentNumber,
                document.company?.name,
                document.company?.taxNumber,
              ].some((value) =>
                value?.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
              );
            })
            .map((document) => ({
              ...document,
              status: calculateDocumentStatus(document),
            }));

          setDocuments(eligibleDocuments);
          setClosureEligibleCount(closureResponse.data.totalCount);
          setSummary(summaryResponse.data.summary);
          setClosedDocumentCount(closedResponse.data.totalCount);
          setExtensionEligibleCount(extensionResponse.data.totalCount);
          setAuthorizationRequiredCount(authorizationResponse.data.totalCount);
          setAuthorizationRequiredCompanies(authorizationResponse.data.items);
          setTotalPages(1);
          setAuthorizationEndDate(null);

          return;
        }
        if (status === "INACTIVE") {
          const [allClosedDocuments, summaryResponse, extensionResponse] =
            await Promise.all([
              fetchAllClosedDocuments(params),
              apiFetch<DocumentListResponse>("/documents?page=1&limit=1"),
              apiFetch<ExtensionEligibleResponse>(
                "/documents/extension-eligible",
              ),
            ]);

          const mappedDocuments: ApiDocument[] = allClosedDocuments.map(
            (document) => ({
              ...document,
              isActive: false,
              status: "INACTIVE",
              documentStatus: document.status,
            }),
          );

          setDocuments(mappedDocuments);

          setAuthorizationEndDate(null);

          setSummary(summaryResponse.data.summary);
          setClosedDocumentCount(mappedDocuments.length);
          setExtensionEligibleCount(extensionResponse.data.totalCount);

          return;
        }
        if (status) {
          params.set("status", status);
        }

        const [
          response,
          summaryResponse,
          closedResponse,
          extensionResponse,
          closureResponse,
          authorizationResponse,
        ] = await Promise.all([
          // Tablo: arama / durum / sayfalama uygulanır.
          apiFetch<DocumentListResponse>(`/documents?${params.toString()}`),

          // Kartlar: hiçbir arama veya filtre uygulanmadan genel sayılar alınır.
          apiFetch<DocumentListResponse>("/documents?page=1&limit=1"),

          apiFetch<ClosedDocumentListResponse>(
            "/closed-documents?page=1&limit=1",
          ),

          apiFetch<ExtensionEligibleResponse>("/documents/extension-eligible"),

          apiFetch<ClosureEligibleResponse>("/documents/closure-eligible"),

          variant === "admin"
            ? apiFetch<AuthorizationRequiredResponse>(
                "/companies/authorization-required",
              )
            : Promise.resolve<AuthorizationRequiredResponse>({
                success: true,
                message: "",
                data: {
                  items: [],
                  totalCount: 0,
                },
              }),
        ]);

        setSummary(summaryResponse.data.summary);
        setClosedDocumentCount(closedResponse.data.totalCount);
        setExtensionEligibleCount(extensionResponse.data.totalCount);
        setCompanyExtensionEligibleIds(
          new Set(extensionResponse.data.items.map((document) => document.id)),
        );
        setClosureEligibleCount(closureResponse.data.totalCount);
        setAuthorizationRequiredCount(authorizationResponse.data.totalCount);
        setAuthorizationRequiredCompanies(authorizationResponse.data.items);
        setTotalPages(response.data.totalPages);
        setDocuments(
          response.data.items.map((document) =>
            document.status === "EXPIRING"
              ? { ...document, status: "ACTIVE" }
              : document,
          ),
        );
      } catch (error) {
        setDocuments([]);

        setLoadError(
          error instanceof Error ? error.message : "Belgeler yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDocuments();
  }, [
    companyId,
    currentPage,
    status,
    searchQuery,
    isExtensionEligibleView,
    isClosureEligibleView,
    isAuthorizationRequiredView,
    variant,
    authorizationEndDate,
    isAuthorizationLoading,
  ]);
  useEffect(() => {
    // Liste/kategori değiştiğinde ilk sayfaya dön.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [
    status,
    searchQuery,
    isExtensionEligibleView,
    isClosureEligibleView,
    isAuthorizationRequiredView,
  ]);

  useEffect(() => {
    // Başka bir belge kategorisine geçildiğinde
    // önceki kategorinin filtre ve sıralamasını taşımıyoruz.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsultantFilter(new Set());
    setSupportClassFilter(new Set());
    setStatusFilter(new Set());
    setOpenFilterColumn(null);
    setFilterAnchorRect(null);
    setDocumentSortConfig(null);
    setCurrentPage(1);
  }, [
    status,
    isExtensionEligibleView,
    isClosureEligibleView,
    isAuthorizationRequiredView,
    companyStatusFilter,
    showCompanyExtensionEligible,
    showCompanyClosureEligible,
  ]);
  function handleOpenDocument(
    documentId: string,
    documentNumber: string | null,
    documentStatus: StoredDocumentStatus,
  ) {
    const isClosed =
      documentStatus === "CLOSED" || documentStatus === "CANCELLED";

    const documentKey = `${isClosed ? "closed" : "open"}-${documentId}`;

    setSelectedDocument(documentId, documentNumber, documentStatus);

    setOpenDocuments((current) => {
      const alreadyOpen = current.some(
        (document) => document.key === documentKey,
      );

      if (alreadyOpen) return current;

      return [
        ...current,
        {
          key: documentKey,
          id: documentId,
          documentNumber,
          isClosed,
        },
      ];
    });

    setActiveDocumentKey(documentKey);

    requestAnimationFrame(() => {
      documentTabsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }
  function handleCloseDocument(documentKey: string) {
    setOpenDocuments((current) => {
      const remaining = current.filter(
        (document) => document.key !== documentKey,
      );

      if (activeDocumentKey === documentKey) {
        setActiveDocumentKey(remaining.at(-1)?.key ?? null);
      }

      return remaining;
    });
  }

  const authorizationIsValid = hasValidAuthorization(authorizationEndDate);

  // "Süresi yaklaşan" artık Aktif'e dahil olduğu için summary.expiring
  // her zaman 0 ya da backend'in henüz ayırdığı sayı olabilir; ikisini
  // toplayınca tablo ile kart birbirini tutuyor.
  const activeCount = summary.active + summary.expiring;

  const visibleDocumentsByStatusFilter = companyId
    ? documents.filter((document) => {
        // Kapalı/İptal belge uzatma/kapatma kartlarına tekrar dahil edilmez.
        if (document.status === "INACTIVE") {
          return (
            !showCompanyExtensionEligible &&
            !showCompanyClosureEligible &&
            (!companyStatusFilter || companyStatusFilter === "INACTIVE")
          );
        }

        if (showCompanyExtensionEligible) {
          return companyExtensionEligibleIds.has(document.id);
        }

        if (showCompanyClosureEligible) {
          return companyClosureEligibleIds.has(document.id);
        }

        if (!companyStatusFilter) return true;

        const isEligibleElsewhere =
          companyExtensionEligibleIds.has(document.id) ||
          companyClosureEligibleIds.has(document.id);

        if (companyStatusFilter === "ACTIVE" && isEligibleElsewhere) {
          return false;
        }

        return document.status === companyStatusFilter;
      })
    : documents;

  const consultantOptions = useMemo(() => {
    const values = new Set<string>();
    visibleDocumentsByStatusFilter.forEach((doc) => {
      values.add(doc.company?.consultant ?? "-");
    });

    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "tr-TR"))
      .map((value) => ({ value, label: value }));
  }, [visibleDocumentsByStatusFilter]);

  const supportClassOptions = useMemo(() => {
    const values = new Set<string>();
    visibleDocumentsByStatusFilter.forEach((doc) => {
      values.add(doc.supportClass ?? "-");
    });

    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "tr-TR"))
      .map((value) => ({ value, label: value }));
  }, [visibleDocumentsByStatusFilter]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    visibleDocumentsByStatusFilter.forEach((doc) => {
      values.add(getDisplayStatus(doc));
    });

    return Array.from(values)
      .sort((a, b) => a.localeCompare(b, "tr-TR"))
      .map((value) => ({
        value,
        label: STATUS_LABELS[value] ?? value,
      }));
  }, [visibleDocumentsByStatusFilter]);

  const visibleDocumentsFiltered = visibleDocumentsByStatusFilter.filter(
    (doc) => {
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

      if (statusFilter.size > 0 && !statusFilter.has(getDisplayStatus(doc))) {
        return false;
      }

      return true;
    },
  );

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

  const CLOSED_PAGE_SIZE = 20;
  const isClosedDocumentsView = !companyId && status === "INACTIVE";

  const paginatedVisibleDocuments = useMemo(() => {
    if (!isClosedDocumentsView) {
      return visibleDocuments;
    }

    const startIndex = (currentPage - 1) * CLOSED_PAGE_SIZE;
    return visibleDocuments.slice(startIndex, startIndex + CLOSED_PAGE_SIZE);
  }, [visibleDocuments, currentPage, isClosedDocumentsView]);

  const displayedTotalPages = isClosedDocumentsView
    ? Math.max(1, Math.ceil(visibleDocuments.length / CLOSED_PAGE_SIZE))
    : totalPages;

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
    { label: "Yetki Bitiş", key: "authorizationEndDate" },
    {
      label: "Destekleme Sınıfı",
      key: "supportClass",
      filterType: "supportClass",
    },
    { label: "Durum", key: "status", filterType: "status" },
    { label: "Detay" },
  ];

  const authHeadings: { label: string; key?: AuthSortKey }[] = [
    { label: "Firma ID", key: "externalCompanyId" },
    { label: "Firma", key: "name" },
    { label: "VKN", key: "taxNumber" },
    { label: "Uzman", key: "consultant" },
    { label: "Yetki Bitiş", key: "authorizationEndDate" },
    { label: "Yetki Durumu", key: "authorizationStatus" },
    { label: "Detay" },
  ];

  const activeFilterCountByColumn: Record<string, number> = {
    consultant: consultantFilter.size,
    supportClass: supportClassFilter.size,
    status: statusFilter.size,
  };

  const isCompanyView = variant === "company";

  const showAuthWarning =
    (companyId || variant === "company") &&
    documents.length === 0 &&
    !isAuthorizationLoading &&
    !authorizationIsValid;

  return (
    <div className="min-w-0 space-y-3">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-1.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm">
            <FileText size={17} />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              Belgelerim
            </h1>

            <p className="mt-0.5 text-[11px] font-medium leading-5 text-slate-500 sm:text-xs">
              Firmanıza ait tüm teşvik belgelerini ve güncel durumlarını
              görüntüleyin.
            </p>
          </div>
        </div>
      </section>

      {/* OPERASYON ÖZETİ */}
      {variant === "admin" && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div
            className={`grid grid-cols-1 divide-y divide-slate-200 min-[380px]:grid-cols-2 min-[380px]:divide-x sm:grid-cols-3 lg:divide-y-0 ${
              companyId ? "lg:grid-cols-5" : "lg:grid-cols-6"
            }`}
          >
            <OperationStat
              label="Toplam Belge"
              value={String(
                companyId ? summary.total : summary.total + closedDocumentCount,
              )}
              icon={<FileText size={15} />}
              onClick={() => {
                if (companyId) {
                  setCompanyStatusFilter(null);
                  setShowCompanyExtensionEligible(false);
                  setShowCompanyClosureEligible(false);
                } else {
                  router.push("/documents");
                }
              }}
            />

            <OperationStat
              label="Aktif"
              value={String(activeCount)}
              icon={<CheckCircle2 size={15} />}
              valueClass="text-emerald-600"
              onClick={() => {
                if (companyId) {
                  setShowCompanyExtensionEligible(false);
                  setShowCompanyClosureEligible(false);
                  setCompanyStatusFilter("ACTIVE");
                } else {
                  router.push("/documents?status=ACTIVE");
                }
              }}
            />

            <OperationStat
              label="Süre Uzatma"
              value={String(extensionEligibleCount)}
              icon={<CalendarDays size={15} />}
              valueClass="text-red-600"
              onClick={() => {
                if (companyId) {
                  setCompanyStatusFilter(null);
                  setShowCompanyClosureEligible(false);
                  setShowCompanyExtensionEligible(true);
                } else {
                  router.push("/documents?view=extension-eligible");
                }
              }}
            />

            <OperationStat
              label="Kapatma Yapılacaklar"
              value={String(closureEligibleCount)}
              icon={<CalendarDays size={15} />}
              valueClass="text-orange-600"
              onClick={() => {
                if (companyId) {
                  setCompanyStatusFilter(null);
                  setShowCompanyExtensionEligible(false);
                  setShowCompanyClosureEligible(true);
                } else {
                  router.push("/documents?view=closure-eligible");
                }
              }}
            />

            {!companyId && (
              <OperationStat
                label="Yetkilendirme Yapılacaklar"
                value={String(authorizationRequiredCount)}
                icon={<ShieldAlert size={15} />}
                valueClass="text-amber-600"
                onClick={() => {
                  router.push("/documents?view=authorization-required");
                }}
              />
            )}
            {variant === "admin" && (
              <OperationStat
                label="Kapalı / İptal"
                value={String(closedDocumentCount)}
                icon={<ShieldCheck size={15} />}
                valueClass="text-slate-600"
                onClick={() => {
                  if (companyId) {
                    setShowCompanyExtensionEligible(false);
                    setShowCompanyClosureEligible(false);
                    setCompanyStatusFilter("INACTIVE");
                  } else {
                    router.push("/documents?status=INACTIVE");
                  }
                }}
              />
            )}
          </div>
        </section>
      )}

      {/* BELGE LİSTESİ */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm sm:rounded-2xl">
        {/* Başlık + arama */}
        <div
          className={`flex flex-col gap-2 border-b border-slate-100 bg-slate-50/40 p-3 sm:flex-row sm:items-center sm:justify-between ${
            isCompanyView ? "sm:p-5" : "sm:gap-2 sm:p-2.5"
          }`}
        >
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              {isAuthorizationRequiredView
                ? "Yetkilendirme Yapılacak Firmalar"
                : "Belge Listesi"}
            </h2>
            <p className="text-xs font-medium text-slate-500">
              {isAuthorizationRequiredView
                ? "Yetkisi olmayan, süresi biten veya 6 ay içinde bitecek firmalar"
                : "Belge numarası, tarih ve durum bilgileri"}
            </p>
          </div>

          <div className="relative w-full sm:w-64 sm:shrink-0">
            <Search
              size={17}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={
                isAuthorizationRequiredView
                  ? "Firma adı ile ara..."
                  : "Belge numarası ile ara..."
              }
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base text-slate-900 transition-all placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 sm:py-1.5 sm:pl-8 sm:pr-2.5 sm:text-xs"
            />
          </div>
        </div>

        {companyId && !isAuthorizationLoading && !authorizationIsValid && (
          <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50/60 px-3 py-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-blue-700">
              <ShieldAlert size={12} strokeWidth={2} />
            </span>
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Yetkilendirme gerekli — yetki süreniz dolmuş
            </p>
          </div>
        )}

        {/* MOBİL: KART GÖRÜNÜMÜ */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-500">
                Belgeler yükleniyor...
              </p>
            </div>
          ) : loadError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Belgeler yüklenemedi
              </p>
              <p className="mt-1 text-xs text-slate-500">{loadError}</p>
            </div>
          ) : isAuthorizationRequiredView ? (
            visibleAuthorizationCompanies.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">
                Yetkilendirme yapılacak firma bulunamadı.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visibleAuthorizationCompanies.map((company) => (
                  <li key={company.id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {company.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          Firma ID: {company.externalCompanyId} • VKN:{" "}
                          {company.taxNumber || "-"}
                        </p>
                      </div>
                      <AuthorizationStatusBadge
                        status={company.authorizationStatus}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Uzman
                        </p>
                        <p className="mt-0.5 truncate font-medium text-slate-700">
                          {company.consultant ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Yetki Bitiş
                        </p>
                        <p className="mt-0.5 font-medium text-slate-700">
                          {formatDate(company.authorizationEndDate)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/companies?firmaSekme=${company.id}&firma=${company.id}&detay=1`,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-red-600 hover:text-white"
                      >
                        Firma Detayı
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : paginatedVisibleDocuments.length === 0 ? (
            <div className="px-3 py-6 text-center">
              {showAuthWarning ? (
                <AuthorizationWarning variant={variant} />
              ) : (
                <p className="text-sm font-medium text-slate-500">
                  {documents.length > 0
                    ? "Seçilen kritere uygun belge bulunamadı."
                    : "Belge bulunamadı."}
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {paginatedVisibleDocuments.map((doc) => {
                const isClosedOrCancelled =
                  doc.documentStatus === "CLOSED" ||
                  doc.documentStatus === "CANCELLED";

                const documentAuthorizationIsValid = hasValidAuthorization(
                  doc.company?.authorizationEndDate ?? null,
                );

                const authorizationExpired =
                  !isClosedOrCancelled &&
                  (companyId
                    ? !isAuthorizationLoading && !documentAuthorizationIsValid
                    : !documentAuthorizationIsValid);

                const displayedStatus = authorizationExpired
                  ? "AUTHORIZATION_EXPIRED"
                  : getDisplayStatus(doc);

                const documentKey = `${
                  doc.status === "INACTIVE" ? "closed" : "open"
                }-${doc.id}`;

                const isSelected = activeDocumentKey === documentKey;

                return (
                  <li
                    key={documentKey}
                    className={isSelected ? "bg-red-50/40" : ""}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenDocument(
                          String(doc.id),
                          doc.documentNumber,
                          doc.documentStatus ?? "OPEN",
                        )
                      }
                      className="w-full px-3 py-3 text-left transition active:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              isSelected
                                ? "border-red-600 bg-red-600 text-white"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            <FileText size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {doc.documentNumber ?? "-"}
                            </p>
                            <p className="font-mono text-[10px] text-slate-400">
                              ID: {doc.externalDocumentId}
                            </p>
                          </div>
                        </div>

                        {isClosureEligibleView ||
                        companyClosureEligibleIds.has(doc.id) ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Kapatma
                          </span>
                        ) : isExtensionEligibleView ||
                          companyExtensionEligibleIds.has(doc.id) ? (
                          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Uzatma
                          </span>
                        ) : (
                          <StatusBadge status={displayedStatus} />
                        )}
                      </div>

                      {!companyId && doc.company && (
                        <div className="mt-2 rounded-lg bg-slate-50/70 px-2 py-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Firma
                          </p>
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {doc.company.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            VKN: {doc.company.taxNumber ?? "-"}
                            {doc.company.consultant && (
                              <>
                                {" • "}
                                Uzman:{" "}
                                <span className="font-semibold text-slate-700">
                                  {doc.company.consultant}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      )}

                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Başlangıç
                          </p>
                          <p className="font-medium text-slate-700">
                            {formatDate(doc.documentStartDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Bitiş
                          </p>
                          <p className="font-medium text-slate-700">
                            {formatDate(doc.documentEndDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Süre Uzatım
                          </p>
                          <p className="font-medium text-slate-700">
                            {formatDate(doc.extensionDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Yetki Bitiş
                          </p>
                          <p className="font-medium text-slate-700">
                            {formatDate(
                              doc.company?.authorizationEndDate ?? null,
                            )}
                          </p>
                        </div>
                        {doc.supportClass && (
                          <div className="col-span-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Destek Sınıfı
                            </p>
                            <p className="truncate font-medium text-slate-700">
                              {doc.supportClass}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 flex justify-end">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                            isSelected
                              ? "bg-red-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isSelected ? (
                            "Görüntüleniyor"
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

        {/* TABLET+ : TABLO GÖRÜNÜMÜ */}
        <div className="hidden md:block">
          <div className="max-h-[480px] w-full overflow-auto overscroll-contain">
            <table
              className={`w-full table-fixed text-left text-sm ${
                isAuthorizationRequiredView ? "min-w-[900px]" : "min-w-[1150px]"
              }`}
            >
              {isAuthorizationRequiredView ? (
                <colgroup>
                  <col className="w-[13%]" />
                  <col className="w-[16%]" />
                  <col className="w-[13%]" />
                  <col className="w-[15%]" />
                  <col className="w-[13%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                </colgroup>
              ) : (
                <colgroup>
                  <col className="w-[9%]" />
                  <col className="w-[13%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                </colgroup>
              )}

              <thead className="sticky top-0 z-10 border-b border-slate-200/60 bg-slate-50/95 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
                <tr>
                  {(isAuthorizationRequiredView
                    ? authHeadings
                    : documentHeadings
                  ).map((heading) => {
                    const filterType = !isAuthorizationRequiredView
                      ? (
                          heading as {
                            filterType?:
                              | "consultant"
                              | "supportClass"
                              | "status";
                          }
                        ).filterType
                      : undefined;

                    const activeFilterCount = filterType
                      ? activeFilterCountByColumn[filterType]
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
                                isAuthorizationRequiredView
                                  ? handleAuthSort(heading.key as AuthSortKey)
                                  : handleDocumentSort(
                                      heading.key as DocumentSortKey,
                                    )
                              }
                              className="inline-flex items-center gap-1 uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-800"
                            >
                              {heading.label}
                              <SortIcon
                                direction={
                                  isAuthorizationRequiredView
                                    ? authSortConfig?.key === heading.key
                                      ? authSortConfig.direction
                                      : undefined
                                    : documentSortConfig?.key === heading.key
                                      ? documentSortConfig.direction
                                      : undefined
                                }
                              />
                            </button>
                          ) : (
                            heading.label
                          )}

                          {filterType && (
                            <button
                              type="button"
                              data-column-filter-button
                              onClick={(event) => {
                                const rect =
                                  event.currentTarget.getBoundingClientRect();

                                setOpenFilterColumn((current) => {
                                  if (current === filterType) {
                                    setFilterAnchorRect(null);
                                    return null;
                                  }

                                  setFilterAnchorRect(rect);
                                  return filterType;
                                });
                              }}
                              className={`relative rounded p-0.5 transition-colors ${
                                activeFilterCount > 0
                                  ? "text-red-600"
                                  : "text-slate-400 hover:text-slate-700"
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

                        {filterType === "consultant" &&
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

                        {filterType === "supportClass" &&
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

                        {filterType === "status" &&
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

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <p className="text-sm font-medium text-slate-500">
                        Belgeler yükleniyor...
                      </p>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-red-700">
                        Belgeler yüklenemedi
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                    </td>
                  </tr>
                ) : isAuthorizationRequiredView ? (
                  visibleAuthorizationCompanies.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm font-medium text-slate-500"
                      >
                        Yetkilendirme yapılacak firma bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    visibleAuthorizationCompanies.map((company) => (
                      <tr
                        key={company.id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-2 text-center text-xs font-semibold text-slate-700">
                          {company.externalCompanyId}
                        </td>
                        <td className="max-w-xs px-3 py-2">
                          <p
                            title={company.name}
                            className="truncate text-xs font-semibold text-slate-800"
                          >
                            {company.name}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-slate-600">
                          {company.taxNumber || "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <p
                            title={company.consultant ?? undefined}
                            className="truncate text-xs font-semibold text-slate-700"
                          >
                            {company.consultant ?? "-"}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-medium text-slate-600">
                          {formatDate(company.authorizationEndDate)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <AuthorizationStatusBadge
                            status={company.authorizationStatus}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/companies?firmaSekme=${company.id}&firma=${company.id}&detay=1`,
                              )
                            }
                            className="inline-flex whitespace-nowrap items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-red-600 hover:text-white"
                          >
                            Firma Detayı
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                ) : paginatedVisibleDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      {showAuthWarning ? (
                        <AuthorizationWarning variant={variant} />
                      ) : (
                        <p className="text-sm font-medium text-slate-500">
                          {documents.length > 0
                            ? "Seçilen kritere uygun belge bulunamadı."
                            : "Belge bulunamadı."}
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedVisibleDocuments.map((doc) => {
                    const isClosedOrCancelled =
                      doc.documentStatus === "CLOSED" ||
                      doc.documentStatus === "CANCELLED";

                    const documentAuthorizationIsValid = hasValidAuthorization(
                      doc.company?.authorizationEndDate ?? null,
                    );

                    const authorizationExpired =
                      !isClosedOrCancelled &&
                      (companyId
                        ? !isAuthorizationLoading &&
                          !documentAuthorizationIsValid
                        : !documentAuthorizationIsValid);

                    const displayedStatus = authorizationExpired
                      ? "AUTHORIZATION_EXPIRED"
                      : getDisplayStatus(doc);

                    const documentKey = `${
                      doc.status === "INACTIVE" ? "closed" : "open"
                    }-${doc.id}`;

                    const isSelected = activeDocumentKey === documentKey;

                    return (
                      <tr
                        key={documentKey}
                        className={`transition-colors ${
                          isSelected ? "bg-red-50/40" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                                isSelected
                                  ? "border-red-600 bg-red-600 text-white"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {doc.documentNumber ?? "-"}
                              </p>
                              <p className="font-mono text-[11px] text-slate-400">
                                ID: {doc.externalDocumentId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="max-w-xs px-3 py-1.5">
                          <p
                            title={
                              doc.company?.name ?? "Firma bilgisi bulunamadı"
                            }
                            className="truncate text-xs font-semibold text-slate-800"
                          >
                            {doc.company?.name ?? "Firma bilgisi bulunamadı"}
                          </p>
                          <p className="mt-1 text-left text-[11px] text-slate-400">
                            VKN: {doc.company?.taxNumber ?? "-"}
                          </p>
                        </td>

                        <td className="px-3 py-1.5 text-center">
                          <p
                            title={doc.company?.consultant ?? undefined}
                            className="truncate text-xs font-semibold text-slate-700"
                          >
                            {doc.company?.consultant ?? "-"}
                          </p>
                        </td>

                        <td className="px-3 py-1.5 text-center text-xs font-medium text-slate-600">
                          {formatDate(doc.documentStartDate)}
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs font-medium text-slate-600">
                          {formatDate(doc.documentEndDate)}
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs font-medium text-slate-600">
                          {formatDate(doc.extensionDate)}
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs font-medium text-slate-600">
                          {formatDate(
                            doc.company?.authorizationEndDate ?? null,
                          )}
                        </td>

                        <td className="px-3 py-1.5 text-center">
                          <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {doc.supportClass ?? "-"}
                          </span>
                        </td>

                        <td className="px-3 py-1.5 text-center">
                          {isClosureEligibleView ||
                          companyClosureEligibleIds.has(doc.id) ? (
                            <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              Kapatma Yapılacak
                            </span>
                          ) : isExtensionEligibleView ||
                            companyExtensionEligibleIds.has(doc.id) ? (
                            <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Uzatma Yapılabilir
                            </span>
                          ) : (
                            <StatusBadge status={displayedStatus} />
                          )}
                        </td>

                        <td className="px-3 py-1.5 text-center">
                          <div className="flex items-center justify-center px-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenDocument(
                                  String(doc.id),
                                  doc.documentNumber,
                                  doc.documentStatus ?? "OPEN",
                                )
                              }
                              className={`inline-flex whitespace-nowrap items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                isSelected
                                  ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {isSelected ? (
                                "Görüntüleniyor"
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
        <div
          className={`flex flex-col gap-2 border-t border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between ${
            isCompanyView ? "bg-slate-50/30 sm:p-4" : "sm:px-3 sm:py-2"
          }`}
        >
          <p className="text-xs font-medium text-slate-500">
            Sayfa {currentPage} / {displayedTotalPages}
          </p>

          <div className="flex w-full gap-1.5 sm:w-auto">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Önceki
            </button>
            <button
              type="button"
              disabled={currentPage >= displayedTotalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Sonraki
            </button>
          </div>
        </div>
      </section>

      {/* AÇIK BELGE SEKMELERİ + DETAY */}
      {openDocuments.length > 0 && (
        <section
          ref={documentTabsRef}
          className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2.5 pt-1.5">
            {openDocuments.map((document) => {
              const isActive = activeDocumentKey === document.key;

              const label = document.documentNumber
                ? `${document.documentNumber} No'lu Belge`
                : `Belge #${document.id}`;

              return (
                <div
                  key={document.key}
                  className={`flex shrink-0 items-center rounded-t-xl border border-b-0 ${
                    isActive
                      ? "border-slate-200 bg-white font-semibold text-red-600"
                      : "border-transparent bg-slate-100 text-slate-500"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDocumentKey(document.key)}
                    className="max-w-56 truncate px-2.5 py-1.5 text-xs"
                  >
                    {label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCloseDocument(document.key)}
                    className="mr-1 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="min-w-0 p-2 sm:p-3">
            {openDocuments.map((document) => (
              <div
                key={document.key}
                className={
                  document.key === activeDocumentKey ? "block" : "hidden"
                }
              >
                {variant === "admin" ? (
                  <AdminDocumentDetailScreen
                    documentId={document.id}
                    isClosed={document.isClosed}
                  />
                ) : (
                  <DocumentDetailScreen
                    documentId={document.id}
                    variant={variant}
                    isClosed={document.isClosed}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* =====================================================
   ALT BİLEŞENLER
===================================================== */

function OperationStat({
  label,
  value,
  icon,
  valueClass = "text-slate-900",
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full items-center gap-2 px-2.5 py-2.5 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500/30"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-base font-extrabold sm:text-lg ${valueClass}`}
        >
          {value}
        </p>
      </div>
    </button>
  );
}

function AuthorizationStatusBadge({ status }: { status: AuthorizationStatus }) {
  const config = {
    MISSING: {
      label: "Yetki Yok",
      className: "border-red-200 bg-red-50 text-red-700",
    },
    EXPIRED: {
      label: "Yetkisi Bitmiş",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    },
    EXPIRING: {
      label: "6 Ay İçinde Bitecek",
      className: "border-amber-200 bg-amber-50 text-amber-700",
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

function AuthorizationWarning({ variant }: { variant: "admin" | "company" }) {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-left">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 sm:h-11 sm:w-11">
            <ShieldAlert size={21} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Yetkilendirme gerekli
            </span>
            <h3 className="mt-1 text-sm font-bold text-slate-900 sm:text-base">
              Yetki süreniz dolmuştur.
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
              Firmanın belge bilgilerinin görüntülenebilmesi için yeniden
              yetkilendirme yapılmalıdır.
            </p>
          </div>
        </div>

        {variant === "company" && (
          <div className="border-t border-slate-200 pt-2.5 lg:w-72 lg:shrink-0 lg:border-l lg:border-t-0 lg:py-1 lg:pl-3 lg:pt-0">
            <p className="text-xs font-medium leading-5 text-slate-600">
              Yetkilendirme işlemi için lütfen uzmanınız ile iletişime geçiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200/60",
    },
    EXPIRED: {
      label: "Kapatma Yapılacak",
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200/60",
    },

    CLOSED: {
      label: "Kapalı",
      dot: "bg-blue-500",
      text: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    CANCELLED: {
      label: "İptal",
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200/60",
    },
    INACTIVE: {
      label: "Kapalı-İptal",
      dot: "bg-slate-400",
      text: "text-slate-600",
      bg: "bg-slate-100",
      border: "border-slate-200",
    },
    AUTHORIZATION_EXPIRED: {
      label: "Yetkisi Bitmiş",
      dot: "bg-blue-500",
      text: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
  };

  const c = config[status] ?? {
    label: status,
    dot: "bg-slate-400",
    text: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
