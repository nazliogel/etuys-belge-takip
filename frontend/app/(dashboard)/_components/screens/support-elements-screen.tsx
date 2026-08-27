"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
};

type DocumentsResponse = {
  success: boolean;
  data: {
    items: ApiDocument[];
  };
};

type SupportItem = {
  id: number;
  supportType: string | null;
  supportTypeCode: string | null;
  supportRate: string | null;
  supportRateCode: string | null;
  supportDescription: string | null;
};

type SupportsResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    items: SupportItem[];
  };
};

export function SupportsScreen() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [supports, setSupports] = useState<SupportItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [supportsLoading, setSupportsLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await apiFetch<DocumentsResponse>(
          "/documents?isActive=true",
        );

        const items = response.data.items;

        setDocuments(items);

        if (items.length === 1) {
          setSelectedDocumentId(String(items[0].id));
        }
      } catch (error) {
        console.error("Aktif belgeler alınamadı:", error);
      } finally {
        setDocumentsLoading(false);
      }
    };

    void fetchDocuments();
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setSupports([]);
      return;
    }

    const fetchSupports = async () => {
      try {
        setSupportsLoading(true);

        const response = await apiFetch<SupportsResponse>(
          `/documents/${selectedDocumentId}/supports`,
        );

        setSupports(response.data.items);
      } catch (error) {
        console.error("Destek unsurları alınamadı:", error);
        setSupports([]);
      } finally {
        setSupportsLoading(false);
      }
    };

    void fetchSupports();
  }, [selectedDocumentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Destek Unsurları
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Teşvik belgesine ait destek unsurlarını görüntüleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Destek Unsurları Listesi
            </h2>

            <p className="text-sm text-slate-500">
              Seçili belgeye ait destek bilgileri burada görüntülenecek.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Belge
          </label>

          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.target.value)}
            disabled={documentsLoading || documents.length === 0}
          >
            <option value="" disabled>
              {documentsLoading
                ? "Belgeler yükleniyor..."
                : documents.length === 0
                  ? "Aktif belge bulunamadı"
                  : "Belge seçiniz"}
            </option>

            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.documentNumber ??
                  `Belge ${document.externalDocumentId}`}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Destek Türü</th>
                <th className="px-4 py-3 font-medium">Destek Türü Kodu</th>
                <th className="px-4 py-3 font-medium">Destek Oranı</th>
                <th className="px-4 py-3 font-medium">Destek Oranı Kodu</th>
                <th className="px-4 py-3 font-medium">Açıklama</th>
              </tr>
            </thead>

            <tbody>
              {!selectedDocumentId ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Önce bir belge seçiniz.
                  </td>
                </tr>
              ) : supportsLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Destek unsurları yükleniyor...
                  </td>
                </tr>
              ) : supports.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Bu belgeye ait destek unsuru bulunamadı.
                  </td>
                </tr>
              ) : (
                supports.map((support) => (
                  <tr
                    key={support.id}
                    className="border-b border-slate-100 text-slate-700"
                  >
                    <td className="px-4 py-3">{support.supportType ?? "-"}</td>
                    <td className="px-4 py-3">
                      {support.supportTypeCode ?? "-"}
                    </td>
                    <td className="px-4 py-3">{support.supportRate ?? "-"}</td>
                    <td className="px-4 py-3">
                      {support.supportRateCode ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {support.supportDescription ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
