"use client";

import {
  Archive,
  Check,
  ChevronRight,
  FileText,
  ShieldAlert,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  };
};

type ClosedDocumentListResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiClosedDocument[];
    totalCount: number;
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

const PAGE_SIZE = 20;

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
export function ClosedDocumentsScreen() {
  const [page, setPage] = useState(1);
  const [documents, setDocuments] = useState<ApiClosedDocument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCompanyUser, setIsCompanyUser] = useState(false);
  const [authorizationEndDate, setAuthorizationEndDate] = useState<
    string | null
  >(null);
  const [isAuthorizationLoading, setIsAuthorizationLoading] = useState(true);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
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
        console.error("Yetkilendirme bilgisi alınamadı:", error);

        setIsCompanyUser(false);
        setAuthorizationEndDate(null);
      } finally {
        setIsAuthorizationLoading(false);
      }
    }

    void loadAuthorization();
  }, []);
  /* KAPALI BELGELERİ API'DEN GETİR */
  useEffect(() => {
    async function loadClosedDocuments() {
      setIsLoading(true);
      setLoadError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }

        const response = await apiFetch<ClosedDocumentListResponse>(
          `/closed-documents?${params.toString()}`,
        );

        setDocuments(response.data.items);
        setTotalCount(response.data.totalCount);
      } catch (error) {
        setDocuments([]);
        setTotalCount(0);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Kapalı belgeler yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadClosedDocuments();
  }, [page, searchQuery]);

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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const firstRecord = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRecord = Math.min(page * PAGE_SIZE, totalCount);

  const authorizationIsValid = hasValidAuthorization(authorizationEndDate);

  const showLoader = isLoading || isAuthorizationLoading;
  const showError = !showLoader && Boolean(loadError);
  const showEmpty = !showLoader && !loadError && documents.length === 0;
  const showAuthWarning = showEmpty && isCompanyUser && !authorizationIsValid;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm">
            <Archive size={17} />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              Kapalı Durumdaki Belgeler
            </h1>

            <p className="mt-0.5 text-[11px] font-medium leading-5 text-slate-500 sm:text-xs">
              Süresi dolmuş, iptal edilmiş veya tamamlanmış tüm teşvik
              belgelerini görüntüleyin.
            </p>
          </div>
        </div>
      </section>

      {/* BELGE LİSTESİ */}
      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm sm:rounded-2xl">
        {/* Başlık + arama */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/40 p-3 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Kapalı Belge Listesi
            </h2>

            <p className="text-xs font-medium text-slate-500">
              Belge numarası, firma adı ve kapanma bilgileri
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
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
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-base text-slate-900 transition-all placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 sm:text-xs"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Aramayı temizle"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MOBİL: KART GÖRÜNÜMÜ */}
        <div className="md:hidden">
          {showLoader ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-500">
                Belgeler yükleniyor...
              </p>
            </div>
          ) : showError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Belgeler yüklenemedi
              </p>
              <p className="mt-1 text-xs text-slate-500">{loadError}</p>
            </div>
          ) : showEmpty ? (
            <div className="px-3 py-6 text-center">
              {showAuthWarning ? (
                <AuthorizationWarning />
              ) : (
                <p className="text-sm font-medium text-slate-500">
                  Belge bulunamadı.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const isSelected = activeDocumentId === String(doc.id);

                return (
                  <li key={doc.id} className={isSelected ? "bg-red-50/40" : ""}>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDocumentId(isSelected ? null : String(doc.id))
                      }
                      className="w-full px-3 py-3 text-left transition active:bg-slate-50"
                    >
                      {/* Üst satır: belge no + durum */}
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
                        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Kapalı / İptal
                        </span>
                      </div>

                      {/* Firma */}
                      <div className="mt-2 rounded-lg bg-slate-50/70 px-2 py-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Firma
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {doc.company.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                          VKN: {doc.company.taxNumber}
                        </p>
                      </div>

                      {/* Tarihler + destek */}
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Başlangıç
                          </p>
                          <p className="font-medium text-slate-700">
                            {formatDate(doc.documentStartDate)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Bitiş
                          </p>
                          <p className="font-medium text-slate-700">
                            {formatDate(doc.documentEndDate)}
                          </p>
                        </div>
                        {doc.extensionDate && (
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Süre Uzatım
                            </p>
                            <p className="font-medium text-slate-700">
                              {formatDate(doc.extensionDate)}
                            </p>
                          </div>
                        )}
                        {doc.supportClass && (
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Destek Sınıfı
                            </p>
                            <p className="truncate font-medium text-slate-700">
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
                              : "bg-slate-100 text-slate-700"
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

        {/* TABLET+ : TABLO GÖRÜNÜMÜ */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
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
                {showLoader ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-slate-500">
                        Belgeler yükleniyor...
                      </p>
                    </td>
                  </tr>
                ) : showError ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <p className="text-sm font-semibold text-red-700">
                        Belgeler yüklenemedi
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                    </td>
                  </tr>
                ) : showEmpty ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12">
                      {showAuthWarning ? (
                        <AuthorizationWarning />
                      ) : (
                        <p className="text-center text-sm font-medium text-slate-500">
                          Belge bulunamadı.
                        </p>
                      )}
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
                            title={doc.company.name}
                            className="truncate text-sm font-semibold text-slate-900"
                          >
                            {doc.company.name}
                          </p>

                          <p className="font-mono text-[11px] text-slate-500">
                            VKN: {doc.company.taxNumber}
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
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Kapalı / İptal
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
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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
        </div>

        {/* SAYFALAMA */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <p className="text-xs font-medium text-slate-500">
            <span className="font-bold text-slate-700">
              {firstRecord}-{lastRecord}
            </span>{" "}
            arası, toplam{" "}
            <span className="font-bold text-slate-700">{totalCount}</span> kayıt
          </p>

          <div className="flex items-center justify-center gap-1.5 sm:justify-end">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
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
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
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
          className="scroll-mt-6 space-y-4 border-t border-dashed border-slate-200 pt-6 sm:pt-8"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Seçili Belge Detayı
            </p>
            <button
              type="button"
              onClick={() => setActiveDocumentId(null)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={14} />
              Kapat
            </button>
          </div>

          <DocumentDetailScreen
            documentId={activeDocumentId}
            inline
            variant="company"
            isClosed
          />
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
    <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-left sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 sm:h-11 sm:w-11">
            <ShieldAlert size={20} strokeWidth={1.8} />
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

        <div className="border-t border-slate-200 pt-3 sm:pt-4 lg:w-72 lg:shrink-0 lg:border-l lg:border-t-0 lg:py-1 lg:pl-5 lg:pt-0">
          <p className="text-xs font-medium leading-5 text-slate-600">
            Yetkilendirme işlemi için lütfen danışmanınız ile iletişime geçiniz.
          </p>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
