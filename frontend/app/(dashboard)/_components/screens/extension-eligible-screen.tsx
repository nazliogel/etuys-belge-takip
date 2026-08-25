"use client";

import {
  CalendarClock,
  Check,
  ChevronRight,
  FileText,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DocumentDetailScreen } from "@/app/(dashboard)/_components/screens/document-detail-screen";
import { apiFetch } from "@/lib/api";

type ExtensionEligibleDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string;
  extensionDate: string;
  extensionApplicationStartDate: string;
  supportClass: string | null;
  isActive: boolean;
  company: {
    id: number;
    externalCompanyId: number;
    name: string;
    taxNumber: string;
  };
};

type ExtensionEligibleResponse = {
  success: boolean;
  message: string;
  data: {
    items: ExtensionEligibleDocument[];
    totalCount: number;
  };
};

const PAGE_SIZE = 20;

function formatDate(date: string | null): string {
  if (!date) return "-";

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return "-";
  }

  return `${day}.${month}.${year}`;
}

export function ExtensionEligibleScreen() {
  const [page, setPage] = useState(1);
  const [documents, setDocuments] = useState<ExtensionEligibleDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadDocuments() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch<ExtensionEligibleResponse>(
          "/documents/extension-eligible",
        );

        setDocuments(response.data.items);
      } catch (error) {
        setDocuments([]);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Süre uzatma müracatı yapılabilecek belgeler yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDocuments();
  }, []);

  useEffect(() => {
    if (activeDocumentId) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  }, [activeDocumentId]);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");

    if (!query) {
      return documents;
    }

    return documents.filter((document) => {
      return (
        document.documentNumber?.toLocaleLowerCase("tr-TR").includes(query) ||
        document.company.name.toLocaleLowerCase("tr-TR").includes(query) ||
        document.company.taxNumber.toLocaleLowerCase("tr-TR").includes(query) ||
        String(document.company.externalCompanyId).includes(query)
      );
    });
  }, [documents, searchQuery]);

  const totalCount = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const safePage = Math.min(page, totalPages);

  const paginatedDocuments = filteredDocuments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const firstRecord = totalCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;

  const lastRecord = Math.min(safePage * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-5">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm">
            <CalendarClock size={17} />
          </div>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Süre Uzatma Müracatı Yapılabilecekler
            </h1>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Süre uzatma müracatı yapılabilecek açık teşvik belgelerini
              görüntüleyin.
            </p>
          </div>
        </div>
      </section>

      {/* BELGE LİSTESİ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Süre Uzatma Yapılabilecek Belgeler
            </h2>

            <p className="text-xs font-medium text-slate-500">
              Firma, belge ve süre uzatma tarih bilgileri
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <div className="relative w-full lg:w-72">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Belge no, firma veya vergi no ile ara..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Aramayı temizle"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Belge No</th>
                <th className="px-6 py-3.5">Firma</th>
                <th className="px-6 py-3.5">Belge Başlangıç</th>
                <th className="px-6 py-3.5">Belge Bitiş</th>
                <th className="px-6 py-3.5">Süre Uzatım</th>
                <th className="px-6 py-3.5">Destekleme Sınıfı</th>
                <th className="px-6 py-3.5">Durum</th>
                <th className="px-6 py-3.5 text-right">Detay</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Belgeler yükleniyor...
                    </p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-red-700">
                      Belgeler yüklenemedi
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                  </td>
                </tr>
              ) : paginatedDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Süre uzatma müracatı yapılabilecek belge bulunamadı.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDocuments.map((doc) => {
                  const isSelected = activeDocumentId === String(doc.id);

                  return (
                    <tr
                      key={doc.id}
                      className={`transition-colors ${
                        isSelected ? "bg-red-50/40" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="max-w-xs px-6 py-4">
                        <p
                          title={doc.company.name}
                          className="truncate text-sm font-semibold text-slate-900"
                        >
                          {doc.company.name}
                        </p>

                        <p className="font-mono text-[11px] text-slate-500">
                          VKN: {doc.company.taxNumber}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.documentStartDate)}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.documentEndDate)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {formatDate(doc.extensionApplicationStartDate)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.extensionDate)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {doc.supportClass ?? "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Müracat Yapılabilir
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDocumentId(
                                isSelected ? null : String(doc.id),
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} />
                                Görüntüleniyor
                              </>
                            ) : (
                              <>
                                Görüntüle
                                <ChevronRight size={14} />
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* SAYFALAMA */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500">
            <span className="font-bold text-slate-700">
              {firstRecord}-{lastRecord}
            </span>{" "}
            arası, toplam{" "}
            <span className="font-bold text-slate-700">{totalCount}</span> kayıt
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Önceki
            </button>

            <button
              type="button"
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-red-600/20"
            >
              {safePage} / {totalPages}
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages || isLoading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      </section>

      {/* SEÇİLİ BELGE DETAYI */}
      {activeDocumentId && (
        <section
          ref={detailRef}
          className="scroll-mt-6 space-y-4 border-t border-dashed border-slate-200 pt-8"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Seçili Belge Detayı
            </p>

            <button
              type="button"
              onClick={() => setActiveDocumentId(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={14} />
              Kapat
            </button>
          </div>

          <DocumentDetailScreen
            documentId={activeDocumentId}
            inline
            variant="company"
          />
        </section>
      )}
    </div>
  );
}
