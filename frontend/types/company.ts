// types/company.ts
// Bu tipler backend/prisma/schema.prisma ile birebir uyumlu olacak şekilde
// tutulmalı. Arkadaşınız schema'yı değiştirdiğinde bu dosya da güncellenmeli.

export type UserRole = "ADMIN" | "COMPANY"; // Prisma enum ile birebir aynı case

export interface Company {
  id: number;
  externalCompanyId: number;
  name: string;
  taxNumber: string;
  processStatus: string | null;
  isActive: boolean;
  createdAt: string; // ISO date string (API'den JSON olarak böyle gelir)
  updatedAt: string;
}

export interface CompanyAuthorization {
  id: number;
  companyId: number;
  authorizationEndDate: string | null; // "YYYY-MM-DD" (Prisma @db.Date)
}

export interface IncentiveDocument {
  id: number;
  companyId: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  extensionDate: string | null;
  supportClass: string | null;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  isActive: boolean;
}

export type ChangeEntityType =
  | "COMPANY"
  | "COMPANY_AUTHORIZATION"
  | "INCENTIVE_DOCUMENT";

export interface ChangeHistoryEntry {
  id: number;
  entityType: ChangeEntityType;
  entityId: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  source: "EXCEL_IMPORT" | "MANUAL_UPDATE" | "SYSTEM";
  changedAt: string;
}

export type NotificationType =
  | "AUTHORIZATION_EXPIRING"
  | "AUTHORIZATION_EXPIRED"
  | "DOCUMENT_EXPIRING"
  | "DOCUMENT_EXPIRED"
  | "EXTENSION_EXPIRING"
  | "IMPORT_WAITING_APPROVAL"
  | "IMPORT_COMPLETED"
  | "SYSTEM";

export interface AppNotification {
  id: number;
  title: string;
  description: string;
  type: NotificationType;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
