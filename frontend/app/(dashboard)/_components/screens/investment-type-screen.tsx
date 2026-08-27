"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  isActive: boolean;
};

type DocumentsResponse = {
  success: boolean;
  data: {
    items: ApiDocument[];
  };
};

type DocumentDetailResponse = {
  success: boolean;
  data: {
    id: number;
    investmentType: string | null;
  };
};

export function InvestmentTypeScreen() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [loading, setLoading] = useState(true);

  const [investmentType, setInvestmentType] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await apiFetch<DocumentsResponse>(
          "/documents?isActive=true",
        );

        const items = response.data.items;

        setDocuments(items);

        // Tek aktif belge varsa otomatik seç.
        if (items.length === 1) {
          setSelectedDocumentId(String(items[0].id));
        }
      } catch (error) {
        console.error("Aktif belgeler alınamadı:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchDocuments();
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setInvestmentType(null);
      return;
    }

    const fetchDocumentDetail = async () => {
      try {
        setDetailLoading(true);

        const response = await apiFetch<DocumentDetailResponse>(
          `/documents/${selectedDocumentId}`,
        );

        setInvestmentType(response.data.investmentType);
      } catch (error) {
        console.error("Yatırım cinsi alınamadı:", error);
        setInvestmentType(null);
      } finally {
        setDetailLoading(false);
      }
    };

    void fetchDocumentDetail();
  }, [selectedDocumentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Yatırım Cinsi</h1>

        <p className="mt-1 text-sm text-slate-500">
          Teşvik belgelerinize ait yatırım cinsi bilgilerini
          görüntüleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <FileText className="h-5 w-5 text-slate-600" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Belge Seçimi</h2>

            <p className="text-sm text-slate-500">
              Görüntülemek istediğiniz açık belgeyi seçin.
            </p>
          </div>
        </div>

        <select
          className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          value={selectedDocumentId}
          onChange={(event) => setSelectedDocumentId(event.target.value)}
          disabled={loading || documents.length === 0}
        >
          <option value="" disabled>
            {loading
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Yatırım Cinsi Bilgisi
        </h2>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <span className="text-sm font-medium text-slate-500">
              Yatırım Cinsi
            </span>

            <span className="text-sm font-medium text-slate-900">
              {!selectedDocumentId
                ? "Önce bir belge seçiniz."
                : detailLoading
                  ? "Yükleniyor..."
                  : (investmentType ?? "Yatırım cinsi bilgisi bulunamadı.")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
