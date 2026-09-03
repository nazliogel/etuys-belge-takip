"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

type SupportElement = {
  id: number;
  supportType: string | null;
  supportTypeCode: string | null;
  supportRate: string | null;
  supportRateCode: string | null;
  supportDescription: string | null;
};

type SupportElementsResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    items: SupportElement[];
  };
};

interface AdminDocumentSupportElementsProps {
  documentId: string;
  isClosed?: boolean;
}

function displayValue(value: string | null | undefined) {
  if (value === null || value === undefined || value.trim() === "") {
    return "—";
  }

  return value;
}

export function AdminDocumentSupportElements({
  documentId,
  isClosed = false,
}: AdminDocumentSupportElementsProps) {
  const [supports, setSupports] = useState<SupportElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSupports = async () => {
      try {
        setLoading(true);
        setError(null);

        const endpoint = isClosed
          ? `/closed-documents/${documentId}/supports`
          : `/documents/${documentId}/supports`;

        const response = await apiFetch<SupportElementsResponse>(endpoint);

        setSupports(response.data.items ?? []);
      } catch (err) {
        console.error("Destek unsurları alınamadı:", err);

        setSupports([]);

        setError(
          err instanceof Error
            ? err.message
            : "Destek unsurları alınırken bir hata oluştu.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadSupports();
  }, [documentId, isClosed]);

  if (loading) {
    return (
      <section className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />

          <span className="text-xs text-slate-500">
            Destek unsurları yükleniyor...
          </span>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />

          <div>
            <p className="text-[11px] font-semibold text-red-700">
              Destek unsurları alınamadı
            </p>

            <p className="mt-0.5 text-[11px] text-red-600">{error}</p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* BAŞLIK */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-4 py-2.5">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900">
              Destek Unsurları
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Belge kapsamında tanımlanan destek türleri ve oran bilgileri
            </p>
          </div>

          {supports.length > 0 && (
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {supports.length} Destek
            </span>
          )}
        </div>

        {supports.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-xs font-medium text-slate-700">
              Kayıt bulunamadı
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              Bu belgeye ait destek unsuru mevcut değil.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="w-1/4 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Destek Unsuru
                  </th>

                  <th className="w-1/4 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Kod Bilgileri
                  </th>

                  <th className="w-1/4 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Oran
                  </th>

                  <th className="w-1/4 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Açıklama
                  </th>
                </tr>
              </thead>

              <tbody>
                {supports.map((support, index) => (
                  <tr
                    key={support.id}
                    className={`border-t border-slate-100 align-top transition-colors hover:bg-slate-50 ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    {/* DESTEK UNSURU */}
                    <td className="w-1/4 px-4 py-2.5 align-middle">
                      <span className="block break-words text-xs font-semibold text-slate-900">
                        {displayValue(support.supportType)}
                      </span>
                    </td>

                    {/* KOD BİLGİLERİ */}
                    <td className="w-1/4 px-4 py-2.5 align-middle">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">
                            Destek:
                          </span>

                          <span className="font-mono text-[11px] font-medium text-slate-700">
                            {displayValue(support.supportTypeCode)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">
                            Oran:
                          </span>

                          <span className="font-mono text-[11px] font-medium text-slate-700">
                            {displayValue(support.supportRateCode)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ORAN */}
                    <td className="w-1/4 px-4 py-2.5 align-middle">
                      <span className="text-xs font-semibold text-slate-700">
                        {displayValue(support.supportRate)}
                      </span>
                    </td>

                    {/* AÇIKLAMA */}
                    <td className="w-1/4 px-4 py-2.5 align-middle">
                      <p className="break-words whitespace-pre-line text-xs leading-5 text-slate-600">
                        {displayValue(support.supportDescription)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
