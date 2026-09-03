"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api";

interface AdminDocumentInvestmentTypeProps {
  documentId: string;
  isClosed?: boolean;
}

type DocumentDetailResponse = {
  success: boolean;
  data: {
    id: number;
    documentNumber?: string | null;
    investmentType: string | null;
  };
};

export function AdminDocumentInvestmentType({
  documentId,
  isClosed = false,
}: AdminDocumentInvestmentTypeProps) {
  const [investmentType, setInvestmentType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadInvestmentType() {
      setIsLoading(true);
      setLoadError("");

      try {
        const endpoint = isClosed
          ? `/closed-documents/${documentId}`
          : `/documents/${documentId}`;

        const response = await apiFetch<DocumentDetailResponse>(endpoint);

        setInvestmentType(response.data.investmentType);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Yatırım cinsi bilgisi alınamadı.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInvestmentType();
  }, [documentId, isClosed]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Yatırım Cinsi
        </h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 px-6 py-12">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />

          <span className="text-sm text-slate-500">
            Yatırım cinsi yükleniyor...
          </span>
        </div>
      ) : loadError ? (
        <div className="px-6 py-8">
          <p className="text-sm font-medium text-red-600">{loadError}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody>
              <tr>
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                  {investmentType ?? (
                    <span className="font-normal italic text-slate-400">
                      Kayıt bulunamadı
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
