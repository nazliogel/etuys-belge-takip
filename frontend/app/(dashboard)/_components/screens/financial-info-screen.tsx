"use client";

import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import {
  getSelectedDocument,
  type SelectedDocumentStatus,
} from "@/app/(dashboard)/_lib/selected-document";

type FinancialInfo = {
  id: number;
  externalFinancialInfoId: string | null;

  totalInvestment: string | null;
  totalFinancing: string | null;
  equity: string | null;
  equityRate: string | null;
  foreignResources: string | null;
  foreignResourcesRate: string | null;

  tlLoan: string | null;
  foreignCurrencyLoan: string | null;
  foreignCurrencyIndexedLoan: string | null;
  domesticLoan: string | null;
  foreignLoan: string | null;
  otherLoans: string | null;
  financialLeasing: string | null;

  domesticMachinery: string | null;
  importedMachinery: string | null;
  totalMachineryExpenses: string | null;

  newMachinery: string | null;
  usedMachinery: string | null;
  importedMachineryUsd: string | null;

  totalBuildingConstructionExpenses: string | null;
  mainBuilding: string | null;
  auxiliaryEnterpriseEquipment: string | null;
  auxiliaryFacilities: string | null;

  otherInvestmentExpenses: string | null;
  landCost: string | null;
  landArrangement: string | null;
  importCustoms: string | null;
  transportInsurance: string | null;
  assembly: string | null;
  studyProject: string | null;
  otherExpenses: string | null;
  generalExpenses: string | null;

  fixedInvestmentUsd: string | null;
  fixedInvestmentCpi: string | null;
  fixedInvestmentUsdFirstCopy: string | null;
  fixedInvestmentCpiFirstCopy: string | null;
};

type FinancialInfoResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    financialInfo: FinancialInfo | null;
  };
};

type FinancialRow = {
  label: string;
  value: string | null;
  suffix?: "TL" | "USD" | "%";
  isTotal?: boolean;
};

type FinancialCard = {
  title: string;
  rows: FinancialRow[];
};

