"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Ban,
  Building2,
  CalendarClock,
  Clock3,
  FileCheck2,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSessionUser } from "@/lib/mock-auth";

/* -------------------------------------------------------------------------- */
/* Tipler                                                                     */
/* -------------------------------------------------------------------------- */

type SortDirection = "asc" | "desc";
type SessionUser = ReturnType<typeof getSessionUser>;

type ItemsResponse<T> = {
  success: boolean;
  message: string;
  data: {
    items: T[];
    totalCount: number;
  };
};

type DocumentStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "INACTIVE";

type CompanyRef = {
  id: number;
  externalCompanyId: number;
  name: string;
  taxNumber: string;
};

type ApiCompany = CompanyRef & {
  processStatus: string | null;
  isActive: boolean;
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
  company: CompanyRef;
};

type ExtensionEligibleDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string;
  extensionDate: string;
  extensionApplicationStartDate: string;
  supportClass: string | null;
  isActive: boolean;
  company: CompanyRef;
};

type DocumentListResponse = ItemsResponse<ApiDocument> & {
  data: {
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

type DashboardData = {
  totalCompanies: number;
  totalDocuments: number;
  /** ACTIVE + EXPIRING */
  activeDocuments: number;
  expiredDocuments: number;
  authorizationRequiredCount: number;
  closureEligibleCount: number;
  closedCancelledCount: number;
  extensionEligibleCount: number;
  activeDocumentItems: ApiDocument[];
  closureEligibleItems: ApiDocument[];
  closedCancelledItems: ApiDocument[];
  extensionEligibleItems: ExtensionEligibleDocument[];
};

type SummaryItem = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

/* -------------------------------------------------------------------------- */
/* Yardımcı fonksiyonlar                                                      */
/* -------------------------------------------------------------------------- */

const EMPTY_DASHBOARD: DashboardData = {
  totalCompanies: 0,
  totalDocuments: 0,
  activeDocuments: 0,
  expiredDocuments: 0,
  authorizationRequiredCount: 0,
  closureEligibleCount: 0,
  closedCancelledCount: 0,
  extensionEligibleCount: 0,
  activeDocumentItems: [],
  closureEligibleItems: [],
  closedCancelledItems: [],
  extensionEligibleItems: [],
};

// Cache şekli değiştiği için sürüm v6'ya yükseltildi (eski v5 verisi okunmaz).
function getDashboardCacheKey(user: SessionUser): string {
  if (!user) {
    return "dashboard-overview-cache-v6-guest";
  }

  return `dashboard-overview-cache-v6-${user.role}-${user.id}`;
}

function readDashboardCache(key: string): DashboardData | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DashboardData) : null;
  } catch (error) {
    console.error("Dashboard önbelleği okunamadı:", error);
    return null;
  }
}

function writeDashboardCache(key: string, data: DashboardData) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Dashboard önbelleği yazılamadı:", error);
  }
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("tr-TR") : "—";
}

function displayCount(value: number | undefined): string {
  return value === undefined ? "..." : String(value);
}

/** Tarihe göre sıralar; boş tarihler yönden bağımsız olarak en sona gider. */
function sortByDate<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  direction: SortDirection,
): T[] {
  return [...items].sort((a, b) => {
    const rawA = getDate(a);
    const rawB = getDate(b);

    if (!rawA && !rawB) return 0;
    if (!rawA) return 1;
    if (!rawB) return -1;

    const diff = new Date(rawA).getTime() - new Date(rawB).getTime();
    return direction === "asc" ? diff : -diff;
  });
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [
    companyResponse,
    activeDocumentResponse,
    documentSummaryResponse,
    closedDocumentResponse,
    extensionEligibleResponse,
    closureEligibleResponse,
    authorizationRequiredResponse,
  ] = await Promise.all([
    apiFetch<ItemsResponse<ApiCompany>>("/companies?page=1&limit=1"),
    apiFetch<DocumentListResponse>("/documents?status=ACTIVE&page=1&limit=20"),
    apiFetch<DocumentListResponse>("/documents"),
    apiFetch<ItemsResponse<ApiDocument>>("/closed-documents?page=1&limit=20"),
    apiFetch<ItemsResponse<ExtensionEligibleDocument>>(
      "/documents/extension-eligible",
    ),
    apiFetch<ItemsResponse<ApiDocument>>("/documents/closure-eligible"),
    apiFetch<ItemsResponse<ApiCompany>>("/companies/authorization-required"),
  ]);

  const { summary } = documentSummaryResponse.data;

  return {
    totalCompanies: companyResponse.data.totalCount,
    totalDocuments: summary.total,
    activeDocuments: summary.active + summary.expiring,
    expiredDocuments: summary.expired,
    authorizationRequiredCount: authorizationRequiredResponse.data.totalCount,
    closureEligibleCount: closureEligibleResponse.data.totalCount,
    closedCancelledCount: closedDocumentResponse.data.totalCount,
    extensionEligibleCount: extensionEligibleResponse.data.totalCount,
    activeDocumentItems: activeDocumentResponse.data.items,
    closureEligibleItems: closureEligibleResponse.data.items,
    closedCancelledItems: closedDocumentResponse.data.items,
    extensionEligibleItems: extensionEligibleResponse.data.items,
  };
}

