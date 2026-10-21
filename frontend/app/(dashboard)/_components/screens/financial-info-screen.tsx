"use client";

import { CheckCircle2, ChevronRight, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import {
  getSelectedDocument,
  type SelectedDocumentStatus,
} from "@/app/(dashboard)/_lib/selected-document";

/* -------------------------------------------------------------------------- */
/*                                   TİPLER                                   */
/* -------------------------------------------------------------------------- */

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

type RealizationInfo = {
  id: number;
  landRealization: string | null;
  totalLandRealization: string | null;
  mainBuildingRealization: string | null;
  auxiliaryFacilitiesRealization: string | null;
  administrativeBuildingsRealization: string | null;
  undergroundGalleriesRealization: string | null;
  totalBuildingRealization: string | null;
  auxiliaryMachineryRealization: string | null;
  importCustomsRealization: string | null;
  transportInsuranceRealization: string | null;
  assemblyRealization: string | null;
  studyProjectRealization: string | null;
  otherExpensesRealization: string | null;
  expenseDocumentRealization: string | null;
  totalOtherInvestmentRealization: string | null;
  domesticRealization: string | null;
  importedRealization: string | null;
  exchangeDifferenceRealization: string | null;
  totalRealizedAmount: string | null;
  updatedTotalLandRealization: string | null;
  updatedTotalBuildingRealization: string | null;
  updatedTotalOtherInvestmentRealization: string | null;
};

type FinancialInfoResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    financialInfo: FinancialInfo | null;
    realizationInfo: RealizationInfo | null;
  };
};

type DetailRow = {
  label: string;
  value: number | null;
  muted?: boolean;
};

type ComparisonItem = {
  key: string;
  title: string;
  planned: number | null;
  realized: number | null;
  plannedDetails: DetailRow[];
  realizedDetails: DetailRow[];
};

type InfoRow = {
  label: string;
  value: number | null;
  suffix: "TL" | "USD";
  isTotal?: boolean;
};

/* -------------------------------------------------------------------------- */
/*                                  YARDIMCI                                  */
/* -------------------------------------------------------------------------- */

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }

  const num = Number(value.replace(",", ".").trim());
  return Number.isFinite(num) ? num : null;
}

function sumNullable(...values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) : null;
}

const amountFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(value: number | null): string | null {
  return value === null ? null : amountFormatter.format(value);
}

/* -------------------------------------------------------------------------- */
/*                                  EKRAN                                     */
/* -------------------------------------------------------------------------- */

