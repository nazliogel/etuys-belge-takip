"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Building2,
  Filter,
  Search,
  X,
  ChevronRight,
  Check,
} from "lucide-react";

import { DocumentsScreen } from "@/app/(dashboard)/_components/screens/documents-screen";
import { DocumentDetailScreen } from "@/app/(dashboard)/_components/screens/document-detail-screen";
import { CompanyIdentitySection } from "@/app/(dashboard)/_components/screens/company-identity-section";
import { companyMockData } from "@/lib/company-mock-data";
import { apiFetch } from "@/lib/api";

type Firma = {
  id: string;
  firmaAdi: string;
  vergiNo: string;
  yetkiBitisTarihi: string | null;
  isActive: boolean;
  documentCount: number;
};

type CompanyApiItem = {
  id: number;
  externalCompanyId: number;
  name: string;
  taxNumber: string;
  processStatus: string | null;
  isActive: boolean;
  authorizationEndDate: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

type CompanyListResponse = {
  success: boolean;
  message: string;
  data: {
    items: CompanyApiItem[];
    totalCount: number;
  };
};

const PAGE_SIZE = 20;

type StatusFilter = "all" | "active" | "expiring" | "expired";

const statusOptions: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "active", label: "Aktif" },
  { key: "expiring", label: "Süresi Yaklaşan" },
  { key: "expired", label: "Süresi Dolmuş" },
];

function getFirmaStatus(
  dateStr: string | null,
): Exclude<StatusFilter, "all"> | null {
  if (!dateStr) return null;

  const end = new Date(dateStr);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const remainingDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (remainingDays < 0) return "expired";
  if (remainingDays <= 180) return "expiring";

  return "active";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";

  return new Intl.DateTimeFormat("tr-TR").format(new Date(dateStr));
}

