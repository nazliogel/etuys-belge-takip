// src/services/closure-application.ts
//
// Firmanın "Gönderilmiş Talep Listesi"ndeki Belge Kapatma Başvurularından,
// bir belge için geçerli (reddedilmemiş) başvuru olup olmadığını bulur.

type ClosureRequestRow = {
  companyId: number;
  externalDocumentId: number | null;
  documentNumber: string | null;
  requestStatus: string | null;
};

type DocumentKey = {
  companyId: number;
  externalDocumentId: number;
  documentNumber: string | null;
};

const REJECTED_MARKERS = ["reddedil"];

function isRejected(status: string | null): boolean {
  const normalized = (status ?? "").toLocaleLowerCase("tr-TR");
  return REJECTED_MARKERS.some((marker) => normalized.includes(marker));
}

function normalizeNumber(value: string | null | undefined): string | null {
  return value?.trim().toLocaleLowerCase("tr-TR") || null;
}



export function createClosureApplicationLookup(requests: ClosureRequestRow[]) {
  return (document: DocumentKey): boolean => {
    const documentNumber = normalizeNumber(document.documentNumber);

    const latestRequest = requests.find((request) => {
      if (request.companyId !== document.companyId) return false;

      if (request.externalDocumentId !== null) {
        return request.externalDocumentId === document.externalDocumentId;
      }

      return (
        documentNumber !== null &&
        normalizeNumber(request.documentNumber) === documentNumber
      );
    });

    return latestRequest !== undefined &&
      !isRejected(latestRequest.requestStatus);
  };
}