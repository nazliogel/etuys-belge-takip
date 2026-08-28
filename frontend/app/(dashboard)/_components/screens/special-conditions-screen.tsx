"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";

type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  isActive: boolean;
};

type DocumentsResponse = {
  success: boolean;
  data: {
    items: ApiDocument[];
  };
};

type SpecialCondition = {
  id: number;
  conditionName: string | null;
  description: string | null;
};

type SpecialConditionsResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    items: SpecialCondition[];
  };
};

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export function SpecialConditionsScreen() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );

  const [conditions, setConditions] = useState<SpecialCondition[]>([]);

  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [loadingConditions, setLoadingConditions] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoadingDocuments(true);
        setError(null);

        const response = await apiFetch<DocumentsResponse>(
          "/documents?isActive=true",
        );

        const items = response.data.items ?? [];

        setDocuments(items);

        if (items.length === 1) {
          setSelectedDocumentId(items[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Belgeler alınırken bir hata oluştu.",
        );
      } finally {
        setLoadingDocuments(false);
      }
    };

    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setConditions([]);
      return;
    }

    const loadConditions = async () => {
      try {
        setLoadingConditions(true);
        setError(null);

        const response = await apiFetch<SpecialConditionsResponse>(
          `/documents/${selectedDocumentId}/special-conditions`,
        );

        setConditions(response.data.items ?? []);
      } catch (err) {
        setConditions([]);

        setError(
          err instanceof Error
            ? err.message
            : "Özel şartlar alınırken bir hata oluştu.",
        );
      } finally {
        setLoadingConditions(false);
      }
    };

    void loadConditions();
  }, [selectedDocumentId]);

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Özel Şartlar</h1>

        <p className="mt-1 text-sm text-slate-500">
          Yatırım teşvik belgesine ait özel şartları görüntüleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Belge
        </label>

        {loadingDocuments ? (
          <div className="text-sm text-slate-500">Belgeler yükleniyor...</div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-slate-500">
            Aktif teşvik belgesi bulunamadı.
          </div>
        ) : (
          <select
            value={selectedDocumentId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedDocumentId(value ? Number(value) : null);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            {documents.length > 1 && <option value="">Belge seçiniz</option>}

            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.documentNumber
                  ? `Belge No: ${document.documentNumber}`
                  : `Belge ID: ${document.externalDocumentId}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!selectedDocumentId && documents.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Özel şartları görüntülemek için belge seçiniz.
        </div>
      )}

      {selectedDocumentId && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Özel Şartlar Listesi
            </h2>
          </div>

          {loadingConditions ? (
            <div className="p-6 text-sm text-slate-500">
              Özel şartlar yükleniyor...
            </div>
          ) : conditions.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Bu belgeye ait özel şart bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Özel Şart</th>
                    <th className="px-4 py-3">Açıklama</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {conditions.map((condition) => (
                    <tr key={condition.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {displayValue(condition.conditionName)}
                      </td>

                      <td className="px-4 py-3">
                        {displayValue(condition.description)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
