"use client";

import { FileText, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getSelectedDocument } from "@/app/(dashboard)/_lib/selected-document";

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
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [supports, setSupports] = useState<SupportItem[]>([]);
  const [supportsLoading, setSupportsLoading] = useState(true);

  useEffect(() => {
    const documentIdFromUrl = searchParams.get("documentId");
    const storedDocument = getSelectedDocument();

    const documentId = documentIdFromUrl ?? storedDocument?.id ?? "";

    setSelectedDocumentId(documentId);
    setSelectedDocumentNumber(storedDocument?.documentNumber ?? null);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setSupports([]);
      setSupportsLoading(false);
      return;
    }

    const fetchSupports = async () => {
      try {
        setSupportsLoading(true);

        const response = await apiFetch<SupportsResponse>(
          `/documents/${selectedDocumentId}/supports`,
        );

        setSupports(response.data.items);

        if (response.data.documentNumber) {
          setSelectedDocumentNumber(response.data.documentNumber);
        }
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
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-slate-200 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Belge Detayları
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
          Destek Unsurları
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Seçili teşvik belgesine ait destek unsurlarını görüntüleyebilirsiniz.
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

      {/* İÇERİK KARTI */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Kart Alt Başlığı */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-[#1e2a5e]" />
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-800">
                Destek Unsurları Listesi
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Belge kapsamında tanımlı destek türleri, oranları ve
                açıklamaları.
              </p>
            </div>
          </div>
          {!supportsLoading && selectedDocumentId && supports.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c8102e]" />
              {supports.length} Destek
            </span>
          )}
        </div>

        {/* Tablo */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[#1e2a5e]/15 bg-[#1e2a5e]/[0.04]">
                <th className="w-1/3 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e]">
                  Destek Türü
                </th>
                <th className="w-1/3 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e]">
                  Destek Oranı
                </th>
                <th className="w-1/3 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e]">
                  Açıklama
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!selectedDocumentId ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Görüntülenecek belge seçilmedi
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Lütfen sol menüden bir belge numarası seçin.
                    </p>
                  </td>
                </tr>
              ) : supportsLoading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14">
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e]" />
                      <span className="text-sm text-slate-500">Yükleniyor</span>
                    </div>
                  </td>
                </tr>
              ) : supports.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Kayıt bulunamadı
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Bu belgeye ait destek unsuru mevcut değil.
                    </p>
                  </td>
                </tr>
              ) : (
                supports.map((support, index) => (
                  <tr
                    key={support.id}
                    className={`group transition-colors hover:bg-[#1e2a5e]/[0.03] ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-left text-sm font-semibold text-slate-900">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e] opacity-0 transition-opacity group-hover:opacity-100" />
                        {support.supportType ?? (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      {support.supportRate ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-sm font-bold tabular-nums text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          {support.supportRate}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-left text-sm leading-relaxed text-slate-600">
                      {support.supportDescription ?? (
                        <span className="text-slate-300">—</span>
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
