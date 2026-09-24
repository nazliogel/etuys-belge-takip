// Belgeler ekranının yardımcı fonksiyonları (JSX içermez).

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  ApiDocument,
  AuthorizationRequiredCompany,
  AuthSortKey,
  ClosedApiDocument,
  ClosedDocumentListResponse,
  DocumentListResponse,
  DocumentSortKey,
  DocumentStatus,
  SortConfig,
} from "./types";

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Tarih sütunları: sıralama "bugüne en yakın -> en uzak" mantığıyla çalışır.
export const DATE_SORT_KEYS: ReadonlySet<DocumentSortKey> = new Set([
  "documentStartDate",
  "documentEndDate",
  "extensionDate",
  "authorizationEndDate",
]);

export function toggleSort<K extends string>(
  current: SortConfig<K>,
  key: K,
): SortConfig<K> {
  if (current?.key === key) {
    // asc -> desc -> sıralama yok
    return current.direction === "asc" ? { key, direction: "desc" } : null;
  }
  return { key, direction: "asc" };
}

export function compareValues(valueA: unknown, valueB: unknown): number {
  if (typeof valueA === "number" && typeof valueB === "number") {
    return valueA - valueB;
  }
  return String(valueA ?? "").localeCompare(String(valueB ?? ""), "tr-TR");
}

