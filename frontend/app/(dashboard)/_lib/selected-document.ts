export type SelectedDocumentStatus = "OPEN" | "CLOSED" | "CANCELLED";

export type SelectedDocument = {
  id: string;
  documentNumber: string | null;
  status: SelectedDocumentStatus;
};

const DOCUMENT_ID_KEY = "etuys-selected-document-id";
const DOCUMENT_NUMBER_KEY = "etuys-selected-document-number";
const DOCUMENT_STATUS_KEY = "etuys-selected-document-status";

export function setSelectedDocument(
  documentId: string,
  documentNumber: string | null,
  status: SelectedDocumentStatus = "OPEN",
) {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(DOCUMENT_ID_KEY, documentId);
  sessionStorage.setItem(DOCUMENT_STATUS_KEY, status);

  if (documentNumber) {
    sessionStorage.setItem(DOCUMENT_NUMBER_KEY, documentNumber);
  } else {
    sessionStorage.removeItem(DOCUMENT_NUMBER_KEY);
  }
}

export function getSelectedDocument(): SelectedDocument | null {
  if (typeof window === "undefined") return null;

  const id = sessionStorage.getItem(DOCUMENT_ID_KEY);

  if (!id) {
    return null;
  }

  const storedStatus = sessionStorage.getItem(DOCUMENT_STATUS_KEY);

  const status: SelectedDocumentStatus =
    storedStatus === "CLOSED" || storedStatus === "CANCELLED"
      ? storedStatus
      : "OPEN";

  return {
    id,
    documentNumber: sessionStorage.getItem(DOCUMENT_NUMBER_KEY),
    status,
  };
}

export function clearSelectedDocument() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(DOCUMENT_ID_KEY);
  sessionStorage.removeItem(DOCUMENT_NUMBER_KEY);
  sessionStorage.removeItem(DOCUMENT_STATUS_KEY);
}
