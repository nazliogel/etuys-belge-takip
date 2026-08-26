"use client";

import {
  CalendarDays,
  Check,
  ChevronRight,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentDetailScreen } from "./document-detail-screen";
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
  id: string;
  documentNumber: string | null;
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
        status: "CLOSED";
        isActive?: boolean;
      }
    >;
    totalCount: number;
  };
};
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

function formatDate(date: string | null): string {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR").format(parsedDate);
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
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [closedDocumentCount, setClosedDocumentCount] = useState(0);
  const [extensionEligibleCount, setExtensionEligibleCount] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    inactive: 0,
  });
  const [documents, setDocuments] = useState<ApiDocument[]>([]);

  const [, setAuthorizationEndDate] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const documentTabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDocuments() {
      setIsLoading(true);
      setLoadError("");

      try {
        // ADMIN tarafından firma seçilmişse
        if (companyId) {
          const response = await apiFetch<CompanyDetailResponse>(
            `/companies/${companyId}`,
          );

          const mappedDocuments: ApiDocument[] = response.data.documents.map(
            (document) => ({
              ...document,

              // Veritabanındaki OPEN/INACTIVE/CANCELLED değerini sakla
              documentStatus: document.status,

              // Tarihe göre ekranda gösterilecek durumu hesapla
              status: calculateDocumentStatus(document),

              company: {
                id: response.data.id,
                externalCompanyId: response.data.externalCompanyId,
                name: response.data.name,
                taxNumber: response.data.taxNumber,
              },
            }),
          );

          setDocuments(mappedDocuments);

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
              status: "INACTIVE",
              documentStatus: "CLOSED",
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
  }, [companyId, currentPage, status, searchQuery, isExtensionEligibleView]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [status, searchQuery, isExtensionEligibleView]);
  function handleOpenDocument(
    documentId: string,
    documentNumber: string | null,
  ) {
    setOpenDocuments((current) => {
      const alreadyOpen = current.some(
        (document) => document.id === documentId,
      );

      if (alreadyOpen) return current;

      return [
        ...current,
        {
          id: documentId,
          documentNumber,
        },
      ];
    });

    setActiveDocumentId(documentId);

    requestAnimationFrame(() => {
      documentTabsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleCloseDocument(documentId: string) {
    setOpenDocuments((current) => {
      const remaining = current.filter(
        (document) => document.id !== documentId,
      );

      if (activeDocumentId === documentId) {
        setActiveDocumentId(remaining.at(-1)?.id ?? null);
      }

      return remaining;
    });
  }

  return (
    <div className="space-y-5">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm">
            <FileText size={17} />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Belgelerim
            </h1>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
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
            className={`grid grid-cols-2 divide-x divide-y divide-slate-200 md:grid-cols-4 md:divide-y-0 ${
              variant === "admin" ? "xl:grid-cols-6" : "xl:grid-cols-4"
            }`}
          >
            <OperationStat
              label="Toplam Belge"
              value={String(summary.total)}
              icon={<FileText size={15} />}
              onClick={() => router.push("/documents")}
            />

            <OperationStat
              label="Süre Uzatma"
              value={String(extensionEligibleCount)}
              icon={<CalendarDays size={15} />}
              valueClass="text-red-600"
              onClick={() => router.push("/documents?view=extension-eligible")}
            />

            <OperationStat
              label="Süresi Yaklaşan"
              value={String(summary.expiring)}
              icon={<CalendarDays size={15} />}
              valueClass="text-amber-600"
              onClick={() => router.push("/documents?status=EXPIRING")}
            />

            <OperationStat
              label="Süresi Dolmuş"
              value={String(summary.expired)}
              icon={<ShieldCheck size={15} />}
              valueClass="text-red-600"
              onClick={() => router.push("/documents?status=EXPIRED")}
            />

            <OperationStat
              label="Aktif"
              value={String(summary.active)}
              icon={<FileCheck2 size={15} />}
              valueClass="text-emerald-600"
              onClick={() => router.push("/documents?status=ACTIVE")}
            />

            {variant === "admin" && (
              <OperationStat
                label="Kapalı / İptal"
                value={String(closedDocumentCount)}
                icon={<ShieldCheck size={15} />}
                valueClass="text-slate-600"
                onClick={() => router.push("/documents?status=INACTIVE")}
              />
            )}
          </div>
        </section>
      )}

      {/* BELGE LİSTESİ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Belge Listesi</h2>

            <p className="text-xs font-medium text-slate-500">
              Belge numarası, tarih ve durum bilgileri
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Belge numarası ile ara..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Belge No</th>
                <th className="px-6 py-3.5">Firma</th>
                <th className="px-6 py-3.5">Belge Başlangıç</th>
                <th className="px-6 py-3.5">Belge Bitiş</th>
                <th className="px-6 py-3.5">Süre Uzatım</th>
                <th className="px-6 py-3.5">Destekleme Sınıfı</th>
                <th className="px-6 py-3.5">Durum</th>
                <th className="px-6 py-3.5 text-right">Detay</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Belgeler yükleniyor...
                    </p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-red-700">
                      Belgeler yüklenemedi
                    </p>

                    <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Bu firmaya ait belge bulunamadı.
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
                              ID: {doc.externalDocumentId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs px-6 py-4">
                        <p
                          title={
                            doc.company?.name ?? "Firma bilgisi bulunamadı"
                          }
                          className="truncate text-xs font-semibold text-slate-800"
                        >
                          {doc.company?.name ?? "Firma bilgisi bulunamadı"}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          VKN: {doc.company?.taxNumber ?? "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.documentStartDate)}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.documentEndDate)}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.extensionDate)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {doc.supportClass ?? "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={doc.status} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenDocument(
                                String(doc.id),
                                doc.documentNumber,
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
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs font-medium text-slate-500">
            Sayfa {currentPage} / {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Önceki
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-5 pt-4">
            {openDocuments.map((document) => {
              const isActive = activeDocumentId === document.id;

              const label = document.documentNumber
                ? `${document.documentNumber} No'lu Belge`
                : `Belge #${document.id}`;

              return (
                <div
                  key={document.id}
                  className={`flex shrink-0 items-center rounded-t-xl border border-b-0 ${
                    isActive
                      ? "border-slate-200 bg-white font-semibold text-red-600"
                      : "border-transparent bg-slate-100 text-slate-500"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDocumentId(document.id)}
                    className="max-w-56 truncate px-4 py-3 text-xs"
                  >
                    {label}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCloseDocument(document.id)}
                    className="mr-2 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
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
          <div className="p-6">
            {openDocuments.map((document) => (
              <div
                key={document.id}
                className={
                  document.id === activeDocumentId ? "block" : "hidden"
                }
              >
                <DocumentDetailScreen
                  documentId={document.id}
                  variant={variant}
                  isClosed={status === "INACTIVE"}
                />
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
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500/30"
    >
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
