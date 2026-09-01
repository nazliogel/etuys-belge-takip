"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

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

interface AdminDocumentFinancialInfoProps {
  documentId: string;
}

export function AdminDocumentFinancialInfo({
  documentId,
}: AdminDocumentFinancialInfoProps) {
  const [financialInfo, setFinancialInfo] = useState<FinancialInfo | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFinancialInfo = async () => {
      try {
        setLoading(true);

        const response = await apiFetch<FinancialInfoResponse>(
          `/documents/${documentId}/financial-info`,
        );

        setFinancialInfo(response.data.financialInfo);
      } catch (error) {
        console.error("Finansal bilgiler alınamadı:", error);
        setFinancialInfo(null);
      } finally {
        setLoading(false);
      }
    };

    void loadFinancialInfo();
  }, [documentId]);

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

  if (loading) {
    return (
      <section className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-12 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e]" />

          <span className="text-sm text-slate-500">
            Finansal bilgiler yükleniyor...
          </span>
        </div>
      </section>
    );
  }

  if (!financialInfo) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">
          Finansal bilgi bulunamadı
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Bu belgeye ait finansal bilgi kaydı bulunmuyor.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
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
        {/* SOL */}
        <div className="space-y-4">
          {leftCards.map((card) => (
            <AdminFinancialCard key={card.title} card={card} />
          ))}
        </div>

        {/* SAĞ */}
        <div className="space-y-4">
          {rightCards.map((card) => (
            <AdminFinancialCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminFinancialCard({ card }: { card: FinancialCard }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-100 px-3 py-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1e2a5e]">
          {card.title}
        </h3>
      </div>

      <div>
        {card.rows.map((row) => (
          <AdminFinancialRow
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

function AdminFinancialRow({
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
