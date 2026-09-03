"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

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

interface AdminDocumentSpecialConditionsProps {
  documentId: string;
  isClosed?: boolean;
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export function AdminDocumentSpecialConditions({
  documentId,
  isClosed = false,
}: AdminDocumentSpecialConditionsProps) {
  const [conditions, setConditions] = useState<SpecialCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConditions = async () => {
      try {
        setLoading(true);
        setError(null);

        const endpoint = isClosed
          ? `/closed-documents/${documentId}/special-conditions`
          : `/documents/${documentId}/special-conditions`;

        const response = await apiFetch<SpecialConditionsResponse>(endpoint);

        setConditions(response.data.items ?? []);
      } catch (err) {
        console.error("Özel şartlar alınamadı:", err);

        setConditions([]);

        setError(
          err instanceof Error
            ? err.message
            : "Özel şartlar alınırken bir hata oluştu.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadConditions();
  }, [documentId, isClosed]);

  if (loading) {
    return (
      <section className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />

          <span className="text-xs text-slate-500">
            Özel şartlar yükleniyor...
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
              Özel şartlar alınamadı
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
              Özel Şartlar
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Belge kapsamında uygulanan özel şartlar ve açıklamaları
            </p>
          </div>

          {conditions.length > 0 && (
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {conditions.length} Şart
            </span>
          )}
        </div>

        {conditions.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-xs font-medium text-slate-700">
              Kayıt bulunamadı
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              Bu belgeye ait özel şart mevcut değil.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="w-[28%] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Özel Şart
                  </th>

                  <th className="w-[72%] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Açıklama
                  </th>
                </tr>
              </thead>

              <tbody>
                {conditions.map((condition, index) => (
                  <tr
                    key={condition.id}
                    className={`border-t border-slate-100 align-top transition-colors hover:bg-slate-50 ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    {/* ÖZEL ŞART */}
                    <td className="px-4 py-2.5 align-top">
                      {displayValue(condition.conditionName) === "-" ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className="block break-words text-xs font-semibold leading-5 text-slate-900">
                          {condition.conditionName}
                        </span>
                      )}
                    </td>

                    {/* AÇIKLAMA */}
                    <td className="px-4 py-2.5 align-top">
                      {displayValue(condition.description) === "-" ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <p className="break-words whitespace-pre-line text-xs leading-5 text-slate-600">
                          {condition.description}
                        </p>
                      )}
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
