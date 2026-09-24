"use client";

import {
  CalendarDays,
  CheckCircle2,
  Filter,
  FileText,
  Search,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearSelectedDocument,
  setSelectedDocument,
} from "@/app/(dashboard)/_lib/selected-document";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ApiDocument,
  AuthSortKey,
  DocumentSortKey,
  DocumentStatus,
  DocumentsScreenProps,
  OpenDocumentTab,
  SortConfig,
  StoredDocumentStatus,
} from "./documents/types";
import {
  compareValues,
  getAuthSortValue,
  getBadgeStatus,
  getDocumentSortValue,
  hasValidAuthorization,
  isDocumentAuthorizationExpired,
  STATUS_LABELS,
  toggleSort,
  useDebouncedValue,
} from "./documents/lib";
import {
  AuthorizationWarning,
  ColumnFilterDropdown,
  OperationStat,
  SortIcon,
} from "./documents/components";
import {
  AuthorizationCompanyCard,
  AuthorizationCompanyRow,
  DocumentCard,
  DocumentRow,
  DocumentTabsPanel,
} from "./documents/rows";
import { useDocumentsData } from "./documents/use-documents-data";

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
  const [showCompanyExtensionEligible, setShowCompanyExtensionEligible] =
    useState(false);
  const [showCompanyClosureEligible, setShowCompanyClosureEligible] =
    useState(false);

  const [companyStatusFilter, setCompanyStatusFilter] =
    useState<DocumentStatus | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);

  // Veri: belgeler, kart sayıları ve firma yetkisi (documents/use-documents-data.ts)
  const {
    documents,
    totalPages,
    isLoading,
    loadError,
    summary,
    closedDocumentCount,
    extensionEligibleCount,
    closureEligibleCount,
    authorizationRequiredCount,
    authorizationRequiredCompanies,
    companyExtensionEligibleIds,
    companyClosureEligibleIds,
    authorizationEndDate,
    isAuthorizationLoading,
    authorizationAllowsFetch,
  } = useDocumentsData({
    companyId,
    variant,
    currentPage,
    status,
    debouncedSearch,
    isExtensionEligibleView,
    isClosureEligibleView,
    isAuthorizationRequiredView,
  });

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
  }, [visibleAuthorizationCompaniesUnsorted, authSortConfig]);

  const documentTabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenDocuments([]);
    setActiveDocumentKey(null);
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatusFilter(new Set());
    setConsultantFilter(new Set());
    setSupportClassFilter(new Set());
  }, [requestedView, requestedStatus]);

  // Firma yetkisi dolduysa açık belge sekmelerini kapat.
  useEffect(() => {
    if (isAuthorizationLoading || authorizationAllowsFetch) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenDocuments([]);
    setActiveDocumentKey(null);
    clearSelectedDocument();
  }, [authorizationAllowsFetch, isAuthorizationLoading]);

  useEffect(() => {
    // Liste/kategori değiştiğinde ilk sayfaya dön.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [
    status,
    debouncedSearch,
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

  // Listeden bir belgeye tıklanınca alttaki sekmelerde açılır.
  function openDocument(doc: ApiDocument) {
    handleOpenDocument(
      String(doc.id),
      doc.documentNumber,
      doc.documentStatus ?? "OPEN",
    );
  }

  // Yetkilendirme listesinden firma detayına gider.
  function openCompany(id: number) {
    router.push(`/companies?firmaSekme=${id}&firma=${id}&detay=1`);
  }

  const authorizationIsValid = hasValidAuthorization(authorizationEndDate);

  // "Süresi yaklaşan" artık Aktif'e dahil olduğu için summary.expiring
  // her zaman 0 ya da backend'in henüz ayırdığı sayı olabilir; ikisini
  // toplayınca tablo ile kart birbirini tutuyor.
  const activeCount = summary.active + summary.expiring;

  const visibleDocumentsByStatusFilter = companyId
    ? documents.filter((document) => {
        // Kapalı/İptal (INACTIVE) bir belge, /documents ile
        // /closed-documents arasındaki olası id çakışması yüzünden
        // "Süre Uzatma" ya da "Kapatma Yapılacaklar" kartlarına asla
        // dahil edilmemeli; durumu yalnızca kapalı/iptal kaynağından gelir.
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

        if (companyStatusFilter === "ACTIVE") {
          return (
            document.displayStatus === "ACTIVE" ||
            document.displayStatus === "EXPIRING"
          );
        }

        return document.status === companyStatusFilter;
      })
    : documents;

  // Sütun başlığındaki filtre kutucuklarının (Uzman / Destekleme Sınıfı /
  // Durum) seçenek listeleri; filtre uygulanmadan ÖNCEKİ veriden türetilir,
  // böylece bir filtre uygulandığında diğer sütunların seçenekleri
  // daralmaz/kaybolmaz.
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

  // Bir belgenin ekranda görünen durum rozeti. Mobil kart, masaüstü tablo,
  // Durum filtresi seçenekleri ve filtrenin kendisi hep bu fonksiyonu kullanır;
  // böylece rozet ile filtre her zaman aynı kalır.
  function getRowBadge(doc: ApiDocument): string {
    return getBadgeStatus(doc, {
      isClosureEligibleView,
      isExtensionEligibleView,
      closureEligibleIds: companyClosureEligibleIds,
      extensionEligibleIds: companyExtensionEligibleIds,
      authorizationExpired: isDocumentAuthorizationExpired(doc, {
        isCompanyDetail: Boolean(companyId),
        isAuthorizationLoading,
      }),
    });
  }

  // Satır çizerken gereken her şey tek yerden: rozet, satır anahtarı, seçili mi.
  function getRowView(doc: ApiDocument) {
    const documentKey = `${doc.status === "INACTIVE" ? "closed" : "open"}-${doc.id}`;

    return {
      badgeStatus: getRowBadge(doc),
      documentKey,
      isSelected: activeDocumentKey === documentKey,
    };
  }

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    visibleDocumentsByStatusFilter.forEach((doc) => {
      values.add(getRowBadge(doc));
    });

    // Aynı etikete sahip birden fazla değer (EXPIRED + CLOSURE_ELIGIBLE ikisi
    // de "Kapatma Yapılacak") tek seçenek olarak listelensin.
    const seenLabels = new Set<string>();
    const options: { value: string; label: string }[] = [];

    Array.from(values)
      .sort((a, b) =>
        (STATUS_LABELS[a] ?? a).localeCompare(STATUS_LABELS[b] ?? b, "tr-TR"),
      )
      .forEach((value) => {
        const label = STATUS_LABELS[value] ?? value;
        if (seenLabels.has(label)) return;
        seenLabels.add(label);
        options.push({ value, label });
      });

    return options;
    // getRowBadge her render'da yeniden oluştuğu için buradaki hesap da
    // her render'da yapılır (eskiden de öyleydi: liste her render'da yeni dizi).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDocumentsByStatusFilter, getRowBadge]);

  // Uzman / Destekleme Sınıfı / Durum filtreleri uygulanır (hepsi VE
  // mantığıyla birleştirilir; bir filtre boşsa o sütun için hiçbir
  // kısıtlama uygulanmaz).
  const visibleDocumentsFiltered = visibleDocumentsByStatusFilter.filter(
    (doc) => {
      // Firma detayında arama tarayıcıda yapılır (belge numarasına göre).
      if (companyId && debouncedSearch) {
        const query = debouncedSearch.toLocaleLowerCase("tr-TR");
        if (!doc.documentNumber?.toLocaleLowerCase("tr-TR").includes(query)) {
          return false;
        }
      }
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

      if (statusFilter.size > 0) {
        const badge = getRowBadge(doc);

        // Aynı etikete sahip farklı değerler (EXPIRED / CLOSURE_ELIGIBLE) tek
        // bir seçenek gibi davransın: eşleşmeyi label bazlı yap.
        const badgeLabel = STATUS_LABELS[badge] ?? badge;
        const selectedLabels = new Set(
          Array.from(statusFilter).map((v) => STATUS_LABELS[v] ?? v),
        );

        if (!selectedLabels.has(badgeLabel)) {
          return false;
        }
      }

      return true;
    },
  );

  // Kullanıcının seçtiği sütuna göre belge listesi sıralanır. Sıralama
  // seçilmemişse (documentSortConfig === null) filtrelenmiş liste sırası
  // olduğu gibi korunur.
  const visibleDocuments = useMemo(() => {
    if (!documentSortConfig) return visibleDocumentsFiltered;

    return [...visibleDocumentsFiltered].sort((a, b) => {
      const comparison = compareValues(
        getDocumentSortValue(a, documentSortConfig.key),
        getDocumentSortValue(b, documentSortConfig.key),
      );
      return documentSortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [visibleDocumentsFiltered, documentSortConfig]);

  const CLOSED_PAGE_SIZE = 20;

  const isClosedDocumentsView = !companyId && status === "INACTIVE";
  const isTotalDocumentsView =
    !companyId &&
    !status &&
    !isExtensionEligibleView &&
    !isClosureEligibleView &&
    !isAuthorizationRequiredView;

  const isClientPaginated = isClosedDocumentsView || isTotalDocumentsView;

  const paginatedVisibleDocuments = useMemo(() => {
    if (!isClientPaginated) {
      return visibleDocuments;
    }

    const startIndex = (currentPage - 1) * CLOSED_PAGE_SIZE;
    const endIndex = startIndex + CLOSED_PAGE_SIZE;
    return visibleDocuments.slice(startIndex, endIndex);
  }, [visibleDocuments, currentPage, isClientPaginated]);

  const displayedTotalPages = isClientPaginated
    ? Math.max(1, Math.ceil(visibleDocuments.length / CLOSED_PAGE_SIZE))
    : totalPages;

  // Belge tablosu başlıkları:
  // - `key` verilmişse sütun başlığına tıklanarak sıralanabilir.
  // - `filterType` verilmişse başlıktaki huni (funnel) ikonuyla checkbox'lı
  //   filtre açılabilir.
  // Filtre-görünümlerinde belgeler zaten tek tip, "Durum" filtresine gerek yok.
  const hideStatusFilter =
    isExtensionEligibleView ||
    isClosureEligibleView ||
    status === "INACTIVE" ||
    showCompanyExtensionEligible ||
    showCompanyClosureEligible ||
    companyStatusFilter === "INACTIVE";

  const documentHeadings: {
    label: string;
    key?: DocumentSortKey;
    filterType?: "consultant" | "supportClass" | "status";
    // Küçük ekranda (1280px altı) gizlenen, daha az kritik sütunlar
    wideOnly?: boolean;
  }[] = [
    { label: "Belge No", key: "documentNumber" },
    { label: "Firma", key: "companyName" },
    { label: "Uzman", key: "consultant", filterType: "consultant" },
    { label: "Başlangıç", key: "documentStartDate", wideOnly: true },
    { label: "Bitiş", key: "documentEndDate" },
    { label: "Süre Uzatım", key: "extensionDate" },
    { label: "Yetki Bitiş", key: "authorizationEndDate", wideOnly: true },
    {
      label: "Destek Sınıfı",
      key: "supportClass",
      filterType: "supportClass",
    },
    {
      label: "Durum",
      key: "status",
      ...(hideStatusFilter ? {} : { filterType: "status" as const }),
    },
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

  // Firma kendi belgelerini görüntülerken (COMPANY panelinde) listeye biraz
  // daha nefes payı veriliyor; admin/genel tabloda daha sıkışık kalıyor.
  const isCompanyView = variant === "company";

  // Yetkilendirme süresi dolduğunda hem mobil kart görünümünde hem de
  // masaüstü tablo görünümünde aynı uyarı kutusu gösterilir.
  const showAuthWarning =
    (Boolean(companyId) || variant === "company") &&
    documents.length === 0 &&
    !isAuthorizationLoading &&
    !authorizationIsValid;

  return (
    <div className="min-w-0 space-y-3">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-1.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200/60 bg-red-50 text-red-600 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <FileText size={17} />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
              Belgelerim
            </h1>

            <p className="mt-0.5 text-[11px] font-medium leading-5 text-muted-foreground sm:text-xs">
              Firmanıza ait tüm teşvik belgelerini ve güncel durumlarını
              görüntüleyin.
            </p>
          </div>
        </div>
      </section>

      {/* OPERASYON ÖZETİ */}
      {variant === "admin" && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div
            className={`grid grid-cols-1 divide-y divide-border min-[380px]:grid-cols-2 min-[380px]:divide-x sm:grid-cols-3 lg:divide-y-0 ${
              companyId ? "lg:grid-cols-5" : "lg:grid-cols-6"
            }`}
          >
            <OperationStat
              label="Toplam Belge"
              value={String(
                companyId
                  ? summary.total // firma detayında zaten mappedDocuments = açık + kapalı
                  : summary.total + closedDocumentCount, // admin genel: açık + kapalı toplanır
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
              valueClass="text-emerald-600 dark:text-emerald-400"
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
              valueClass="text-red-600 dark:text-red-400"
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
              valueClass="text-orange-600 dark:text-orange-400"
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
                valueClass="text-amber-600 dark:text-amber-400"
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
                valueClass="text-muted-foreground"
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
      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:rounded-2xl">
        {/* Başlık + arama */}
        <div
          className={`flex flex-col gap-2 border-b border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between ${
            isCompanyView ? "sm:p-5" : "sm:gap-2 sm:p-2.5"
          }`}
        >
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">
              {isAuthorizationRequiredView
                ? "Yetkilendirme Yapılacak Firmalar"
                : "Belge Listesi"}
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              {isAuthorizationRequiredView
                ? "Yetkisi olmayan, süresi biten veya 6 ay içinde bitecek firmalar"
                : "Belge numarası, tarih ve durum bilgileri"}
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
              placeholder={
                isAuthorizationRequiredView
                  ? "Firma adı ile ara..."
                  : "Belge numarası ile ara..."
              }
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-base text-foreground transition-all placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 sm:py-1.5 sm:pl-8 sm:pr-2.5 sm:text-xs"
            />
          </div>
        </div>
        {companyId && !isAuthorizationLoading && !authorizationIsValid && (
          <div className="flex items-center gap-2 border-b border-blue-200/60 bg-blue-50/60 px-3 py-1.5 dark:border-blue-500/20 dark:bg-blue-500/10">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300">
              <ShieldAlert size={12} strokeWidth={2} />
            </span>
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Yetkilendirme gerekli — yetki süreniz dolmuş
            </p>
          </div>
        )}

        {/* MOBİL: KART GÖRÜNÜMÜ */}
        <div className="lg:hidden">
          {isLoading ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Belgeler yükleniyor...
              </p>
            </div>
          ) : loadError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Belgeler yüklenemedi
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
            </div>
          ) : isAuthorizationRequiredView ? (
            visibleAuthorizationCompanies.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-medium text-muted-foreground">
                Yetkilendirme yapılacak firma bulunamadı.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visibleAuthorizationCompanies.map((company) => (
                  <AuthorizationCompanyCard
                    key={company.id}
                    company={company}
                    onOpen={() => openCompany(company.id)}
                  />
                ))}
              </ul>
            )
          ) : paginatedVisibleDocuments.length === 0 ? (
            <div className="px-3 py-6 text-center">
              {showAuthWarning ? (
                <AuthorizationWarning variant={variant} />
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
                const { badgeStatus, documentKey, isSelected } = getRowView(doc);

                return (
                  <DocumentCard
                    key={documentKey}
                    doc={doc}
                    badgeStatus={badgeStatus}
                    isSelected={isSelected}
                    showCompany={!companyId}
                    onOpen={() => openDocument(doc)}
                  />
                );
              })}
            </ul>
          )}
        </div>

        {/* TABLET+ : TABLO GÖRÜNÜMÜ */}
        <div className="hidden lg:block">
          <div className="max-h-[480px] w-full overflow-auto overscroll-contain">
            <table
              className="w-full table-fixed text-left text-sm"
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
                  {/* Toplam %100. Başlangıç ve Yetki Bitiş küçük ekranda gizlenir. */}
                  <col className="w-[9%]" />
                  <col className="w-[18%]" />
                  <col className="w-[11%]" />
                  <col className="hidden w-[8%] xl:table-column" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="hidden w-[8%] xl:table-column" />
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                  <col className="w-[9%]" />
                </colgroup>
              )}

              <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 text-[11px] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
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

                    const wideOnly =
                      !isAuthorizationRequiredView &&
                      (heading as { wideOnly?: boolean }).wideOnly;

                    const activeFilterCount = filterType
                      ? activeFilterCountByColumn[filterType]
                      : 0;

                    return (
                      <th
                        key={heading.label}
                        className={`relative px-2 py-2 text-center xl:whitespace-nowrap ${
                          wideOnly ? "hidden xl:table-cell" : ""
                        }`}
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
                              className="inline-flex items-center gap-1 uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
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

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <p className="text-sm font-medium text-muted-foreground">
                        Belgeler yükleniyor...
                      </p>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Belgeler yüklenemedi
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {loadError}
                      </p>
                    </td>
                  </tr>
                ) : isAuthorizationRequiredView ? (
                  visibleAuthorizationCompanies.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm font-medium text-muted-foreground"
                      >
                        Yetkilendirme yapılacak firma bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    visibleAuthorizationCompanies.map((company) => (
                      <AuthorizationCompanyRow
                        key={company.id}
                        company={company}
                        onOpen={() => openCompany(company.id)}
                      />
                    ))
                  )
                ) : paginatedVisibleDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      {showAuthWarning ? (
                        <AuthorizationWarning variant={variant} />
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
                    const { badgeStatus, documentKey, isSelected } = getRowView(doc);

                    return (
                      <DocumentRow
                        key={documentKey}
                        doc={doc}
                        badgeStatus={badgeStatus}
                        isSelected={isSelected}
                        onOpen={() => openDocument(doc)}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SAYFALAMA */}
        <div
          className={`flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between ${
            isCompanyView ? "bg-muted/30 sm:p-4" : "sm:px-3 sm:py-2"
          }`}
        >
          <p className="text-xs font-medium text-muted-foreground">
            Sayfa {currentPage} / {displayedTotalPages}
          </p>

          <div className="flex w-full gap-1.5 min-[380px]:w-auto">
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

      {openDocuments.length > 0 && (
        <DocumentTabsPanel
          tabs={openDocuments}
          activeKey={activeDocumentKey}
          variant={variant}
          sectionRef={documentTabsRef}
          onActivate={setActiveDocumentKey}
          onClose={handleCloseDocument}
        />
      )}
    </div>
  );
}