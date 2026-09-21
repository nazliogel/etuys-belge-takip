"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, CheckCircle2, Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api";
import {
  getSelectedDocument,
  type SelectedDocumentStatus,
} from "@/app/(dashboard)/_lib/selected-document";

type DocumentDetailResponse = {
  success: boolean;
  data: {
    id: number;
    documentNumber?: string | null;
    investmentType: string | null;
  };
};

export function InvestmentTypeScreen() {
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [selectedDocumentStatus, setSelectedDocumentStatus] =
    useState<SelectedDocumentStatus>("OPEN");

  const [investmentType, setInvestmentType] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    const documentIdFromUrl = searchParams.get("documentId");
    const storedDocument = getSelectedDocument();

    const documentId = documentIdFromUrl ?? storedDocument?.id ?? "";

    setSelectedDocumentId(documentId);
    setSelectedDocumentNumber(storedDocument?.documentNumber ?? null);
    setSelectedDocumentStatus(storedDocument?.status ?? "OPEN");
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setInvestmentType(null);
      setDetailLoading(false);
      return;
    }

    const fetchDocumentDetail = async () => {
      try {
        setDetailLoading(true);

        const isClosed =
          selectedDocumentStatus === "CLOSED" ||
          selectedDocumentStatus === "CANCELLED";

        const endpoint = isClosed
          ? `/closed-documents/${selectedDocumentId}`
          : `/documents/${selectedDocumentId}`;

        const response = await apiFetch<DocumentDetailResponse>(endpoint);

        setInvestmentType(response.data.investmentType);

        if (response.data.documentNumber) {
          setSelectedDocumentNumber(response.data.documentNumber);
        }
      } catch (error) {
        console.error("Yatırım cinsi alınamadı:", error);
        setInvestmentType(null);
      } finally {
        setDetailLoading(false);
      }
    };

    void fetchDocumentDetail();
  }, [selectedDocumentId, selectedDocumentStatus]);

  return (
    <div className="space-y-8">
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Belge Detayları
        </p>

        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          Yatırım Cinsi
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Seçili teşvik belgesine ait yatırım cinsi bilgisini
          görüntüleyebilirsiniz.
        </p>
      </header>

      {/* SEÇİLİ BELGE ŞERİDİ */}
      {selectedDocumentId && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-md border border-border bg-card px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
            <FileText
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.75}
            />

            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Belge No
            </span>

            <span className="h-4 w-px bg-border" />

            <span className="text-sm font-semibold tracking-tight text-foreground">
              {selectedDocumentNumber ?? `#${selectedDocumentId}`}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Seçili
          </span>
        </div>
      )}

      {/* İÇERİK KARTI */}
      <section className="rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
        {!selectedDocumentId ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground/80">
              Görüntülenecek belge seçilmedi
            </p>

            <p className="mt-1.5 text-xs text-muted-foreground">
              Lütfen sol menüden bir belge numarası seçin.
            </p>
          </div>
        ) : detailLoading ? (
          <div className="flex items-center justify-center gap-2.5 px-6 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Yükleniyor</span>
          </div>
        ) : (
          <dl className="divide-y divide-border">
            <div className="grid grid-cols-1 gap-2 px-6 py-5 sm:grid-cols-[220px_1fr] sm:gap-6 sm:py-4">
              <dt className="text-sm font-medium text-muted-foreground">
                Yatırım Cinsi
              </dt>

              <dd className="text-sm font-semibold text-foreground">
                {investmentType ?? (
                  <span className="font-normal italic text-muted-foreground/70">
                    Kayıt bulunamadı
                  </span>
                )}
              </dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}
