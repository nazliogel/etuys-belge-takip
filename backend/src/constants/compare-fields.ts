import type { EntityType } from "../generated/prisma/client.js";

export interface CompareFieldDefinition {
  fieldName: string;
  label: string;
}

export interface CompareEntityDefinition {
  entityType: EntityType;
  fields: CompareFieldDefinition[];
}

export const COMPANY_COMPARE_FIELDS: CompareFieldDefinition[] = [
  {
    fieldName: "name",
    label: "Firma Adı",
  },
  {
    fieldName: "taxNumber",
    label: "Vergi Numarası",
  },
  {
    fieldName: "processStatus",
    label: "İşlem Durumu",
  },
];

export const AUTHORIZATION_COMPARE_FIELDS: CompareFieldDefinition[] = [
  {
    fieldName: "authorizationEndDate",
    label: "Yetki Bitiş Tarihi",
  },
];

export const DOCUMENT_COMPARE_FIELDS: CompareFieldDefinition[] = [
  {
    fieldName: "documentNumber",
    label: "Belge No",
  },
  {
    fieldName: "documentStartDate",
    label: "Belge Başlangıç Tarihi",
  },
  {
    fieldName: "documentEndDate",
    label: "Belge Bitiş Tarihi",
  },
  {
    fieldName: "extensionDate",
    label: "Süre Uzatım Tarihi",
  },
  {
    fieldName: "supportClass",
    label: "Destekleme Sınıfı",
  },
];

export const COMPARE_ENTITIES: CompareEntityDefinition[] = [
  {
    entityType: "COMPANY",
    fields: COMPANY_COMPARE_FIELDS,
  },
  {
    entityType: "COMPANY_AUTHORIZATION",
    fields: AUTHORIZATION_COMPARE_FIELDS,
  },
  {
    entityType: "INCENTIVE_DOCUMENT",
    fields: DOCUMENT_COMPARE_FIELDS,
  },
];
