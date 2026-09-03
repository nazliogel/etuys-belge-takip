"use client";

import {
  CalendarDays,
  ChevronRight,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { setSelectedDocument } from "@/app/(dashboard)/_lib/selected-document";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentDetailScreen } from "./document-detail-screen";
import { AdminDocumentDetailScreen } from "./admin-document-detail-screen";
type DocumentStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "INACTIVE";

type StoredDocumentStatus = "OPEN" | "CLOSED" | "CANCELLED";

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

async function fetchAllClosedDocuments(): Promise<ClosedApiDocument[]> {
  const limit = 100;

  const firstResponse = await apiFetch<ClosedDocumentListResponse>(
    `/closed-documents?page=1&limit=${limit}`,
  );

  const totalPages = Math.ceil(firstResponse.data.totalCount / limit);

  if (totalPages <= 1) {
    return firstResponse.data.items;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      apiFetch<ClosedDocumentListResponse>(
        `/closed-documents?page=${index + 2}&limit=${limit}`,
      ),
    ),
  );

  return [
    ...firstResponse.data.items,
    ...remainingResponses.flatMap((response) => response.data.items),
  ];
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
  const endDate = new Date(document.documentEndDate);

  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (endDate < today) {
    return "EXPIRED";
  }

  const sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  if (endDate <= sixMonthsLater) {
    return "EXPIRING";
  }

  return "ACTIVE";
}
export function DocumentsScreen({
  companyId,
  variant = "company",
}: DocumentsScreenProps) {
  const router = useRouter();
  const isCompanyView = variant === "company";

  const searchParams = useSearchParams();

  const requestedStatus = searchParams.get("status");
  const requestedView = searchParams.get("view");
  const isExtensionEligibleView = requestedView === "extension-eligible";
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
  const [companyExtensionEligibleIds, setCompanyExtensionEligibleIds] =
    useState<Set<number>>(new Set());
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
      setIsLoading(true);
      setLoadError("");

      try {
        if (companyId) {
          const [response, allClosedDocuments, extensionResponse] =
            await Promise.all([
              apiFetch<CompanyDetailResponse>(`/companies/${companyId}`),
              fetchAllClosedDocuments(),
              apiFetch<ExtensionEligibleResponse>(
                "/documents/extension-eligible",
              ),
            ]);
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
            }));

          /*
           * Aynı belge hem açık listede hem kapalı listede bulunuyorsa
           * kapalı/iptal kaydı esas alınır.
           */
          const documentsByExternalId = new Map<number, ApiDocument>();

          openDocuments.forEach((document) => {
            documentsByExternalId.set(document.externalDocumentId, document);
          });

          companyClosedDocuments.forEach((document) => {
            documentsByExternalId.set(document.externalDocumentId, document);
          });

          const mappedDocuments = Array.from(documentsByExternalId.values());
          const companyExtensionEligibleDocuments =
            extensionResponse.data.items.filter(
              (document) => document.company?.id === response.data.id,
            );

          const eligibleDocumentIds = new Set(
            companyExtensionEligibleDocuments.map((document) => document.id),
          );
          setDocuments(mappedDocuments);
          setExtensionEligibleCount(companyExtensionEligibleDocuments.length);
          setCompanyExtensionEligibleIds(eligibleDocumentIds);

          setSummary({
            total: mappedDocuments.length,
            active: mappedDocuments.filter(
              (document) => document.status === "ACTIVE",
            ).length,
            expiring: mappedDocuments.filter(
              (document) => document.status === "EXPIRING",
            ).length,
            expired: mappedDocuments.filter(
              (document) => document.status === "EXPIRED",
            ).length,
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
        if (status === "INACTIVE") {
          const [closedResponse, summaryResponse, extensionResponse] =
            await Promise.all([
              apiFetch<ClosedDocumentListResponse>(
                `/closed-documents?${params.toString()}`,
              ),
              apiFetch<DocumentListResponse>("/documents?page=1&limit=1"),
              apiFetch<ExtensionEligibleResponse>(
                "/documents/extension-eligible",
              ),
            ]);

          const totalCount = closedResponse.data.totalCount;
          const limit = 20;

          const mappedDocuments: ApiDocument[] = closedResponse.data.items.map(
            (document) => ({
              ...document,
              isActive: false,

              // Liste filtresi için kullanılacak hesaplanan durum
              status: "INACTIVE",

              // Excel/veritabanından gelen gerçek belge durumu
              documentStatus: document.status,
            }),
          );

          /*
           * Yalnızca alttaki tablo kapalı belgelerle değiştirilir.
           */
          setDocuments(mappedDocuments);
          setTotalPages(Math.max(1, Math.ceil(totalCount / limit)));
          setAuthorizationEndDate(null);

          /*
           * Üst kartlarda genel belge sayıları korunur.
           */
          setSummary(summaryResponse.data.summary);
          setClosedDocumentCount(totalCount);
          setExtensionEligibleCount(extensionResponse.data.totalCount);
          return;
        }
        /*
         * Aktif, süresi yaklaşan ve süresi dolmuş belgeler
         * normal documents endpointinden geliyor.
         */
        if (status) {
          params.set("status", status);
        }

        const [response, closedResponse, extensionResponse] = await Promise.all(
          [
            apiFetch<DocumentListResponse>(`/documents?${params.toString()}`),
            apiFetch<ClosedDocumentListResponse>(
              "/closed-documents?page=1&limit=1",
            ),
            apiFetch<ExtensionEligibleResponse>(
              "/documents/extension-eligible",
            ),
          ],
        );

        setSummary(response.data.summary);
        setClosedDocumentCount(closedResponse.data.totalCount);
        setExtensionEligibleCount(extensionResponse.data.totalCount);
        setTotalPages(response.data.totalPages);
        setDocuments(response.data.items);

        if (variant !== "company") {
          if (response.data.items.length > 0) {
            const firstDocumentId = response.data.items[0].id;

            const detailResponse = await apiFetch<DocumentDetailResponse>(
              `/documents/${firstDocumentId}`,
            );

            setAuthorizationEndDate(
              detailResponse.data.company.authorizationEndDate ?? null,
            );
          } else {
            setAuthorizationEndDate(null);
          }
        }
      } catch (error) {
        setDocuments([]);
        setAuthorizationEndDate(null);

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
    variant,
  ]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [status, searchQuery, isExtensionEligibleView]);
  function handleOpenDocument(
    documentId: string,
    documentNumber: string | null,
    isClosed: boolean,
  ) {
    const documentKey = `${isClosed ? "closed" : "open"}-${documentId}`;

    if (!isClosed) {
      setSelectedDocument(documentId, documentNumber);
    }

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

  const visibleDocuments = companyId
    ? documents.filter((document) => {
        if (showCompanyExtensionEligible) {
          return companyExtensionEligibleIds.has(document.id);
        }

        // Diğer durum kartlarının filtresi
        return companyStatusFilter
          ? document.status === companyStatusFilter
          : true;
      })
    : documents;

  return (
    <div className="min-w-0 space-y-3">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-1.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm">
            <FileText size={17} />
          </div>

          <div>
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
          <div className="grid grid-cols-1 divide-y divide-slate-200 min-[380px]:grid-cols-2 min-[380px]:divide-x sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
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
                } else {
                  router.push("/documents");
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
                  setShowCompanyExtensionEligible(true);
                } else {
                  router.push("/documents?view=extension-eligible");
                }
              }}
            />
            <OperationStat
              label="Süresi Yaklaşan"
              value={String(summary.expiring)}
              icon={<CalendarDays size={15} />}
              valueClass="text-amber-600"
              onClick={() => {
                if (companyId) {
                  setShowCompanyExtensionEligible(false);
                  setCompanyStatusFilter("EXPIRING");
                } else {
                  router.push("/documents?status=EXPIRING");
                }
              }}
            />
            <OperationStat
              label="Süresi Dolmuş"
              value={String(summary.expired)}
              icon={<ShieldCheck size={15} />}
              valueClass="text-red-600"
              onClick={() => {
                if (companyId) {
                  setShowCompanyExtensionEligible(false);
                  setCompanyStatusFilter("EXPIRED");
                } else {
                  router.push("/documents?status=EXPIRED");
                }
              }}
            />

            <OperationStat
              label="Aktif"
              value={String(summary.active)}
              icon={<FileCheck2 size={15} />}
              valueClass="text-emerald-600"
              onClick={() => {
                if (companyId) {
                  setShowCompanyExtensionEligible(false);
                  setCompanyStatusFilter("ACTIVE");
                } else {
                  router.push("/documents?status=ACTIVE");
                }
              }}
            />

            {variant === "admin" && (
              <OperationStat
                label="Kapalı / İptal"
                value={String(closedDocumentCount)}
                icon={<ShieldCheck size={15} />}
                valueClass="text-slate-600"
                onClick={() => {
                  if (companyId) {
                    setShowCompanyExtensionEligible(false);
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
        <div
          className={`flex flex-col border-b border-slate-100 bg-slate-50/40 sm:flex-row sm:items-center sm:justify-between ${
            isCompanyView ? "gap-3 p-3 sm:p-5" : "gap-2 p-2.5"
          }`}
        >
          <div>
            <h2 className="text-sm font-bold text-slate-900">Belge Listesi</h2>

            <p className="text-xs font-medium text-slate-500">
              Belge numarası, tarih ve durum bilgileri
            </p>
          </div>

          <div
            className={`relative w-full sm:shrink-0 ${
              isCompanyView ? "sm:w-72" : "sm:w-64"
            }`}
          >
            <Search
              size={17}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Belge numarası ile ara..."
              className={`w-full rounded-xl border border-slate-200 bg-white text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 ${
                isCompanyView ? "py-2 pl-10 pr-3" : "py-1 pl-8 pr-2.5"
              }`}
            />
          </div>
        </div>

        <div className="max-h-[480px] w-full overflow-auto overscroll-contain">
          <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[22%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200/60 bg-slate-50/95 text-[11px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm">
              <tr>
                {[
                  "Belge No",
                  "Firma",
                  "Belge Başlangıç",
                  "Belge Bitiş",
                  "Süre Uzatım",
                  "Destekleme Sınıfı",
                  "Durum",
                  "Detay",
                ].map((heading) => (
                  <th
                    key={heading}
                    className={`text-center ${
                      isCompanyView ? "px-6 py-3.5" : "px-3 py-1.5"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className={`px-4 text-center ${
                      isCompanyView ? "py-12" : "py-8"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-500">
                      Belgeler yükleniyor...
                    </p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={8}
                    className={`px-4 text-center ${
                      isCompanyView ? "py-12" : "py-8"
                    }`}
                  >
                    <p className="text-sm font-semibold text-red-700">
                      Belgeler yüklenemedi
                    </p>

                    <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                  </td>
                </tr>
              ) : visibleDocuments.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className={`px-4 text-center ${
                      isCompanyView ? "py-12" : "py-8"
                    }`}
                  >
                    {(companyId || variant === "company") &&
                    documents.length === 0 &&
                    !isAuthorizationLoading &&
                    !authorizationIsValid ? (
                      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-left">
                        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                              <ShieldAlert size={21} strokeWidth={1.8} />
                            </div>

                            <div className="min-w-0">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                                Yetkilendirme gerekli
                              </span>

                              <h3 className="mt-1 text-base font-bold text-slate-900">
                                Yetki süreniz dolmuştur.
                              </h3>

                              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                                Firmanın belge bilgilerinin görüntülenebilmesi
                                için yeniden yetkilendirme yapılmalıdır.
                              </p>
                            </div>
                          </div>

                          {variant === "company" && (
                            <div className="border-t border-slate-200 pt-2.5 lg:w-72 lg:shrink-0 lg:border-l lg:border-t-0 lg:py-1 lg:pl-3 lg:pt-0">
                              <p className="text-xs font-medium leading-5 text-slate-600">
                                Yetkilendirme işlemi için lütfen danışmanınız
                                ile iletişime geçiniz.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
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
                visibleDocuments.map((doc) => {
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
                      <td
                        className={isCompanyView ? "px-6 py-4" : "px-3 py-1.5"}
                      >
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

                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {doc.documentNumber ?? "-"}
                            </p>

                            <p className="font-mono text-[11px] text-slate-400">
                              ID: {doc.externalDocumentId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`max-w-xs ${
                          isCompanyView ? "px-6 py-4" : "px-3 py-1.5"
                        }`}
                      >
                        <p
                          title={
                            doc.company?.name ?? "Firma bilgisi bulunamadı"
                          }
                          className="truncate text-xs font-semibold text-slate-800"
                        >
                          {doc.company?.name ?? "Firma bilgisi bulunamadı"}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400 text-left">
                          VKN: {doc.company?.taxNumber ?? "-"}
                        </p>
                      </td>
                      <td
                        className={`${isCompanyView ? "px-6 py-4" : "px-3 py-1.5"} text-center text-xs font-medium text-slate-600`}
                      >
                        {formatDate(doc.documentStartDate)}
                      </td>

                      <td
                        className={`${isCompanyView ? "px-6 py-4" : "px-3 py-1.5"} text-center text-xs font-medium text-slate-600`}
                      >
                        {formatDate(doc.documentEndDate)}
                      </td>

                      <td
                        className={`${isCompanyView ? "px-6 py-4" : "px-3 py-1.5"} text-center text-xs font-medium text-slate-600`}
                      >
                        {formatDate(doc.extensionDate)}
                      </td>

                      <td
                        className={`${isCompanyView ? "px-6 py-4" : "px-3 py-1.5"} text-center`}
                      >
                        <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {doc.supportClass ?? "-"}
                        </span>
                      </td>

                      <td
                        className={`${isCompanyView ? "px-6 py-4" : "px-3 py-1.5"} text-center`}
                      >
                        {isExtensionEligibleView ? (
                          <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <StatusBadge
                            status={
                              doc.status === "INACTIVE"
                                ? (doc.documentStatus ?? "INACTIVE")
                                : doc.status
                            }
                          />
                        )}
                      </td>

                      <td
                        className={`${isCompanyView ? "px-6 py-4" : "px-3 py-1.5"} text-center`}
                      >
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenDocument(
                                String(doc.id),
                                doc.documentNumber,
                                doc.documentStatus === "CLOSED" ||
                                  doc.documentStatus === "CANCELLED",
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
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
        <div
          className={`flex flex-col gap-2 border-t border-slate-200 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between ${
            isCompanyView ? "bg-slate-50/30 p-3 sm:p-4" : "px-3 py-2"
          }`}
        >
          <p className="text-xs font-medium text-slate-500">
            Sayfa {currentPage} / {totalPages}
          </p>

          <div className="flex w-full gap-1.5 min-[380px]:w-auto">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 min-[380px]:flex-none"
            >
              Önceki
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 min-[380px]:flex-none"
            >
              Sonraki
            </button>
          </div>
        </div>
      </section>
      {openDocuments.length > 0 && (
        <section
          ref={documentTabsRef}
          className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {/* BELGE TABLARI */}
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

          {/*
            SEÇİLİ BELGENİN DETAYI
            Açık tüm tab'lar burada aynı anda mount edilir; sadece aktif olan
            görünür, diğerleri CSS ile gizlenir. Böylece tab değiştirirken
            DocumentDetailScreen yeniden mount olup veriyi baştan çekmiyor
            (tekrar "yükleniyor" durumuna düşüp içeriğin anlık kaybolması /
            geri gelmesi - flicker - önlenmiş oluyor).
          */}
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

        <p className={`mt-0.5 truncate text-lg font-extrabold ${valueClass}`}>
          {value}
        </p>
      </div>
    </button>
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
      label: "Süresi Dolmuş",
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200/60",
    },
    EXPIRING: {
      label: "Süresi Yaklaşan",
      dot: "bg-amber-500",
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200/60",
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
      className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