export function CompaniesScreen() {
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [openFirmalar, setOpenFirmalar] = useState<Firma[]>([]);
  const [activeFirmaId, setActiveFirmaId] = useState<string | null>(null);

  const activeFirma =
    openFirmalar.find((firma) => firma.id === activeFirmaId) ?? null;

  // Belge sekmeleri: firma sekmeleriyle aynı desen — birden fazla belge
  // aynı anda açık kalabilir, aralarında geçiş yapılabilir, tek tek kapatılabilir.
  const [openDocumentIds, setOpenDocumentIds] = useState<string[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  // Arama + filtre
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const detailRef = useRef<HTMLDivElement>(null);
  const documentDetailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCompanies() {
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

        const response = await apiFetch<CompanyListResponse>(
          `/companies?${params.toString()}`,
        );

        const mappedFirmalar: Firma[] = response.data.items.map((company) => ({
          id: String(company.id),
          firmaAdi: company.name,
          vergiNo: company.taxNumber,
          yetkiBitisTarihi: company.authorizationEndDate,
          isActive: company.isActive,
          documentCount: company.documentCount,
        }));

        setFirmalar(mappedFirmalar);
        setTotalCount(response.data.totalCount);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Firmalar yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    const timer = window.setTimeout(loadCompanies, 300);

    return () => window.clearTimeout(timer);
  }, [page, searchQuery]);

  useEffect(() => {
    if (activeFirma) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  }, [activeFirma]);

  useEffect(() => {
    if (activeDocumentId) {
      setTimeout(() => {
        documentDetailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  }, [activeDocumentId]);

  // Filtre dropdown'ı dışarı tıklanınca kapansın
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

  const filteredFirmalar = useMemo(() => {
    return firmalar.filter((firma) => {
      return (
        statusFilter === "all" ||
        getFirmaStatus(firma.yetkiBitisTarihi) === statusFilter
      );
    });
  }, [firmalar, statusFilter]);

  function resetDocumentTabs() {
    setOpenDocumentIds([]);
    setActiveDocumentId(null);
  }

  function handleCloseTab(firmaId: string) {
    // Güncel state üzerinden hesapla; setState updater'ı içinde başka bir
    // setState tetiklemek (eski kod) React'ta öngörülemeyen sonuçlara yol
    // açabiliyordu — sekme bazen silinmiş gibi görünüp geri geliyordu.
    const remaining = openFirmalar.filter((firma) => firma.id !== firmaId);
    setOpenFirmalar(remaining);

    if (activeFirmaId === firmaId) {
      const nextFirma = remaining.at(-1) ?? null;
      setActiveFirmaId(nextFirma?.id ?? null);
      resetDocumentTabs();
    }
  }

  function handleSelect(firma: Firma) {
    setOpenFirmalar((current) => {
      const alreadyOpen = current.some((item) => item.id === firma.id);
      return alreadyOpen ? current : [...current, firma];
    });

    setActiveFirmaId(firma.id);
    resetDocumentTabs();
  }

  const handleClose = () => {
    setActiveFirmaId(null);
    resetDocumentTabs();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function handleOpenDocument(docId: string) {
    setOpenDocumentIds((current) =>
      current.includes(docId) ? current : [...current, docId],
    );
    setActiveDocumentId(docId);
  }

  function handleCloseDocumentTab(docId: string) {
    const remaining = openDocumentIds.filter((id) => id !== docId);
    setOpenDocumentIds(remaining);

    if (activeDocumentId === docId) {
      setActiveDocumentId(remaining.at(-1) ?? null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const firstRecord = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastRecord = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-8 pb-8">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 border border-red-100 text-red-600 shadow-sm">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Yatırımcı Listesi
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              Sistemde kayıtlı tüm firmaları görüntüleyin ve detaylarını
              inceleyin.
            </p>
          </div>
        </div>
      </section>

      {/* ARAMA + FİLTRE */}
      <section className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Firma adı, TC veya vergi no ile ara..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Aramayı temizle"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen((current) => !current)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
                statusFilter !== "all"
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:bg-slate-200"
              }`}
            >
              <Filter size={16} />
              Filtrele
              {statusFilter !== "all" && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  1
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <p className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Yetki Durumu
                </p>
                {statusOptions.map((option) => {
                  const isActive = statusFilter === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option.key);
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
      </section>

      {/* TABLO */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/60">
              <tr>
                <th className="px-6 py-3.5">Firma Adı</th>
                <th className="px-6 py-3.5">Vergi No</th>
                <th className="px-6 py-3.5">Yetki Bitiş</th>
                <th className="px-6 py-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />
                      <p className="text-sm font-medium text-slate-500">
                        Firmalar yükleniyor...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-red-700">
                      Firmalar yüklenemedi
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                  </td>
                </tr>
              ) : filteredFirmalar.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Sonuç bulunamadı
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Arama veya filtre kriterlerine uyan firma yok.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFirmalar.map((firma) => {
                  const isSelected = activeFirma?.id === firma.id;

                  return (
                    <tr
                      key={firma.id}
                      className={`transition-colors ${
                        isSelected ? "bg-red-50/40" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 text-sm">
                          {firma.firmaAdi}
                        </p>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">
                        {firma.vergiNo}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(firma.yetkiBitisTarihi)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleSelect(firma)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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
        {/* SAYFALAMA */}
        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/30">
          <p className="text-xs text-slate-500 font-medium">
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

      {/* AÇIK FİRMA SEKMELERİ */}
      {openFirmalar.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200/80 pt-2">
          {openFirmalar.map((firma) => {
            const isActive = firma.id === activeFirmaId;

            return (
              <div
                key={firma.id}
                className={`flex shrink-0 items-center rounded-t-xl border border-b-0 transition-all ${
                  isActive
                    ? "border-slate-200 bg-white text-red-600 font-semibold shadow-sm"
                    : "border-transparent bg-slate-100/70 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveFirmaId(firma.id);
                    resetDocumentTabs();
                  }}
                  className="max-w-56 truncate px-4 py-2.5 text-xs"
                >
                  {firma.firmaAdi}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCloseTab(firma.id);
                  }}
                  className="mr-2 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                  aria-label={`${firma.firmaAdi} sekmesini kapat`}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* SEÇİLEN FİRMA DETAYI */}
      {activeFirma && (
        <section ref={detailRef} className="scroll-mt-6 space-y-6">
          {/* Detay Başlık Kartı */}
          {/* Detay Başlık Kartı — scroll'da üstte kalır, hangi firmada olduğunuzu unutmazsınız */}
          <div className="sticky top-20 z-30 -mx-1 bg-[#F1F5F9] px-1 pb-2 pt-1">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-blue-800 px-4 py-3 text-white shadow-md ring-1 ring-blue-900/20">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm shadow-red-600/30">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-100">
                    Seçili Firma
                  </p>
                  <h2 className="truncate text-sm font-bold tracking-tight text-white">
                    {activeFirma.firmaAdi}
                  </h2>
                  <p className="text-[11px] font-medium text-white/60">
                    Vergi No:{" "}
                    <span className="font-semibold text-white/90">
                      {activeFirma.vergiNo}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <X size={14} />
                Kapat
              </button>
            </div>
          </div>

          {/* Firma Künye + İletişim Bilgileri */}
          <CompanyIdentitySection companyId={activeFirma.id} />

          {/* Belgeler */}
          <div className="space-y-4"></div>

          {/* Belgeler */}
          <div className="space-y-4">
            <DocumentsScreen
              companyId={activeFirma.id}
              selectedDocumentId={activeDocumentId}
              onSelectDocument={handleOpenDocument}
              variant="admin"
            />

            {/* AÇIK BELGE SEKMELERİ */}
            {openDocumentIds.length > 0 && (
              <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pt-2">
                {openDocumentIds.map((docId) => {
                  const isActive = docId === activeDocumentId;
                  const doc = companyMockData.documents.find(
                    (item) => String(item.id) === docId,
                  );
                  const label = doc
                    ? `${doc.number} No'lu Belge`
                    : `Belge #${docId}`;

                  return (
                    <div
                      key={docId}
                      className={`flex shrink-0 items-center rounded-t-xl border border-b-0 transition-all ${
                        isActive
                          ? "border-slate-200 bg-white text-red-600 font-semibold shadow-sm"
                          : "border-transparent bg-slate-100/70 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveDocumentId(docId)}
                        className="max-w-48 truncate px-4 py-2.5 text-xs"
                      >
                        {label}
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCloseDocumentTab(docId);
                        }}
                        className="mr-2 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        aria-label={`${label} sekmesini kapat`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AKTİF BELGE DETAYI */}
            {activeDocumentId && (
              <section
                ref={documentDetailRef}
                className="scroll-mt-6 space-y-4 border-t border-dashed border-slate-200 pt-8"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Seçili Belge Detayı
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCloseDocumentTab(activeDocumentId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <X size={14} />
                    Belgeyi Kapat
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
        </section>
      )}
    </div>
  );
}
