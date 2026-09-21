"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  Filter,
  Search,
  X,
  ChevronRight,
  Check,
} from "lucide-react";

import { DocumentsScreen } from "@/app/(dashboard)/_components/screens/documents-screen";
import { CompanyIdentitySection } from "@/app/(dashboard)/_components/screens/company-identity-section";
import { CompanyRequestList } from "@/app/(dashboard)/_components/screens/company-request-list-screen";
import { apiFetch } from "@/lib/api";

type Firma = {
  id: string;
  firmaAdi: string;
  vergiNo: string;
  yetkiBitisTarihi: string | null;
  uzman: string | null;
  isActive: boolean;
  documentCount: number;
};

type CompanyApiItem = {
  id: number;
  externalCompanyId: number;
  name: string;
  taxNumber: string;
  consultant: string | null;
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

type CompanyDetailResponse = {
  success: boolean;
  message: string;
  data: CompanyApiItem;
};

const PAGE_SIZE = 20;

type StatusFilter = "all" | "active" | "expiring" | "expired";

const statusOptions: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "active", label: "Aktif" },
  { key: "expiring", label: "Süresi Yaklaşan" },
  { key: "expired", label: "Süresi Dolmuş" },
];

const QUERY_KEYS = {
  activeFirma: "firma",
  firmaTabs: "firmaSekme",
} as const;

type QueryUpdates = Partial<
  Record<keyof typeof QUERY_KEYS, string | string[] | null>
>;
const STORAGE_KEY = "companies-screen:open-tabs";

type PersistedTabs = {
  activeFirma: string | null;
  firmaTabs: string[];
};

function readPersistedTabs(): PersistedTabs | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.firmaTabs)) return null;

    return {
      activeFirma:
        typeof parsed.activeFirma === "string" ? parsed.activeFirma : null,
      firmaTabs: parsed.firmaTabs.filter(
        (id: unknown): id is string => typeof id === "string",
      ),
    };
  } catch {
    return null;
  }
}