export function FinancialInfoScreen() {
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [financialInfo, setFinancialInfo] = useState<FinancialInfo | null>(
    null,
  );

  const [financialInfoLoading, setFinancialInfoLoading] = useState(true);
  const [selectedDocumentStatus, setSelectedDocumentStatus] =
    useState<SelectedDocumentStatus>("OPEN");

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
      setFinancialInfo(null);
      setFinancialInfoLoading(false);
      return;
    }

    const fetchFinancialInfo = async () => {
      try {
        setFinancialInfoLoading(true);

        const isClosed =
          selectedDocumentStatus === "CLOSED" ||
          selectedDocumentStatus === "CANCELLED";

        const endpoint = isClosed
          ? `/closed-documents/${selectedDocumentId}/financial-info`
          : `/documents/${selectedDocumentId}/financial-info`;

        const response = await apiFetch<FinancialInfoResponse>(endpoint);

        setFinancialInfo(response.data.financialInfo);

        if (response.data.documentNumber) {
          setSelectedDocumentNumber(response.data.documentNumber);
        }
      } catch (error) {
        console.error("Finansal bilgiler alınamadı:", error);
        setFinancialInfo(null);
      } finally {
        setFinancialInfoLoading(false);
      }
    };

    void fetchFinancialInfo();
  }, [selectedDocumentId, selectedDocumentStatus]);

  const leftCards: FinancialCard[] = financialInfo
    ? [
        {
          title: "Arazi-Arsa Bedeli",
          rows: [
            {
              label: "Arazi-Arsa Bedeli",
              value: financialInfo.landCost,
              suffix: "TL",
              isTotal: true,
            },
          ],
        },

        {
          title: "Bina-İnşaat Giderleri",
          rows: [
            {
              label: "Ana Bina ve Tesisleri",
              value: financialInfo.mainBuilding,
              suffix: "TL",
            },
            {
              label: "Yardımcı İşletmeler Bina ve Tesisleri",
              value: financialInfo.auxiliaryEnterpriseEquipment,
              suffix: "TL",
            },
            {
              label: "Yardımcı Tesisler",
              value: financialInfo.auxiliaryFacilities,
              suffix: "TL",
            },
            {
              label: "Toplam Bina İnşaat Giderleri",
              value: financialInfo.totalBuildingConstructionExpenses,
              suffix: "TL",
              isTotal: true,
            },
          ],
        },

        {
          title: "Diğer Yatırım Harcamaları",
          rows: [
            {
              label: "İthalat ve Gümrükleme Giderleri",
              value: financialInfo.importCustoms,
              suffix: "TL",
            },
            {
              label: "Taşıma ve Sigorta Giderleri",
              value: financialInfo.transportInsurance,
              suffix: "TL",
            },
            {
              label: "Montaj Giderleri",
              value: financialInfo.assembly,
              suffix: "TL",
            },
            {
              label: "Etüt ve Proje Giderleri",
              value: financialInfo.studyProject,
              suffix: "TL",
            },
            {
              label: "Diğer Giderler",
              value: financialInfo.otherExpenses,
              suffix: "TL",
            },
            {
              label: "Genel Giderler",
              value: financialInfo.generalExpenses,
              suffix: "TL",
            },
            {
              label: "Toplam Diğer Yatırım Harcamaları",
              value: financialInfo.otherInvestmentExpenses,
              suffix: "TL",
              isTotal: true,
            },
          ],
        },

        {
          title: "Toplam Sabit Yatırım Tutarı",
          rows: [
            {
              label: "Toplam Sabit Yatırım Tutarı",
              value: financialInfo.totalInvestment,
              suffix: "TL",
              isTotal: true,
            },
          ],
        },
      ]
    : [];

  const rightCards: FinancialCard[] = financialInfo
    ? [
        {
          title: "Makine Teçhizat Giderleri",
          rows: [
            {
              label: "İthal",
              value: financialInfo.importedMachinery,
              suffix: "TL",
            },
            {
              label: "Yerli",
              value: financialInfo.domesticMachinery,
              suffix: "TL",
            },
            {
              label: "Toplam Makine Teçhizat",
              value: financialInfo.totalMachineryExpenses,
              suffix: "TL",
              isTotal: true,
            },
          ],
        },

        {
          title: "İthal Makine ($)",
          rows: [
            {
              label: "Yeni Makine",
              value: financialInfo.newMachinery,
              suffix: "USD",
            },
            {
              label: "Kullanılmış Makine",
              value: financialInfo.usedMachinery,
              suffix: "USD",
            },
            {
              label: "Toplam İthal Makine ($)",
              value: financialInfo.importedMachineryUsd,
              suffix: "USD",
              isTotal: true,
            },
          ],
        },

        {
          title: "Yabancı Kaynaklar",
          rows: [
            {
              label: "Toplam Yabancı Kaynak",
              value: financialInfo.foreignResources,
              suffix: "TL",
              isTotal: true,
            },
          ],
        },

        {
          title: "Özkaynaklar",
          rows: [
            {
              label: "Özkaynaklar",
              value: financialInfo.equity,
              suffix: "TL",
              isTotal: true,
            },
          ],
        },

        {
          title: "Toplam Finansman",
          rows: [
            {
              label: "Toplam Finansman",
              value: financialInfo.totalFinancing,
              suffix: "TL",
              isTotal: true,
            },
          ],
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-slate-200 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Belge Detayları
        </p>

        <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight text-slate-900">
          Finansal Bilgiler
        </h1>

        <p className="mt-1.5 text-sm text-slate-500">
          Seçili teşvik belgesine ait yatırım ve finansman bilgilerini
          görüntüleyebilirsiniz.
        </p>
      </header>

      {/* SEÇİLİ BELGE */}
      {selectedDocumentId && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
            <FileText className="h-4 w-4 text-slate-400" strokeWidth={1.75} />

            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Belge No
            </span>

            <span className="h-4 w-px bg-slate-200" />

            <span className="text-sm font-semibold text-slate-900">
              {selectedDocumentNumber ?? `#${selectedDocumentId}`}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Seçili
          </span>
        </div>
      )}

      {/* DURUM */}
      {!selectedDocumentId ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">
            Görüntülenecek belge seçilmedi
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Lütfen sol menüden bir belge numarası seçin.
          </p>
        </div>
      ) : financialInfoLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-12 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e]" />

          <span className="text-sm text-slate-500">Yükleniyor</span>
        </div>
      ) : !financialInfo ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Kayıt bulunamadı</p>

          <p className="mt-1 text-xs text-slate-500">
            Bu belgeye ait finansal bilgi mevcut değil.
          </p>
        </div>
      ) : (
        <>
          {/* ÜST BİLGİ */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-700">
                Finansal Bilgi Cetveli
              </h2>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Yatırım, harcama ve finansman kalemleri
              </p>
            </div>

            {financialInfo.externalFinancialInfoId && (
              <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Kayıt ID
                </span>

                <span className="ml-2 font-mono text-[11px] font-semibold text-slate-700">
                  {financialInfo.externalFinancialInfoId}
                </span>
              </div>
            )}
          </div>

          {/* E-TUYS SIRALAMASINA GÖRE 2 KOLON */}
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {/* SOL TARAF */}
            <div className="space-y-4">
              {leftCards.map((card) => (
                <FinancialCardView key={card.title} card={card} />
              ))}
            </div>

            {/* SAĞ TARAF */}
            <div className="space-y-4">
              {rightCards.map((card) => (
                <FinancialCardView key={card.title} card={card} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FinancialCardView({ card }: { card: FinancialCard }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* KART BAŞLIĞI */}
      <div className="border-b border-slate-200 bg-slate-100 px-3 py-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1e2a5e]">
          {card.title}
        </h3>
      </div>

      {/* SATIRLAR */}
      <div>
        {card.rows.map((row) => (
          <FinancialRowView
            key={row.label}
            label={row.label}
            value={row.value}
            suffix={row.suffix}
            isTotal={row.isTotal}
          />
        ))}
      </div>
    </section>
  );
}

function FinancialRowView({
  label,
  value,
  suffix,
  isTotal = false,
}: FinancialRow) {
  const formattedValue = value ? formatNumber(value) : null;

  return (
    <div
      className={`grid min-h-[34px] grid-cols-[minmax(0,1fr)_180px] items-center border-b border-slate-200 last:border-b-0 ${
        isTotal ? "bg-amber-50/50" : "bg-white"
      }`}
    >
      {/* LABEL */}
      <div className="border-r border-slate-200 px-3 py-2">
        <span
          className={
            isTotal
              ? "text-[11px] font-bold text-slate-800"
              : "text-[11px] font-medium text-slate-600"
          }
        >
          {label}
        </span>
      </div>

      {/* VALUE */}
      <div className="px-3 py-2 text-right">
        {formattedValue ? (
          <span
            className={`font-mono tabular-nums ${
              isTotal
                ? "text-[12px] font-bold text-slate-900"
                : "text-[11px] font-semibold text-slate-700"
            }`}
          >
            {suffix === "%" ? (
              <>%{formattedValue}</>
            ) : (
              <>
                {formattedValue}

                {suffix && (
                  <span className="ml-1.5 font-sans text-[9px] font-medium uppercase text-slate-400">
                    {suffix}
                  </span>
                )}
              </>
            )}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>
    </div>
  );
}

function formatNumber(value: string): string {
  const normalized = value.replace(",", ".").trim();
  const num = Number(normalized);

  if (!Number.isFinite(num)) {
    return value;
  }

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