// Durum değerlerinin Türkçe etiketleri (filtre listesi ve sıralamada kullanılıyor).
export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  EXPIRED: "Kapatma Yapılacak",
  CLOSED: "Kapalı",
  CANCELLED: "İptal",
  INACTIVE: "Kapalı-İptal",
  EXTENSION_ELIGIBLE: "Uzatma Yapılabilir",
  CLOSURE_ELIGIBLE: "Kapatma Yapılacak",
  AUTHORIZATION_EXPIRED: "Yetkisi Bitmiş",
};
// `extraParams` ile (ör. search) filtrelenmiş kapalı/iptal belgelerin
// TÜMÜ, sayfa sayfa gezilerek tek dizide toplanır. Böylece "İptal" gibi bir
// filtre uygulandığında sadece o an ekranda olan 20 kayıt değil, eşleşen
// TÜM kayıtlar arasında arama/filtreleme/sıralama yapılabilir.
export async function fetchAllClosedDocuments(
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
export async function fetchAllDocuments(baseParams: URLSearchParams): Promise<{
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
export function formatDate(date: string | null): string {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR").format(parsedDate);
}
export function hasValidAuthorization(authorizationEndDate: string | null): boolean {
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

// Belgenin firmasının yetkisi dolmuş mu? Kapalı/iptal belgelerde yetki
// önemsiz olduğu için her zaman false döner. Firma detayında yetki bilgisi
// ayrı bir istekle geldiği için, o istek bitene kadar "dolmuş" denmez
// (ekranda anlık yanıp sönmeyi önler).
export function isDocumentAuthorizationExpired(
  doc: ApiDocument,
  opts: { isCompanyDetail: boolean; isAuthorizationLoading: boolean },
): boolean {
  if (doc.documentStatus === "CLOSED" || doc.documentStatus === "CANCELLED") {
    return false;
  }

  if (opts.isCompanyDetail && opts.isAuthorizationLoading) {
    return false;
  }

  return !hasValidAuthorization(doc.company?.authorizationEndDate ?? null);
}

export function calculateDocumentStatus(document: {
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
export function getDisplayStatus(doc: ApiDocument): string {
  return doc.status === "INACTIVE"
    ? (doc.documentStatus ?? "INACTIVE")
    : doc.status;
}

export function getBadgeStatus(
  doc: ApiDocument,
  opts: {
    isClosureEligibleView: boolean;
    isExtensionEligibleView: boolean;
    closureEligibleIds: Set<number>;
    extensionEligibleIds: Set<number>;
    authorizationExpired: boolean;
  },
): string {
  const isClosedOrCancelled =
    doc.documentStatus === "CLOSED" || doc.documentStatus === "CANCELLED";

  if (isClosedOrCancelled) return getDisplayStatus(doc);

  // Backend hazır durum gönderdiyse tek doğru kaynak odur.
  if (doc.displayStatus) {
    if (doc.displayStatus === "INACTIVE") return getDisplayStatus(doc);
    if (doc.displayStatus === "EXPIRING") return "ACTIVE"; // ekranda "Aktif" gösteriliyor
    return doc.displayStatus;
  }

  // displayStatus gelmeyen kaynaklar (firma detayı, uzatma/kapatma listeleri)
  if (opts.authorizationExpired) return "AUTHORIZATION_EXPIRED";
  if (opts.isClosureEligibleView || opts.closureEligibleIds.has(doc.id))
    return "CLOSURE_ELIGIBLE";
  if (opts.isExtensionEligibleView || opts.extensionEligibleIds.has(doc.id))
    return "EXTENSION_ELIGIBLE";
  return getDisplayStatus(doc);
}

// Belge tablosu satırından, verilen sütun anahtarına göre karşılaştırılabilir
// bir değer üretir (string ya da number). Tarih sütunlarında değer, bugüne
// olan MUTLAK uzaklık (ms) olarak döner; böylece "asc" yönü bugüne en yakın
// tarihi en üste, "desc" yönü en uzak tarihi en üste getirir.
export function getDocumentSortValue(
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
    case "status": {
      // Ekranda görünen rozete göre sırala.
      const value =
        doc.displayStatus === "EXPIRING"
          ? "ACTIVE"
          : doc.displayStatus && doc.displayStatus !== "INACTIVE"
            ? doc.displayStatus
            : getDisplayStatus(doc);
      return STATUS_LABELS[value] ?? value;
    }
    default:
      return "";
  }
}

export function getAuthSortValue(
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

/* ---------- Belge detay ekranları için ortak durum ---------- */

export type DocumentStatusKey =
  | "CANCELLED"
  | "CLOSED"
  | "AUTHORIZATION_EXPIRED"
  | "CLOSURE_ELIGIBLE"
  | "EXTENSION_ELIGIBLE"
  | "EXPIRED"
  | "ACTIVE";

// Rozet rengi: her ekran bu tonu kendi stiline çevirir.
export type StatusTone = "green" | "amber" | "red" | "blue";

const STATUS_TONES: Record<DocumentStatusKey, StatusTone> = {
  CANCELLED: "red",
  CLOSED: "blue",
  AUTHORIZATION_EXPIRED: "blue",
  CLOSURE_ELIGIBLE: "red",
  EXTENSION_ELIGIBLE: "amber",
  EXPIRED: "red",
  ACTIVE: "green",
};

// Tek bir belgenin durumu (detay ekranı ve admin künye ekranı ortak kullanır).
// Açık belgelerde backend'in hesapladığı displayStatus esas alınır; kapalı
// belgeler ayrı endpoint'ten geldiği için status/isActive'e bakılır.
// Süresi yaklaşan (EXPIRING) belgeler, listedeki gibi "Aktif" görünür.
export function getDocumentStatusInfo(document: {
  status?: string;
  displayStatus?: string;
  isActive?: boolean;
}): { key: DocumentStatusKey; label: string; tone: StatusTone } {
  let key: DocumentStatusKey;

  if (
    document.status === "CANCELLED" ||
    document.displayStatus === "CANCELLED"
  ) {
    key = "CANCELLED";
  } else if (
    document.status === "CLOSED" ||
    document.displayStatus === "CLOSED" ||
    document.displayStatus === "INACTIVE" ||
    document.isActive === false
  ) {
    key = "CLOSED";
  } else if (
    document.displayStatus === "AUTHORIZATION_EXPIRED" ||
    document.displayStatus === "CLOSURE_ELIGIBLE" ||
    document.displayStatus === "EXTENSION_ELIGIBLE" ||
    document.displayStatus === "EXPIRED"
  ) {
    key = document.displayStatus;
  } else {
    key = "ACTIVE";
  }

  return { key, label: STATUS_LABELS[key], tone: STATUS_TONES[key] };
}