"use client";

import { FileText, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getSelectedDocument } from "@/app/(dashboard)/_lib/selected-document";

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

type Row = {
  label: string;
  value: string | null;
  isTotal?: boolean;
  suffix?: string;
};

type Group = {
  title: string;
  rows: Row[];
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

  useEffect(() => {
    const documentIdFromUrl = searchParams.get("documentId");
    const storedDocument = getSelectedDocument();

    const documentId = documentIdFromUrl ?? storedDocument?.id ?? "";

    setSelectedDocumentId(documentId);
    setSelectedDocumentNumber(storedDocument?.documentNumber ?? null);
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

        const response = await apiFetch<FinancialInfoResponse>(
          `/documents/${selectedDocumentId}/financial-info`,
        );

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
  }, [selectedDocumentId]);

  const groups: Group[] = financialInfo
    ? [
        {
          title: "Genel Finansman",
          rows: [
            {
              label: "Toplam Yatırım",
              value: financialInfo.totalInvestment,
              isTotal: true,
            },
            {
              label: "Toplam Finansman",
              value: financialInfo.totalFinancing,
              isTotal: true,
            },
            { label: "Öz Kaynaklar", value: financialInfo.equity },
            {
              label: "Öz Kaynak Oranı",
              value: financialInfo.equityRate,
              suffix: "%",
            },
            {
              label: "Yabancı Kaynaklar",
              value: financialInfo.foreignResources,
            },
            {
              label: "Yabancı Kaynak Oranı",
              value: financialInfo.foreignResourcesRate,
              suffix: "%",
            },
          ],
        },
        {
          title: "Kredi Bilgileri",
          rows: [
            { label: "TL Kredisi", value: financialInfo.tlLoan },
            {
              label: "Döviz Kredisi",
              value: financialInfo.foreignCurrencyLoan,
            },
            {
              label: "Dövize Endeksli Kredi",
              value: financialInfo.foreignCurrencyIndexedLoan,
            },
            { label: "İç Kredi", value: financialInfo.domesticLoan },
            { label: "Dış Kredi", value: financialInfo.foreignLoan },
            { label: "Diğer Krediler", value: financialInfo.otherLoans },
            {
              label: "Finansal Kiralama",
              value: financialInfo.financialLeasing,
            },
          ],
        },
        {
          title: "Makine ve Teçhizat",
          rows: [
            {
              label: "Yerli Makine Teçhizat",
              value: financialInfo.domesticMachinery,
            },
            {
              label: "İthal Makine Teçhizat",
              value: financialInfo.importedMachinery,
            },
            { label: "Yeni Makine", value: financialInfo.newMachinery },
            { label: "Kullanılmış Makine", value: financialInfo.usedMachinery },
            {
              label: "İthal Makine (USD)",
              value: financialInfo.importedMachineryUsd,
            },
            {
              label: "Toplam Makine Teçhizat Giderleri",
              value: financialInfo.totalMachineryExpenses,
              isTotal: true,
            },
          ],
        },
        {
          title: "Bina ve İnşaat",
          rows: [
            { label: "Ana Bina", value: financialInfo.mainBuilding },
            {
              label: "Yardımcı İşletme Teçhizat",
              value: financialInfo.auxiliaryEnterpriseEquipment,
            },
            {
              label: "Yardımcı Tesisler",
              value: financialInfo.auxiliaryFacilities,
            },
            {
              label: "Toplam Bina İnşaat Giderleri",
              value: financialInfo.totalBuildingConstructionExpenses,
              isTotal: true,
            },
          ],
        },
        {
          title: "Diğer Yatırım Harcamaları",
          rows: [
            { label: "Arazi Bedeli", value: financialInfo.landCost },
            {
              label: "Arazi Düzenlemesi",
              value: financialInfo.landArrangement,
            },
            {
              label: "İthalat / Gümrükleme",
              value: financialInfo.importCustoms,
            },
            {
              label: "Taşıma / Sigorta",
              value: financialInfo.transportInsurance,
            },
            { label: "Montaj", value: financialInfo.assembly },
            { label: "Etüt Proje", value: financialInfo.studyProject },
            { label: "Diğer Giderler", value: financialInfo.otherExpenses },
            { label: "Genel Giderler", value: financialInfo.generalExpenses },
            {
              label: "Diğer Yatırım Harcamaları",
              value: financialInfo.otherInvestmentExpenses,
              isTotal: true,
            },
          ],
        },
        {
          title: "Sabit Yatırım Tutarları",
          rows: [
            {
              label: "Sabit Yatırım Tutarı (USD)",
              value: financialInfo.fixedInvestmentUsd,
              isTotal: true,
            },
            {
              label: "Sabit Yatırım Tutarı (TÜFE)",
              value: financialInfo.fixedInvestmentCpi,
              isTotal: true,
            },
            {
              label: "Sabit Yatırım Tutarı USD — İlk Nüsha",
              value: financialInfo.fixedInvestmentUsdFirstCopy,
            },
            {
              label: "Sabit Yatırım Tutarı TÜFE — İlk Nüsha",
              value: financialInfo.fixedInvestmentCpiFirstCopy,
            },
          ],
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-slate-200 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Belge Detayları
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
          Finansal Bilgiler
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Seçili teşvik belgesine ait yatırım ve finansman bilgilerini
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

      {/* İÇERİK */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Kart Alt Başlığı */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-[#1e2a5e]" />
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-800">
                Finansal Bilgi Cetveli
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Belge kapsamında yatırım, finansman ve gider kalemleri.
              </p>
            </div>
          </div>
          {financialInfo?.externalFinancialInfoId && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Kayıt ID
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700">
                {financialInfo.externalFinancialInfoId}
              </span>
            </span>
          )}
        </div>

        {/* Tablo */}
        {!selectedDocumentId ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">
              Görüntülenecek belge seçilmedi
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              Lütfen sol menüden bir belge numarası seçin.
            </p>
          </div>
        ) : financialInfoLoading ? (
          <div className="flex items-center justify-center gap-2.5 py-14">
            <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e]" />
            <span className="text-sm text-slate-500">Yükleniyor</span>
          </div>
        ) : !financialInfo ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">
              Kayıt bulunamadı
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              Bu belgeye ait finansal bilgi mevcut değil.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-[#1e2a5e]/15 bg-[#1e2a5e]/[0.04] text-left">
                  <th className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e]">
                    Kalem
                  </th>
                  <th className="px-6 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e]">
                    Tutar
                  </th>
                </tr>
              </thead>

              <tbody>
                {groups.map((group, gIndex) => (
                  <FinancialSection
                    key={group.title}
                    title={group.title}
                    isFirst={gIndex === 0}
                  >
                    {group.rows.map((row) => (
                      <FinancialField
                        key={row.label}
                        label={row.label}
                        value={row.value}
                        isTotal={row.isTotal}
                        suffix={row.suffix}
                      />
                    ))}
                  </FinancialSection>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FinancialSection({
  title,
  isFirst,
  children,
}: {
  title: string;
  isFirst: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={2}
          className={`bg-slate-100/70 px-6 py-2 ${
            isFirst ? "" : "border-t border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-0.5 rounded-full bg-[#1e2a5e]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              {title}
            </span>
          </div>
        </td>
      </tr>
      {children}
    </>
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

function FinancialField({
  label,
  value,
  isTotal = false,
  suffix,
}: {
  label: string;
  value: string | null;
  isTotal?: boolean;
  suffix?: string;
}) {
  const formattedValue = value ? formatNumber(value) : null;

  return (
    <tr
      className={`border-t border-slate-100 transition-colors hover:bg-slate-50/60 ${
        isTotal ? "bg-[#1e2a5e]/[0.025]" : ""
      }`}
    >
      <td className="px-6 py-2.5">
        <div className="flex items-center gap-2">
          {isTotal && <span className="h-1 w-1 rounded-full bg-[#c8102e]" />}
          <span
            className={
              isTotal
                ? "text-sm font-semibold text-slate-900"
                : "text-sm text-slate-700"
            }
          >
            {label}
          </span>
        </div>
      </td>
      <td className="px-6 py-2.5 text-right">
        {formattedValue ? (
          <span
            className={`font-mono tabular-nums ${
              isTotal
                ? "text-[15px] font-bold text-[#1e2a5e]"
                : "text-sm font-semibold text-slate-900"
            }`}
          >
            {suffix === "%" ? (
              <>
                <span className="mr-0.5 font-sans text-slate-500">%</span>
                {formattedValue}
              </>
            ) : (
              <>
                {formattedValue}
                <span className="ml-1.5 font-sans text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  TL
                </span>
              </>
            )}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
    </tr>
  );
}