export function FinancialInfoScreen() {
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [financialInfo, setFinancialInfo] = useState<FinancialInfo | null>(
    null,
  );
  const [realizationInfo, setRealizationInfo] =
    useState<RealizationInfo | null>(null);

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
      setRealizationInfo(null);
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
        setRealizationInfo(response.data.realizationInfo ?? null);

        if (response.data.documentNumber) {
          setSelectedDocumentNumber(response.data.documentNumber);
        }
      } catch (error) {
        console.error("Finansal bilgiler alınamadı:", error);
        setFinancialInfo(null);
        setRealizationInfo(null);
      } finally {
        setFinancialInfoLoading(false);
      }
    };

    void fetchFinancialInfo();
  }, [selectedDocumentId, selectedDocumentStatus]);

  /* ----------------------------- KARŞILAŞTIRMA ---------------------------- */

  const f = financialInfo;
  const r = realizationInfo;

  const comparisonItems: ComparisonItem[] = [
    {
      key: "land",
      title: "Arazi-Arsa",
      planned: toNumber(f?.landCost),
      realized: toNumber(r?.totalLandRealization),
      plannedDetails: [
        { label: "Arazi-Arsa Bedeli", value: toNumber(f?.landCost) },
      ],
      realizedDetails: [
        { label: "Arazi-Arsa Giderleri", value: toNumber(r?.landRealization) },
        {
          label: "Güncellenmiş Toplam",
          value: toNumber(r?.updatedTotalLandRealization),
          muted: true,
        },
      ],
    },
    {
      key: "building",
      title: "Bina-İnşaat",
      planned: toNumber(f?.totalBuildingConstructionExpenses),
      realized: toNumber(r?.totalBuildingRealization),
      plannedDetails: [
        { label: "Ana Bina ve Tesisleri", value: toNumber(f?.mainBuilding) },
        {
          label: "Yardımcı İşletmeler Bina ve Tesisleri",
          value: toNumber(f?.auxiliaryEnterpriseEquipment),
        },
        {
          label: "Yardımcı Tesisler",
          value: toNumber(f?.auxiliaryFacilities),
        },
      ],
      realizedDetails: [
        {
          label: "Ana Bina ve Tesisleri",
          value: toNumber(r?.mainBuildingRealization),
        },
        {
          label: "Yardımcı İşletmeler Bina ve Tesisleri",
          value: toNumber(r?.auxiliaryFacilitiesRealization),
        },
        {
          label: "İdare Binaları",
          value: toNumber(r?.administrativeBuildingsRealization),
        },
        {
          label: "Yeraltı Ana Galerileri",
          value: toNumber(r?.undergroundGalleriesRealization),
        },
        {
          label: "Güncellenmiş Toplam",
          value: toNumber(r?.updatedTotalBuildingRealization),
          muted: true,
        },
      ],
    },
    {
      key: "machinery",
      title: "Makine-Teçhizat",
      planned: toNumber(f?.totalMachineryExpenses),
      realized: sumNullable(
        toNumber(r?.domesticRealization),
        toNumber(r?.importedRealization),
      ),
      plannedDetails: [
        { label: "Yerli", value: toNumber(f?.domesticMachinery) },
        { label: "İthal", value: toNumber(f?.importedMachinery) },
      ],
      realizedDetails: [
        { label: "Yerli", value: toNumber(r?.domesticRealization) },
        { label: "İthal", value: toNumber(r?.importedRealization) },
      ],
    },
    {
      key: "other",
      title: "Diğer Yatırım Harcamaları",
      planned: toNumber(f?.otherInvestmentExpenses),
      realized: toNumber(r?.totalOtherInvestmentRealization),
      plannedDetails: [
        {
          label: "İthalat ve Gümrükleme",
          value: toNumber(f?.importCustoms),
        },
        {
          label: "Taşıma ve Sigorta",
          value: toNumber(f?.transportInsurance),
        },
        { label: "Montaj", value: toNumber(f?.assembly) },
        { label: "Etüt ve Proje", value: toNumber(f?.studyProject) },
        { label: "Diğer Giderler", value: toNumber(f?.otherExpenses) },
        { label: "Genel Giderler", value: toNumber(f?.generalExpenses) },
      ],
      realizedDetails: [
        {
          label: "Yardımcı Makine Teçhizat",
          value: toNumber(r?.auxiliaryMachineryRealization),
        },
        {
          label: "İthalat ve Gümrükleme",
          value: toNumber(r?.importCustomsRealization),
        },
        {
          label: "Taşıma ve Sigorta",
          value: toNumber(r?.transportInsuranceRealization),
        },
        { label: "Montaj", value: toNumber(r?.assemblyRealization) },
        {
          label: "Etüt ve Proje",
          value: toNumber(r?.studyProjectRealization),
        },
        {
          label: "Diğer Giderler",
          value: toNumber(r?.otherExpensesRealization),
        },
        {
          label: "Harcama Belgesi",
          value: toNumber(r?.expenseDocumentRealization),
        },
        {
          label: "Güncellenmiş Toplam",
          value: toNumber(r?.updatedTotalOtherInvestmentRealization),
          muted: true,
        },
      ],
    },
  ];

  const plannedTotal = toNumber(f?.totalInvestment);
  const realizedTotal = toNumber(r?.totalRealizedAmount);

  const financingRows: InfoRow[] = [
    { label: "Özkaynaklar", value: toNumber(f?.equity), suffix: "TL" },
    {
      label: "Yabancı Kaynaklar",
      value: toNumber(f?.foreignResources),
      suffix: "TL",
    },
    {
      label: "Toplam Finansman",
      value: toNumber(f?.totalFinancing),
      suffix: "TL",
      isTotal: true,
    },
  ];

  const importedMachineRows: InfoRow[] = [
    { label: "Yeni Makine", value: toNumber(f?.newMachinery), suffix: "USD" },
    {
      label: "Kullanılmış Makine",
      value: toNumber(f?.usedMachinery),
      suffix: "USD",
    },
    {
      label: "Toplam İthal Makine",
      value: toNumber(f?.importedMachineryUsd),
      suffix: "USD",
      isTotal: true,
    },
  ];

  /* --------------------------------- RENDER -------------------------------- */

  return (
    <div className="space-y-6">
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-border pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Belge Detayları
        </p>
        <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          Finansal Bilgiler
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Öngörülen ve gerçekleşen yatırım tutarlarını kalem bazında
          karşılaştırabilirsiniz.
        </p>
      </header>

      {/* SEÇİLİ BELGE */}
      {selectedDocumentId && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-md border border-border bg-card px-3.5 py-2 shadow-sm dark:shadow-none">
            <FileText
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.75}
            />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Belge No
            </span>
            <span className="h-4 w-px bg-border" />
            <span className="text-sm font-semibold text-foreground">
              {selectedDocumentNumber ?? `#${selectedDocumentId}`}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Seçili
          </span>

          {financialInfo?.externalFinancialInfoId && (
            <span className="ml-auto rounded border border-border bg-muted px-2.5 py-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Kayıt ID
              </span>
              <span className="ml-2 font-mono text-[11px] font-semibold text-foreground/80">
                {financialInfo.externalFinancialInfoId}
              </span>
            </span>
          )}
        </div>
      )}

      {/* DURUMLAR */}
      {!selectedDocumentId ? (
        <EmptyState
          title="Görüntülenecek belge seçilmedi"
          description="Lütfen sol menüden bir belge numarası seçin."
        />
      ) : financialInfoLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-12 shadow-sm dark:shadow-none">
          <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e] dark:text-blue-300" />
          <span className="text-sm text-muted-foreground">Yükleniyor</span>
        </div>
      ) : !financialInfo && !realizationInfo ? (
        <EmptyState
          title="Kayıt bulunamadı"
          description="Bu belgeye ait finansal bilgi mevcut değil."
        />
      ) : (
        <>
          {/* ÖZET */}
          <SummaryStrip
            planned={plannedTotal}
            realized={realizedTotal}
            hasRealization={!!realizationInfo}
          />

          {/* KARŞILAŞTIRMA TABLOSU */}
          <ComparisonTable
            items={comparisonItems}
            plannedTotal={plannedTotal}
            realizedTotal={realizedTotal}
            hasRealization={!!realizationInfo}
          />

          {/* FİNANSMAN + İTHAL MAKİNE */}
          {financialInfo && (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <InfoCard title="Finansman" rows={financingRows} />
              <InfoCard title="İthal Makine ($)" rows={importedMachineRows} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 ÖZET BANDI                                 */
/* -------------------------------------------------------------------------- */

function SummaryStrip({
  planned,
  realized,
  hasRealization,
}: {
  planned: number | null;
  realized: number | null;
  hasRealization: boolean;
}) {
  const remaining =
    planned !== null && realized !== null ? planned - realized : null;
  const isOver = remaining !== null && remaining < 0;

  return (
    <div className="grid overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none sm:grid-cols-3">
      <SummaryStat
        label="Öngörülen Sabit Yatırım"
        value={planned}
        accent="bg-[#1e2a5e] dark:bg-blue-400"
      />
      <SummaryStat
        label="Gerçekleşen Toplam"
        value={hasRealization ? realized : null}
        accent="bg-emerald-600 dark:bg-emerald-400"
        emptyText="Henüz yüklenmedi"
      />
      <SummaryStat
        label={isOver ? "Aşım" : "Kalan"}
        value={remaining === null ? null : Math.abs(remaining)}
        accent={
          isOver
            ? "bg-amber-500 dark:bg-amber-400"
            : "bg-slate-400 dark:bg-slate-500"
        }
        tone={isOver ? "warning" : "default"}
      />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
  tone = "default",
  emptyText = "—",
}: {
  label: string;
  value: number | null;
  accent: string;
  tone?: "default" | "warning";
  emptyText?: string;
}) {
  const formatted = formatAmount(value);

  return (
    <div className="relative border-b border-border px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span
        className={`absolute left-0 top-4 h-8 w-[3px] rounded-r ${accent}`}
      />

      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      {formatted ? (
        <p
          className={`mt-1.5 font-mono text-[22px] font-semibold leading-none tabular-nums tracking-tight ${
            tone === "warning"
              ? "text-amber-700 dark:text-amber-300"
              : "text-foreground"
          }`}
        >
          {formatted}
          <span className="ml-1.5 font-sans text-[11px] font-medium text-muted-foreground">
            TL
          </span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground/60">{emptyText}</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            KARŞILAŞTIRMA TABLOSU                           */
/* -------------------------------------------------------------------------- */

const TABLE_GRID =
  "grid grid-cols-[minmax(180px,1fr)_160px_160px_160px] items-center";

function ComparisonTable({
  items,
  plannedTotal,
  realizedTotal,
  hasRealization,
}: {
  items: ComparisonItem[];
  plannedTotal: number | null;
  realizedTotal: number | null;
  hasRealization: boolean;
}) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allOpen = openKeys.size === items.length;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Yatırım Kalemleri
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Detay için satıra tıklayın
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setOpenKeys(allOpen ? new Set() : new Set(items.map((i) => i.key)))
          }
          className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {allOpen ? "Tümünü kapat" : "Tümünü aç"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          {/* SÜTUN BAŞLIKLARI */}
          <div
            className={`${TABLE_GRID} border-b border-border bg-muted text-[10px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300`}
          >
            <div className="px-4 py-2">Kalem</div>
            <div className="px-4 py-2 text-right">Öngörülen</div>
            <div className="px-4 py-2 text-right">Gerçekleşen</div>
            <div className="px-4 py-2 text-right">Kalan</div>
          </div>

          {/* SATIRLAR */}
          {items.map((item) => (
            <ComparisonRow
              key={item.key}
              item={item}
              open={openKeys.has(item.key)}
              onToggle={() => toggle(item.key)}
              hasRealization={hasRealization}
            />
          ))}

          {/* TOPLAM */}
          <div
            className={`${TABLE_GRID} border-t-2 border-foreground/15 bg-amber-50/60 dark:bg-amber-500/10`}
          >
            <div className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-foreground">
              Toplam Sabit Yatırım
            </div>
            <AmountCell value={plannedTotal} strong />
            <AmountCell value={hasRealization ? realizedTotal : null} strong />
            <DiffCell
              planned={plannedTotal}
              realized={hasRealization ? realizedTotal : null}
              strong
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonRow({
  item,
  open,
  onToggle,
  hasRealization,
}: {
  item: ComparisonItem;
  open: boolean;
  onToggle: () => void;
  hasRealization: boolean;
}) {
  const realized = hasRealization ? item.realized : null;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`${TABLE_GRID} w-full text-left transition-colors hover:bg-muted/60 ${
          open ? "bg-muted/40" : ""
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          <span className="text-[12px] font-semibold text-foreground">
            {item.title}
          </span>
        </div>
        <AmountCell value={item.planned} />
        <AmountCell value={realized} />
        <DiffCell planned={item.planned} realized={realized} />
      </button>

      {open && (
        <div className="grid gap-px border-t border-border bg-border md:grid-cols-2">
          <DetailList
            title="Öngörülen Detay"
            rows={item.plannedDetails}
            total={item.planned}
            emptyText="Bu kalem için öngörülen tutar bulunmuyor."
          />
          <DetailList
            title="Gerçekleşen Detay"
            rows={hasRealization ? item.realizedDetails : []}
            total={realized}
            emptyText="Gerçekleşme bilgisi henüz yüklenmedi."
          />
        </div>
      )}
    </div>
  );
}

function DetailList({
  title,
  rows,
  total,
  emptyText = "Detay bulunmuyor.",
}: {
  title: string;
  rows: DetailRow[];
  total: number | null;
  emptyText?: string;
}) {
  const mainRows = rows.filter((row) => !row.muted);
  const mutedRows = rows.filter((row) => row.muted);

  return (
    <div className="bg-background/60 px-4 py-3 pl-10 dark:bg-background/40">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>

      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/70">{emptyText}</p>
      ) : (
        <dl className="space-y-1">
          {mainRows.map((row) => (
            <DetailLine key={row.label} label={row.label} value={row.value} />
          ))}

          <div className="mt-1.5 border-t border-dashed border-border pt-1.5">
            <DetailLine label="Toplam" value={total} strong />
            {mutedRows.map((row) => (
              <DetailLine
                key={row.label}
                label={row.label}
                value={row.value}
                muted
              />
            ))}
          </div>
        </dl>
      )}
    </div>
  );
}

function DetailLine({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: string;
  value: number | null;
  strong?: boolean;
  muted?: boolean;
}) {
  const formatted = formatAmount(value);

  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={`text-[11px] ${
          strong
            ? "font-semibold text-foreground"
            : muted
              ? "italic text-muted-foreground/70"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </dt>
      <dd
        className={`font-mono text-[11px] tabular-nums ${
          strong
            ? "font-semibold text-foreground"
            : muted
              ? "text-muted-foreground/70"
              : "text-foreground/80"
        }`}
      >
        {formatted ?? <span className="text-muted-foreground/50">—</span>}
      </dd>
    </div>
  );
}

function AmountCell({
  value,
  strong = false,
}: {
  value: number | null;
  strong?: boolean;
}) {
  const formatted = formatAmount(value);

  return (
    <div className="px-4 py-3 text-right">
      {formatted ? (
        <span
          className={`font-mono tabular-nums ${
            strong
              ? "text-[13px] font-bold text-foreground"
              : "text-[12px] font-medium text-foreground/85"
          }`}
        >
          {formatted}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground/50">—</span>
      )}
    </div>
  );
}

function DiffCell({
  planned,
  realized,
  strong = false,
}: {
  planned: number | null;
  realized: number | null;
  strong?: boolean;
}) {
  if (planned === null || realized === null) {
    return (
      <div className="px-4 py-3 text-right">
        <span className="text-xs text-muted-foreground/50">—</span>
      </div>
    );
  }

  const diff = planned - realized;
  const isOver = diff < 0;

  return (
    <div className="px-4 py-3 text-right">
      <span
        className={`font-mono tabular-nums ${
          strong ? "text-[13px] font-bold" : "text-[12px] font-medium"
        } ${
          isOver
            ? "text-amber-700 dark:text-amber-300"
            : diff === 0
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-muted-foreground"
        }`}
      >
        {isOver && "+"}
        {formatAmount(Math.abs(diff))}
      </span>
      {isOver && (
        <span className="ml-1.5 rounded bg-amber-100 px-1 py-px text-[9px] font-semibold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
          Aşım
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 BİLGİ KARTI                                */
/* -------------------------------------------------------------------------- */

function InfoCard({ title, rows }: { title: string; rows: InfoRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
      <div className="border-b border-border bg-muted px-4 py-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
          {title}
        </h3>
      </div>

      <div>
        {rows.map((row) => {
          const formatted = formatAmount(row.value);

          return (
            <div
              key={row.label}
              className={`flex min-h-[38px] items-center justify-between gap-4 border-b border-border px-4 py-2 last:border-b-0 ${
                row.isTotal ? "bg-amber-50/50 dark:bg-amber-500/10" : ""
              }`}
            >
              <span
                className={
                  row.isTotal
                    ? "text-[11px] font-bold text-foreground"
                    : "text-[11px] font-medium text-muted-foreground"
                }
              >
                {row.label}
              </span>

              {formatted ? (
                <span
                  className={`font-mono tabular-nums ${
                    row.isTotal
                      ? "text-[12px] font-bold text-foreground"
                      : "text-[11px] font-semibold text-foreground/80"
                  }`}
                >
                  {formatted}
                  <span className="ml-1.5 font-sans text-[9px] font-medium uppercase text-muted-foreground">
                    {row.suffix}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  BOŞ DURUM                                 */
/* -------------------------------------------------------------------------- */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-12 text-center shadow-sm dark:shadow-none">
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