/* -------------------------------------------------------------------------- */
/* Küçük UI parçaları                                                         */
/* -------------------------------------------------------------------------- */

function SortButton({
  direction,
  label,
  onToggle,
}: {
  direction: SortDirection;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
      title="Tarihe göre sırala"
    >
      {direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      <span>{label}</span>
    </button>
  );
}

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-red-600 hover:text-red-600"
    >
      Tümünü Gör
    </Link>
  );
}

function CountBadge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <Icon size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {children}
    </section>
  );
}

function ListMessage({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-xs text-slate-400">{children}</p>
  );
}

/* -------------------------------------------------------------------------- */
/* Ana ekran                                                                  */
/* -------------------------------------------------------------------------- */

export function DashboardScreen() {
  const router = useRouter();

  // localStorage / oturum bilgisi yalnızca istemcide okunabilir. Bunları ilk
  // render'da okumak sunucu HTML'i ile uyuşmazlığa (hydration hatası) yol
  // açtığı için mount sonrasında okuyoruz.
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<SessionUser>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // En yakın tarih en üstte gelsin (asc)
  const [closureSortDir, setClosureSortDir] = useState<SortDirection>("asc");
  const [extensionSortDir, setExtensionSortDir] =
    useState<SortDirection>("asc");
  // Aktif: bitişi en yakın olan üstte (asc). Kapalı: en son biten üstte (desc).
  const [activeSortDir, setActiveSortDir] = useState<SortDirection>("asc");
  const [closedSortDir, setClosedSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    const sessionUser = getSessionUser();
    const cacheKey = getDashboardCacheKey(sessionUser);
    const cached = readDashboardCache(cacheKey);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(sessionUser);

    if (cached) {
      // Cache varsa veri anında görünür; arka plandaki yenileme spinner göstermez.
      setData(cached);
      setIsInitialLoading(false);
    }

    setHydrated(true);

    let cancelled = false;

    async function load() {
      try {
        const fresh = await fetchDashboardData();

        if (cancelled) return;

        setData(fresh);
        writeDashboardCache(cacheKey, fresh);
      } catch (error) {
        console.error("Dashboard istatistikleri alınamadı:", error);

        // Cache zaten ekrandaysa geçici bir ağ hatası yüzünden sıfırlama.
        if (!cancelled && !cached) {
          setData(EMPTY_DASHBOARD);
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedClosureItems = useMemo(
    () =>
      sortByDate(
        data?.closureEligibleItems ?? [],
        (item) => item.documentEndDate,
        closureSortDir,
      ),
    [data?.closureEligibleItems, closureSortDir],
  );

  const sortedExtensionItems = useMemo(
    () =>
      sortByDate(
        data?.extensionEligibleItems ?? [],
        (item) => item.extensionApplicationStartDate,
        extensionSortDir,
      ),
    [data?.extensionEligibleItems, extensionSortDir],
  );

  const sortedActiveItems = useMemo(
    () =>
      sortByDate(
        data?.activeDocumentItems ?? [],
        (item) => item.documentEndDate,
        activeSortDir,
      ),
    [data?.activeDocumentItems, activeSortDir],
  );

  const sortedClosedItems = useMemo(
    () =>
      sortByDate(
        data?.closedCancelledItems ?? [],
        (item) => item.documentEndDate,
        closedSortDir,
      ),
    [data?.closedCancelledItems, closedSortDir],
  );

  // Oturum bilgisi okunana kadar yanlış (admin) düzen göstermemek için bekle.
  if (!hydrated) {
    return <div className="space-y-6 pb-8" aria-busy="true" />;
  }

  const isCompany = user?.role === "COMPANY";

  const adminSummaryItems: SummaryItem[] = [
    {
      title: "Toplam Firma",
      value: displayCount(data?.totalCompanies),
      description: "Sistemde kayıtlı firma",
      icon: Building2,
      href: "/companies",
    },
    {
      title: "Aktif Belge",
      value: displayCount(data?.activeDocuments),
      description: "Aktif durumda bulunan belge",
      icon: FileCheck2,
      href: "/documents?status=ACTIVE",
    },
    {
      title: "Kapatma Yapılacaklar",
      value: displayCount(data?.closureEligibleCount),
      description: "Tamamlama vizesi/kapatma işlemi yapılacak belgeler",
      icon: Clock3,
      href: "/documents?view=closure-eligible",
    },
    {
      title: "Süre Uzatma",
      value: displayCount(data?.extensionEligibleCount),
      description: "Süre uzatma başvurusu yapılabilecek belgeler",
      icon: CalendarClock,
      href: "/documents?view=extension-eligible",
    },
    {
      title: "Kapalı / İptal",
      value: displayCount(data?.closedCancelledCount),
      description: "Kapatılmış veya iptal edilmiş belge",
      icon: Ban,
      href: "/documents?status=INACTIVE",
    },
    {
      title: "Yetkilendirme Yapılacaklar",
      value: displayCount(data?.authorizationRequiredCount),
      description: "Yetkilendirme işlemi yapılması gereken firmalar",
      icon: Pencil,
      href: "/documents?view=authorization-required",
    },
  ];

  const companySummaryItems: SummaryItem[] = [
    {
      title: "Toplam Belge",
      value: displayCount(data?.totalDocuments),
      description: "Firmanıza ait toplam belge",
      icon: FileCheck2,
      href: "/documents",
    },
    {
      title: "Aktif",
      value: displayCount(data?.activeDocuments),
      description: "Aktif durumda bulunan belge",
      icon: FileCheck2,
      href: "/documents?status=ACTIVE",
    },
    {
      title: "Süresi Dolmuş",
      value: displayCount(data?.expiredDocuments),
      description: "Süresi dolmuş belge",
      icon: Clock3,
      href: "/documents?status=EXPIRED",
    },
    {
      title: "Kapatma Yapılacaklar",
      value: displayCount(data?.closureEligibleCount),
      description: "Tamamlama vizesi/kapatma işlemi yapılacak belge",
      icon: Clock3,
      href: "/documents?view=closure-eligible",
    },
    {
      title: "Süre Uzatma Müracatı",
      value: displayCount(data?.extensionEligibleCount),
      description: "Süre uzatma başvurusu yapılabilecek belge",
      icon: CalendarClock,
      href: "/documents?view=extension-eligible",
    },
  ];

  const summaryItems = isCompany ? companySummaryItems : adminSummaryItems;

  return (
    <div className="space-y-6 pb-8">
      {/* SAYFA BAŞLIĞI */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <span className="absolute inset-y-0 left-0 w-1 bg-red-600" />
        <div className="flex flex-col justify-between gap-3 pl-2 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                Yönetim Paneli
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Firma, belge ve yetki süreçlerinizin güncel durum özeti.
            </p>
          </div>
        </div>
      </header>

      {/* İSTATİSTİK KARTLARI */}
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {summaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              onClick={() => router.push(item.href)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(item.href);
                }
              }}
              role="link"
              tabIndex={0}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all duration-200 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-red-600 hover:-translate-y-0.5 hover:border-red-600 hover:shadow-md focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
                  <Icon size={16} />
                </div>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-400 transition group-hover:text-red-600">
                  <ArrowUpRight size={13} />
                </span>
              </div>

              <div className="mt-2">
                <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-normal text-slate-500">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">
                  {item.value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  {item.description}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* KAPATMA YAPILACAKLAR & SÜRE UZATMA */}
      <section
        className={`grid gap-6 ${isCompany ? "grid-cols-1" : "xl:grid-cols-2"}`}
      >
        <SectionCard
          icon={Clock3}
          title="Kapatma Yapılacak Firmalar"
          description="Tamamlama vizesi / kapatma işlemi yapılacak belgeler."
          actions={
            <>
              <SortButton
                direction={closureSortDir}
                label="Bitiş Tarihi"
                onToggle={() =>
                  setClosureSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              />
              
              <ViewAllLink href="/documents?view=closure-eligible" />
            </>
          }
        >
          <div className="max-h-[264px] divide-y divide-slate-100 overflow-y-auto px-5">
            {isInitialLoading ? (
              <ListMessage>Yükleniyor...</ListMessage>
            ) : sortedClosureItems.length === 0 ? (
              <ListMessage>
                Kapatma işlemi yapılacak belge bulunmuyor.
              </ListMessage>
            ) : (
              sortedClosureItems.map((document) => (
                <div
                  key={document.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {document.company.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Belge No:{" "}
                        <strong className="text-slate-700">
                          {document.documentNumber || "—"}
                        </strong>
                        {" · "}
                        Bitiş tarihi:{" "}
                        <strong className="text-red-600">
                          {formatDate(document.documentEndDate)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-lg border border-red-200/60 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                    Kapatılacak
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        {!isCompany && (
          <SectionCard
            icon={CalendarClock}
            title="Süre Uzatma"
            description="Süre uzatma başvurusu yapılabilecek belgeler."
            actions={
              <>
                <SortButton
                  direction={extensionSortDir}
                  label="Başvuru Tarihi"
                  onToggle={() =>
                    setExtensionSortDir((prev) =>
                      prev === "asc" ? "desc" : "asc",
                    )
                  }
                />
                
                <ViewAllLink href="/documents?view=extension-eligible" />
              </>
            }
          >
            <div className="max-h-[264px] divide-y divide-slate-100 overflow-y-auto px-5">
              {isInitialLoading ? (
                <ListMessage>Yükleniyor...</ListMessage>
              ) : sortedExtensionItems.length === 0 ? (
                <ListMessage>
                  Süre uzatma başvurusu yapılabilecek belge bulunmuyor.
                </ListMessage>
              ) : (
                sortedExtensionItems.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {document.company.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Belge No:{" "}
                          <strong className="text-slate-700">
                            {document.documentNumber || "—"}
                          </strong>
                          {" · "}
                          Başvuru:{" "}
                          <strong className="text-slate-700">
                            {formatDate(document.extensionApplicationStartDate)}
                          </strong>
                          {" · "}
                          Uzatma tarihi:{" "}
                          <strong className="text-blue-600">
                            {formatDate(document.extensionDate)}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg border border-blue-200/60 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      Uygun
                    </span>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        )}
      </section>

      {/* AKTİF BELGELER & KAPALI / İPTAL BELGELER */}
      {!isCompany && (
        <section className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            icon={FileCheck2}
            title="Aktif Belgeler"
            description="Sistemde aktif durumda bulunan teşvik belgeleri."
            actions={
              <>
                <SortButton
                  direction={activeSortDir}
                  label="Bitiş Tarihi"
                  onToggle={() =>
                    setActiveSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                />
               
                <ViewAllLink href="/documents?status=ACTIVE" />
              </>
            }
          >
            <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
              {isInitialLoading ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Aktif belgeler yükleniyor...
                </p>
              ) : sortedActiveItems.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Aktif belge bulunmuyor.
                </p>
              ) : (
                sortedActiveItems.map((document) => (
                  <article
                    key={document.id}
                    className="flex flex-col justify-between gap-2 p-3 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                        <FileCheck2 size={16} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {document.company.name}
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Belge No:{" "}
                          <strong className="text-slate-700">
                            {document.documentNumber || "—"}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Bitiş: {formatDate(document.documentEndDate)}
                      </span>

                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Aktif
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={Ban}
            title="Kapalı / İptal Belgeler"
            description="Kapatılmış veya iptal edilmiş teşvik belgeleri."
            actions={
              <>
                <SortButton
                  direction={closedSortDir}
                  label="Bitiş Tarihi"
                  onToggle={() =>
                    setClosedSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                />
                
                <ViewAllLink href="/documents?status=INACTIVE" />
              </>
            }
          >
            <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
              {isInitialLoading ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Kapalı belgeler yükleniyor...
                </p>
              ) : sortedClosedItems.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  Kapalı veya iptal edilmiş belge bulunmuyor.
                </p>
              ) : (
                sortedClosedItems.map((document) => (
                  <article
                    key={document.id}
                    className="flex flex-col justify-between gap-2 p-3 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600">
                        <Ban size={16} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {document.company.name}
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Belge No:{" "}
                          <strong className="text-slate-700">
                            {document.documentNumber || "—"}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Bitiş: {formatDate(document.documentEndDate)}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        Kapalı / İptal
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>
        </section>
      )}
    </div>
  );
}