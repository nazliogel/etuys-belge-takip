export interface CompareField {
  oldField: string;
  newField: string;
}

export const COMPANY_FIELDS: CompareField[] = [
  {
    oldField: "name",
    newField: "companyName",
  },
  {
    oldField: "taxNumber",
    newField: "taxNumber",
  },
  {
    oldField: "processStatus",
    newField: "processStatus",
  },
];

export const AUTHORIZATION_FIELDS: CompareField[] = [
  {
    oldField: "authorizationEndDate",
    newField: "authorizationEndDate",
  },
];

export const DOCUMENT_FIELDS: CompareField[] = [
  {
    oldField: "documentNumber",
    newField: "documentNumber",
  },
  {
    oldField: "documentStartDate",
    newField: "documentStartDate",
  },
  {
    oldField: "documentEndDate",
    newField: "documentEndDate",
  },
  {
    oldField: "extensionDate",
    newField: "extensionDate",
  },
  {
    oldField: "supportClass",
    newField: "supportClass",
  },
];
