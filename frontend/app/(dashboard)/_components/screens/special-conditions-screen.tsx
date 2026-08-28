"use client";

import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getSelectedDocument } from "@/app/(dashboard)/_lib/selected-document";

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
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [conditions, setConditions] = useState<SpecialCondition[]>([]);
  const [loadingConditions, setLoadingConditions] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const documentIdFromUrl = searchParams.get("documentId");
    const storedDocument = getSelectedDocument();

    const documentId = documentIdFromUrl ?? storedDocument?.id ?? "";

    setSelectedDocumentId(documentId);
    setSelectedDocumentNumber(storedDocument?.documentNumber ?? null);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setConditions([]);
      setLoadingConditions(false);
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

        if (response.data.documentNumber) {
          setSelectedDocumentNumber(response.data.documentNumber);
        }
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

  return (
    <div className="space-y-7">
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-slate-200 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Belge Detayları
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
          Özel Şartlar
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Seçili yatırım teşvik belgesine ait özel şartları
          görüntüleyebilirsiniz.
        </p>
      </header>

      {/* SEÇİLİ BELGE ŞERİDİ */}
      {selectedDocumentId && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <FileText className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Belge No
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              {selectedDocumentNumber ?? `#${selectedDocumentId}`}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Seçili
          </span>
        </div>
      )}

      {/* HATA */}
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
              Hata
            </p>
            <p className="mt-0.5 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* İÇERİK KARTI */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Kart Alt Başlığı */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-[#1e2a5e]" />
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-800">
                Özel Şartlar Listesi
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Belge kapsamında uygulanan özel şartlar ve yasal açıklamaları.
              </p>
            </div>
          </div>
          {!loadingConditions &&
            selectedDocumentId &&
            conditions.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c8102e]" />
                {conditions.length} Şart
              </span>
            )}
        </div>

        {/* Tablo */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[#1e2a5e]/15 bg-[#1e2a5e]/[0.04] text-left">
                <th className="w-[280px] px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e]">
                  Özel Şart
                </th>
                <th className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e]">
                  Açıklama
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!selectedDocumentId ? (
                <tr>
                  <td colSpan={2} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Görüntülenecek belge seçilmedi
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Lütfen sol menüden bir belge numarası seçin.
                    </p>
                  </td>
                </tr>
              ) : loadingConditions ? (
                <tr>
                  <td colSpan={2} className="px-5 py-14">
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e]" />
                      <span className="text-sm text-slate-500">Yükleniyor</span>
                    </div>
                  </td>
                </tr>
              ) : conditions.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Kayıt bulunamadı
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Bu belgeye ait özel şart mevcut değil.
                    </p>
                  </td>
                </tr>
              ) : (
                conditions.map((condition, index) => (
                  <tr
                    key={condition.id}
                    className={`group align-top transition-colors hover:bg-[#1e2a5e]/[0.03] ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    {/* Özel Şart */}
                    <td className="px-6 py-3 align-top">
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e] opacity-0 transition-opacity group-hover:opacity-100" />
                        <span className="text-sm font-semibold leading-snug text-slate-900">
                          {displayValue(condition.conditionName) === "-" ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            condition.conditionName
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Açıklama */}
                    <td className="px-6 py-4 align-top">
                      {displayValue(condition.description) === "-" ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <p className="text-sm leading-relaxed text-slate-600">
                          {condition.description}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
