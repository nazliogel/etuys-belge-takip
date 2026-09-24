// Belgeler ekranında kullanılan tüm tipler.

export type DocumentStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "INACTIVE";

export type BackendDisplayStatus =
  | "CLOSED"
  | "CANCELLED"
  | "INACTIVE"
  | "AUTHORIZATION_EXPIRED"
  | "CLOSURE_ELIGIBLE"
  | "EXTENSION_ELIGIBLE"
  | "EXPIRED"
  | "EXPIRING"
  | "ACTIVE";

export type StoredDocumentStatus = "OPEN" | "CLOSED" | "CANCELLED";

/* ---------- Sıralama ---------- */

export type SortDirection = "asc" | "desc";

// Belge tablosu için sıralanabilir sütunlar
export type DocumentSortKey =
  | "documentNumber"
  | "companyName"
  | "consultant"
  | "documentStartDate"
  | "documentEndDate"
  | "extensionDate"
  | "authorizationEndDate"
  | "supportClass"
  | "status";

// Yetkilendirme tablosu için sıralanabilir sütunlar
export type AuthSortKey =
  | "externalCompanyId"
  | "name"
  | "taxNumber"
  | "consultant"
  | "authorizationEndDate"
  | "authorizationStatus";

export type SortConfig<K extends string> = {
  key: K;
  direction: SortDirection;
} | null;

/* ---------- Belge ---------- */

export type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  extensionDate: string | null;
  supportClass: string | null;
  isActive: boolean;
  status: DocumentStatus;
  displayStatus?: BackendDisplayStatus;
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

export type OpenDocumentTab = {
  key: string;
  id: string;
  documentNumber: string | null;
  isClosed: boolean;
};

/* ---------- API cevapları ---------- */

export type AuthMeResponse = {
  user: {
    id: number;
    role: "ADMIN" | "COMPANY";
    companyId: number | null;
  };
};

export type CompanyDetailResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    externalCompanyId: number;
    name: string;
    taxNumber: string;
    consultant: string | null;
    authorizationEndDate: string | null;
  };
};

export type DocumentListResponse = {
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
      extensionEligible?: number;
      closureEligible?: number;
      authorizationExpired?: number;
    };
  };
};

// Kapalı/iptal tablosundan gelen tek bir belge
export type ClosedApiDocument = Omit<
  ApiDocument,
  "status" | "isActive" | "documentStatus"
> & {
  status: "CLOSED" | "CANCELLED";
  isActive?: boolean;
};

export type ClosedDocumentListResponse = {
  success: boolean;
  message: string;
  data: {
    items: ClosedApiDocument[];
    totalCount: number;
  };
};
// Uzatma ve kapatma listeleri aynı cevap yapısını kullanıyor.
export type ExtensionEligibleResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiDocument[];
    totalCount: number;
  };
};

/* ---------- Yetkilendirme ---------- */

export type AuthorizationStatus = "MISSING" | "EXPIRED" | "EXPIRING";

export type AuthorizationRequiredCompany = {
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

export type AuthorizationRequiredResponse = {
  success: boolean;
  message: string;
  data: {
    items: AuthorizationRequiredCompany[];
    totalCount: number;
  };
};

/* ---------- Ekran props ---------- */

export interface DocumentsScreenProps {
  companyId?: string;
  selectedDocumentId?: string | null;
  variant?: "admin" | "company";
  onSelectDocument?: (
    documentId: string,
    documentNumber: string | null,
  ) => void;
}
