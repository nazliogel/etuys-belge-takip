export type SelectedDocument = {
  id: string;
  documentNumber: string | null;
};

const DOCUMENT_ID_KEY = "etuys-selected-document-id";
const DOCUMENT_NUMBER_KEY = "etuys-selected-document-number";

export function setSelectedDocument(
  documentId: string,
  documentNumber: string | null,
) {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(DOCUMENT_ID_KEY, documentId);

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

  return {
    id,
    documentNumber: sessionStorage.getItem(DOCUMENT_NUMBER_KEY),
  };
}

export function clearSelectedDocument() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(DOCUMENT_ID_KEY);
  sessionStorage.removeItem(DOCUMENT_NUMBER_KEY);
}