function writePersistedTabs(value: PersistedTabs) {
  try {
    if (value.firmaTabs.length === 0 && !value.activeFirma) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  } catch {
    // storage kapalı / dolu olabilir, sessizce geç
  }
}
function parseIdList(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDirectDetailView = searchParams.get("detay") === "1";
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [firmaCache, setFirmaCache] = useState<Record<string, Firma>>({});

  const activeFirmaId = searchParams.get(QUERY_KEYS.activeFirma);
  const openFirmaIds = useMemo(
    () => parseIdList(searchParams.get(QUERY_KEYS.firmaTabs)),
    [searchParams],
  );
  const activeFirma = activeFirmaId
    ? (firmaCache[activeFirmaId] ?? null)
    : null;
  const openFirmalar = useMemo(
    () =>
      openFirmaIds
        .map((id) => firmaCache[id])
        .filter((firma): firma is Firma => Boolean(firma)),
    [openFirmaIds, firmaCache],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const detailRef = useRef<HTMLDivElement>(null);

  function updateQuery(updates: QueryUpdates) {
    const params = new URLSearchParams(searchParams.toString());

    (Object.keys(updates) as (keyof typeof QUERY_KEYS)[]).forEach((key) => {
      const value = updates[key];
      const paramKey = QUERY_KEYS[key];

      if (
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0)
      ) {
        params.delete(paramKey);
      } else if (Array.isArray(value)) {
        params.set(paramKey, value.join(","));
      } else {
        params.set(paramKey, value);
      }
    });

    writePersistedTabs({
      activeFirma: params.get(QUERY_KEYS.activeFirma),
      firmaTabs: parseIdList(params.get(QUERY_KEYS.firmaTabs)),
    });

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }
  useEffect(() => {
    // Doğrudan detay linkiyle gelindiyse veya URL'de zaten sekme varsa dokunma
    if (isDirectDetailView) return;
    if (
      searchParams.get(QUERY_KEYS.activeFirma) ||
      searchParams.get(QUERY_KEYS.firmaTabs)
    ) {
      return;
    }

    const saved = readPersistedTabs();
    if (!saved || saved.firmaTabs.length === 0) return;

    const active =
      saved.activeFirma && saved.firmaTabs.includes(saved.activeFirma)
        ? saved.activeFirma
        : saved.firmaTabs[0];

    updateQuery({ firmaTabs: saved.firmaTabs, activeFirma: active });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
          uzman: company.consultant,
          isActive: company.isActive,
          documentCount: company.documentCount,
        }));

        setFirmalar(mappedFirmalar);
        setTotalCount(response.data.totalCount);

        setFirmaCache((prev) => {
          const next = { ...prev };
          for (const firma of mappedFirmalar) {
            next[firma.id] = firma;
          }
          return next;
        });
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
    const idsToLoad = Array.from(
      new Set([...(activeFirmaId ? [activeFirmaId] : []), ...openFirmaIds]),
    ).filter((id) => !firmaCache[id]);

    if (idsToLoad.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadMissingFirmalar() {
      const results = await Promise.all(
        idsToLoad.map(async (id) => {
          try {
            const response = await apiFetch<CompanyDetailResponse>(
              `/companies/${id}`,
            );
            const company = response.data;

            const firma: Firma = {
              id: String(company.id),
              firmaAdi: company.name,
              vergiNo: company.taxNumber,
              yetkiBitisTarihi: company.authorizationEndDate,
              uzman: company.consultant,
              isActive: company.isActive,
              documentCount: company.documentCount,
            };

            return [id, firma] as const;
          } catch (error) {
            console.error(`Firma #${id} yüklenemedi:`, error);
            return null;
          }
        }),
      );

      if (cancelled) return;

      setFirmaCache((prev) => {
        const next = { ...prev };
        for (const result of results) {
          if (result) {
            next[result[0]] = result[1];
          }
        }
        return next;
      });
    }

    loadMissingFirmalar();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFirmaId, openFirmaIds.join(",")]);

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

  function handleCloseTab(firmaId: string) {
    const closedTabIndex = openFirmaIds.indexOf(firmaId);
    const remaining = openFirmaIds.filter((id) => id !== firmaId);

    if (activeFirmaId === firmaId) {
      const nextActiveFirmaId =
        openFirmaIds[closedTabIndex - 1] ??
        openFirmaIds[closedTabIndex + 1] ??
        null;

      updateQuery({
        firmaTabs: remaining,
        activeFirma: nextActiveFirmaId,
      });
    } else {
      updateQuery({ firmaTabs: remaining });
    }
  }

  function handleSelect(firma: Firma) {
    setFirmaCache((prev) => ({ ...prev, [firma.id]: firma }));

    const nextTabs = openFirmaIds.includes(firma.id)
      ? openFirmaIds
      : [...openFirmaIds, firma.id];

    updateQuery({
      firmaTabs: nextTabs,
      activeFirma: firma.id,
    });
  }

  const handleClose = () => {
    if (isDirectDetailView) {
      router.replace("/companies");
      return;
    }

    if (activeFirmaId) {
      handleCloseTab(activeFirmaId);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const firstRecord = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRecord = Math.min(page * PAGE_SIZE, totalCount);

  // Boş/hata/yükleme durumlarını hem tablo hem kart görünümü için tek yerde
  // hesaplıyoruz.
  const showInitialLoader = isLoading && firmalar.length === 0;
  const showError = !isLoading && Boolean(loadError);
  const showEmpty = !isLoading && !loadError && filteredFirmalar.length === 0;

  return (
    <div className="space-y-4 pb-5 sm:space-y-5">
      {/* BAŞLIK */}
      <section
        className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
          isDirectDetailView ? "hidden" : ""
        }`}
      >
        <div className="flex items-start gap-2.5 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 shadow-sm sm:h-11 sm:w-11">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Yatırımcı Listesi
            </h1>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
              Sistemde kayıtlı tüm firmaları görüntüleyin ve detaylarını
              inceleyin.
            </p>
          </div>
        </div>
      </section>

      {/* ARAMA + FİLTRE */}
      <section
        className={`rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ${
          isDirectDetailView ? "hidden" : ""
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Firma adı, TC veya vergi no ile ara..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-base text-slate-900 transition-all placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/15 sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition sm:w-auto ${
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
              <div className="absolute left-0 right-0 z-20 mt-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg sm:left-auto sm:w-52">
                <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm font-medium transition ${
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

      {/* LİSTE — mobilde kart, tabletten yukarı tablo */}
      <section
        className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${
          isDirectDetailView ? "hidden" : ""
        }`}
      >
        {/* MOBİL: KART GÖRÜNÜMÜ */}
        <div className="md:hidden">
          {showInitialLoader ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />
              <p className="text-sm font-medium text-slate-500">
                Firmalar yükleniyor...
              </p>
            </div>
          ) : showError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-red-700">
                Firmalar yüklenemedi
              </p>
              <p className="mt-1 text-xs text-slate-500">{loadError}</p>
            </div>
          ) : showEmpty ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Sonuç bulunamadı
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Arama veya filtre kriterlerine uyan firma yok.
              </p>
            </div>
          ) : (
            <ul
              className={`divide-y divide-slate-100 transition-opacity ${
                isLoading && firmalar.length > 0 ? "opacity-50" : ""
              }`}
            >
              {filteredFirmalar.map((firma) => {
                const isSelected = activeFirma?.id === firma.id;

                return (
                  <li
                    key={firma.id}
                    className={isSelected ? "bg-red-50/40" : ""}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(firma)}
                      className="flex w-full flex-col items-stretch gap-2 px-3 py-3 text-left transition active:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {firma.firmaAdi}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                            VKN: {firma.vergiNo}
                          </p>
                        </div>
                        {isSelected ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
                            <Check size={12} />
                            Açık
                          </span>
                        ) : (
                          <ChevronRight
                            size={16}
                            className="mt-1 shrink-0 text-slate-400"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Uzman
                          </p>
                          <p className="mt-0.5 truncate font-medium text-slate-700">
                            {firma.uzman || "-"}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Yetki Bitiş
                          </p>
                          <p className="mt-0.5 font-medium text-slate-700">
                            {formatDate(firma.yetkiBitisTarihi)}
                          </p>
                        </div>
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
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Firma Adı</th>
                  <th className="px-4 py-2">Uzman</th>
                  <th className="px-4 py-2">Vergi No</th>
                  <th className="px-4 py-2">Yetki Bitiş</th>
                  <th className="px-4 py-2 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-100 transition-opacity ${
                  isLoading && firmalar.length > 0 ? "opacity-50" : ""
                }`}
              >
                {showInitialLoader ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />
                        <p className="text-sm font-medium text-slate-500">
                          Firmalar yükleniyor...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : showError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-red-700">
                        Firmalar yüklenemedi
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                    </td>
                  </tr>
                ) : showEmpty ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center">
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
                        <td className="px-4 py-2">
                          <p className="text-xs font-semibold text-slate-900">
                            {firma.firmaAdi}
                          </p>
                        </td>

                        <td className="px-4 py-2 text-xs font-medium text-slate-700">
                          {firma.uzman || "-"}
                        </td>

                        <td className="px-4 py-2 font-mono text-xs font-medium text-slate-600">
                          {firma.vergiNo}
                        </td>

                        <td className="px-4 py-2 text-xs font-medium text-slate-600">
                          {formatDate(firma.yetkiBitisTarihi)}
                        </td>

                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleSelect(firma)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
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

        {/* SAYFALAMA — hem mobil hem tablet için ortak */}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/30 p-3 sm:flex-row sm:items-center sm:justify-between">
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
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Önceki
            </button>

            <button
              type="button"
              className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm shadow-red-600/20"
            >
              {page} / {totalPages}
            </button>

            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      </section>

      {/* AÇIK FİRMA SEKMELERİ — mobilde yatay kaydırma, tablet+ ızgara */}
      {openFirmalar.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto border-b border-slate-200/80 px-1 pt-1.5 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5 2xl:grid-cols-7">
          {openFirmalar.map((firma) => {
            const isActive = firma.id === activeFirmaId;

            return (
              <div
                key={firma.id}
                className={`flex min-w-[160px] items-center rounded-t-xl border border-b-0 transition-all sm:min-w-0 ${
                  isActive
                    ? "border-slate-200 bg-white font-semibold text-red-600 shadow-sm"
                    : "border-transparent bg-slate-100/70 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => updateQuery({ activeFirma: firma.id })}
                  className="min-w-0 flex-1 truncate px-3 py-1.5 text-left text-xs"
                >
                  {firma.firmaAdi}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCloseTab(firma.id);
                  }}
                  className="mr-1.5 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
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
        <section ref={detailRef} className="scroll-mt-6 space-y-4">
          {/* Detay Başlık Kartı — sticky'yi mobil header (64px) altına oturttum */}
          <div className="sticky top-16 z-30 -mx-1 bg-[#F1F5F9] px-1 pb-1.5 pt-1 sm:top-20">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-800 px-3 py-2 text-white shadow-md ring-1 ring-blue-900/20 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
                  <p className="truncate text-[11px] font-medium text-white/60">
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
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 sm:px-2.5"
                aria-label="Firma detayını kapat"
              >
                <X size={14} />
                <span className="hidden sm:inline">Kapat</span>
              </button>
            </div>
          </div>

          <CompanyIdentitySection companyId={activeFirma.id} />
          <CompanyRequestList companyId={String(activeFirma.id)} />
          <div className="space-y-3">
            <DocumentsScreen companyId={activeFirma.id} variant="admin" />
          </div>
        </section>
      )}
    </div>
  );
}
