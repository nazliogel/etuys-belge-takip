export type CompanyListQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
};

export type UpdateCompanyInput = {
  processStatus?: string;
  consultant?: string | null;
  isActive?: boolean;
};

export type CompanyListItem = {
  id: number;
  externalCompanyId: number;
  name: string;
  taxNumber: string;
  processStatus: string | null;
  consultant: string | null;
  isActive: boolean;
  authorizationEndDate: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CompanyDetail = CompanyListItem & {
  documents: {
    id: number;
    externalDocumentId: number;
    documentNumber: string | null;
    documentStartDate: string | null;
    documentEndDate: string | null;
    extensionDate: string | null;
    supportClass: string | null;
    status: "OPEN" | "CLOSED" | "CANCELLED";
    isActive: boolean;
  }[];
};

export type CompanyListResponse = {
  items: CompanyListItem[];
  totalCount: number;
};
