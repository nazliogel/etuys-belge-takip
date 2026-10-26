"use client";

import {
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  X,
} from "lucide-react";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import {
  getSelectedDocument,
  type SelectedDocumentStatus,
} from "@/app/(dashboard)/_lib/selected-document";

type ImportedRealization = {
  externalRowId: string;
  sequenceNumber: number | null;
  itemName: string | null;
  unit: string | null;
  customsRealizedQuantity: string | null;
  rawData: unknown;
};

type ImportedMachine = {
  id: number;
  realizations?: ImportedRealization[];

  externalMachineId: number | null;
  sequenceNumber: number | null;

  name: string | null;
  quantity: string | null;
  unit: string | null;
  machineryEquipmentType: string | null;

  gtipCode: string | null;
  gtipDescription: string | null;

  vatExemption: string | null;
  vatExemptionDescription: string | null;

  customsTaxExemption: string | null;
  customsTaxExemptionDescription: string | null;

  usedMachine: string | null;
  isVehicle: string | null;
  isCkd: string | null;

  totalFobUsd: string | null;
  totalFobTl: string | null;
  totalCifTl: string | null;

  originCurrencyFob: string | null;
  originCurrencyFobAmount: string | null;

  customsRealizedValue: string | null;
  customsRealizedQuantity: string | null;
  customsPermittedValue: string | null;
  customsPermittedQuantity: string | null;

  transferRealizedValue: string | null;
  transferRealizedQuantity: string | null;
  transferOutgoingValue: string | null;
  transferOutgoingQuantity: string | null;

  transferDocumentNumber: string | null;
  transferIncomingQuantity: string | null;
  transferIncomingAmount: string | null;

  saleOutgoingValue: string | null;
  saleOutgoingQuantity: string | null;
  salePermittedValue: string | null;
  salePermittedQuantity: string | null;

  leasingOutgoingValue: string | null;
  leasingOutgoingQuantity: string | null;
  leasingPermittedValue: string | null;
  leasingPermittedQuantity: string | null;

  exportOutgoingValue: string | null;
  exportOutgoingQuantity: string | null;
  exportPermittedValue: string | null;
  exportPermittedQuantity: string | null;

  invoiceRealizedValue: string | null;
  invoiceRealizedQuantity: string | null;

  financialLeasingRealizedValue: string | null;
  financialLeasingRealizedQuantity: string | null;
  financialLeasingPermittedValue: string | null;
  financialLeasingPermittedQuantity: string | null;

  financialLeasingCompanyName: string | null;
};

type ImportedMachinesResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    items: ImportedMachine[];
  };
};

function formatNumber(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;

  const normalized = String(value).replace(",", ".").trim();
  const num = Number(normalized);

  if (!Number.isFinite(num)) return String(value);

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatQuantity(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;

  const normalized = String(value).replace(",", ".").trim();
  const num = Number(normalized);

  if (!Number.isFinite(num)) return String(value);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 10,
    useGrouping: false,
  }).format(num);
}

function isPositiveFlag(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toString().trim().toLowerCase();
  return ["evet", "yes", "true", "1", "e"].includes(v);
}

// "ADET(UNIT)" → "ADET" — parantez içindeki İngilizce karşılığı atar.
function shortUnit(unit: string) {
  return unit.replace(/\s*\(.*\)\s*$/, "").trim() || unit;
}

// Sabit başlık için ortak class'lar — her <th>'ye uygulanacak.
// sticky top-0 + opak arka plan zorunlu, aksi halde scroll'da hücre içerikleri sızar.
// Kompakt yoğunluk: dar padding, küçük font, ortalı; uzun başlıklar <br /> ile 2 satır.
// Soldaki ilk 3 sütunun yatay sabitlemesi (left-*) yalnızca md ve üstünde uygulanır.
const HEAD_BASE =
  "sticky top-0 z-20 bg-slate-100 dark:bg-muted border-b-2 border-[#1e2a5e]/15 dark:border-blue-400/20 border-r border-border overflow-hidden text-ellipsis px-2.5 py-1.5 align-middle text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-[#1e2a5e] dark:text-blue-300 shadow-[inset_0_-1px_0_rgba(30,42,94,0.15)]";

// Gövde hücreleri için ortak kompakt class'lar.
// overflow-hidden: kullanıcı sütunu daralttığında içerik taşmaz, kırpılır
// (tam metin hover kutusunda görünür).
const CELL_BASE =
  "overflow-hidden text-ellipsis border-b border-r border-border px-2.5 py-1.5";

// Sticky sütun varsayılan genişlikleri. Sıra ve Makine ID'nin left offset'leri
// --col1-left / --col2-left CSS değişkenleriyle tabloya verilir, böylece
// kullanıcı bu sütunları boyutlandırınca sabit sütunlar kaymaz.
const DEFAULT_SEQ_WIDTH = 52;
const DEFAULT_ID_WIDTH = 88;
const MIN_COL_WIDTH = 40;

const STICKY_SHADOW = "md:shadow-[5px_0_8px_-6px_rgba(15,23,42,0.35)]";
const FIT = "w-px whitespace-nowrap"; // sütun içeriği kadar daralır

// Başlık tanımları — sıra, gövdedeki <td> sırasıyla aynı olmalı.
const COLUMNS: { key: string; label: ReactNode; className: string }[] = [
  { key: "seq", label: "Sıra", className: "md:left-0 md:z-40 w-[52px] min-w-[52px]" },
  {
    key: "machineId",
    label: "Makine ID",
    className: "md:left-[var(--col1-left)] md:z-40 w-[88px] min-w-[88px]",
  },
  {
    key: "name",
    label: "Adı / Özelliği",
    className: `md:left-[var(--col2-left)] md:z-40 w-[220px] min-w-[220px] max-w-[220px] ${STICKY_SHADOW}`,
  },
  { key: "qty", label: <>Öngörülen<br />Miktar</>, className: FIT },
  { key: "customsQty", label: <>Gümrük Gerç.<br />Miktar</>, className: FIT },
  { key: "detail", label: "Detay", className: FIT },
  { key: "unit", label: "Birim", className: FIT },
  { key: "gtipCode", label: "GTİP No", className: FIT },
  {
    key: "gtipDesc",
    label: "GTİP Açıklama",
    className: "w-[220px] min-w-[220px] max-w-[220px]",
  },
  { key: "used", label: <>Kulla-<br />nılmış</>, className: FIT },
  { key: "vehicle", label: "Araç", className: FIT },
  { key: "ckd", label: "CKD", className: FIT },
  { key: "fobUsd", label: <>FOB<br />(USD)</>, className: FIT },
  { key: "fobTl", label: <>FOB<br />(TL)</>, className: FIT },
  { key: "originAmount", label: <>Menşei<br />Döviz Tutarı</>, className: FIT },
  {
    key: "vat",
    label: <>KDV<br />İstisnası</>,
    className: FIT,
  },
  {
    key: "customsTax",
    label: <>Gümrük V.<br />İstisnası</>,
    className: `${FIT} border-r-0`,
  },
];

const COL_COUNT = COLUMNS.length;

const EMPTY = <span className="text-muted-foreground/50">—</span>;

// Hücre hover kutusu: tablonun tamamı için tek bir dinleyici kullanılır.
// Kutu `fixed` konumlanır, böylece overflow-auto alanında kesilmez.
// Hücrenin gösterilecek metni varsayılan olarak görünen metnidir;
// farklı bir metin gerekiyorsa <td data-tip="..."> ile verilebilir.
// Hücre içindeki bir öğe de kendi data-tip'ini taşıyabilir (örn. SET "?" işareti);
// fare o öğenin üzerindeyken kutu öğenin metnini, öğenin altında gösterir.
// data-no-tip taşıyan hücrelerde (ve onların içinde) kutu gösterilmez.
type CellTip = { text: string; top: number; left: number; above: boolean };

const SET_NOTE = "Set alımlarınızda detaylı bilgi için uzmanınızla görüşünüz.";

function getCellTip(el: HTMLElement): CellTip | null {
  if (el instanceof HTMLTableCellElement && el.colSpan > 1) return null; // boş/yükleniyor satırları
  if (el.closest("[data-no-tip]")) return null;

  const text = (el.dataset.tip ?? el.innerText).replace(/\s+/g, " ").trim();
  if (!text || text === "—") return null;

  const r = el.getBoundingClientRect();
  const above = window.innerHeight - r.bottom < 160;

  return {
    text,
    top: above ? r.top - 2 : r.bottom + 2,
    left: Math.max(8, Math.min(r.left, window.innerWidth - 296)),
    above,
  };
}

export function ImportedMachinesScreen() {
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [machines, setMachines] = useState<ImportedMachine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [selectedDocumentStatus, setSelectedDocumentStatus] =
    useState<SelectedDocumentStatus>("OPEN");

  const [error, setError] = useState<string | null>(null);

  const [expandedMachineId, setExpandedMachineId] = useState<number | null>(
    null,
  );

  // --- Hover kutusu ---
  const [cellTip, setCellTip] = useState<CellTip | null>(null);
  const hoveredCellRef = useRef<HTMLElement | null>(null);

  const clearCellTip = () => {
    hoveredCellRef.current = null;
    setCellTip(null);
  };

  // --- Sütun boyutlandırma ---
  // Genişlikler yalnızca bu bileşenin state'inde tutulur (localStorage yok);
  // sayfadan çıkıp tekrar girince ya da yenileyince varsayılan düzene döner.
  // null = otomatik düzen (içeriğe göre). Kullanıcı ilk kez sürüklediğinde
  // mevcut genişlikler ölçülüp sabitlenir ve tablo table-fixed'e geçer.
  const tableRef = useRef<HTMLTableElement>(null);
  const [colWidths, setColWidths] = useState<number[] | null>(null);
  const stopResizeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopResizeRef.current?.(), []);

  const startResize = (index: number, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Yalnızca ana tablonun başlıkları (detay panelindeki iç tablo hariç)
    const ths = tableRef.current?.querySelectorAll<HTMLTableCellElement>(
      ":scope > thead > tr > th",
    );
    if (!ths) return;

    const base =
      colWidths ??
      Array.from(ths, (th) => Math.round(th.getBoundingClientRect().width));
    const startX = e.clientX;
    const startWidth = base[index];

    setColWidths(base);
    clearCellTip();

    const onMove = (ev: PointerEvent) => {
      const width = Math.max(
        MIN_COL_WIDTH,
        Math.round(startWidth + ev.clientX - startX),
      );
      setColWidths((prev) => {
        const next = [...(prev ?? base)];
        next[index] = width;
        return next;
      });
    };

    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      stopResizeRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    stopResizeRef.current = stop;
  };

  // Sticky ilk 3 sütunun left offset'leri genişliklere göre hesaplanır.
  const seqWidth = colWidths?.[0] ?? DEFAULT_SEQ_WIDTH;
  const idWidth = colWidths?.[1] ?? DEFAULT_ID_WIDTH;
  const tableStyle = {
    "--col1-left": `${seqWidth}px`,
    "--col2-left": `${seqWidth + idWidth}px`,
    width: colWidths ? colWidths.reduce((a, b) => a + b, 0) : undefined,
  } as CSSProperties;

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
      setMachines([]);
      setLoadingMachines(false);
      return;
    }

    const loadMachines = async () => {
      try {
        setLoadingMachines(true);
        setError(null);

        const isClosed =
          selectedDocumentStatus === "CLOSED" ||
          selectedDocumentStatus === "CANCELLED";

        const endpoint = isClosed
          ? `/closed-documents/${selectedDocumentId}/imported-machines`
          : `/documents/${selectedDocumentId}/imported-machines`;

        const response = await apiFetch<ImportedMachinesResponse>(endpoint);

        setMachines(response.data.items ?? []);

        if (response.data.documentNumber) {
          setSelectedDocumentNumber(response.data.documentNumber);
        }
      } catch (err) {
        setMachines([]);

        setError(
          err instanceof Error
            ? err.message
            : "İthal liste alınırken bir hata oluştu.",
        );
      } finally {
        setLoadingMachines(false);
      }
    };

    void loadMachines();
  }, [selectedDocumentId, selectedDocumentStatus]);

  return (
    <div className="space-y-8">
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Belge Detayları
        </p>

        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          İthal Makine ve Teçhizat Listesi
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Seçili yatırım teşvik belgesine ait ithal makine ve teçhizat
          bilgilerini görüntüleyebilirsiniz.
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

      {/* HATA */}
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />

          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              Hata
            </p>

            <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* İÇERİK KARTI */}
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
        {/* Kart Alt Başlığı */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-b from-slate-50 to-white px-6 py-4 dark:from-muted/40 dark:to-card">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-[#1e2a5e] dark:bg-blue-400" />

            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground">
                İthal Makine ve Teçhizat Kayıtları
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Belge kapsamında tanımlı ithal makineler, FOB tutarlar ve
                muafiyet bilgileri.
              </p>
            </div>
          </div>

          {!loadingMachines && selectedDocumentId && machines.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm dark:shadow-none">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c8102e]" />
              {machines.length} Kayıt
            </span>
          )}
        </div>

        {/* TABLO */}
        <div className="max-h-[70vh] overflow-auto" onScroll={clearCellTip}>
          <table
            ref={tableRef}
            style={tableStyle}
            className={`border-separate border-spacing-0 text-xs ${colWidths ? "table-fixed" : "w-max min-w-full"
              }`}
          >
            {/* Kullanıcı bir sütunu boyutlandırdığında sabit genişlikler buradan gelir */}
            {colWidths && (
              <colgroup>
                {colWidths.map((w, i) => (
                  <col key={COLUMNS[i].key} style={{ width: w }} />
                ))}
              </colgroup>
            )}

            <thead>
              <tr>
                {COLUMNS.map((col, i) => (
                  <th key={col.key} className={`${HEAD_BASE} ${col.className}`}>
                    {col.label}

                    {/* Sürükleme tutamacı: sütunun sağ kenarı */}
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Sütun genişliğini ayarla"
                      onPointerDown={(e) => startResize(i, e)}
                      className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none select-none transition-colors hover:bg-[#1e2a5e]/30 dark:hover:bg-blue-400/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody
              onMouseOver={(e) => {
                const target = e.target as HTMLElement;
                const td = target.closest("td");
                if (!td) return;

                // Hücre içinde kendi data-tip'i olan öğe varsa (örn. "?"), onu kullan
                const own = target.closest<HTMLElement>("[data-tip]");
                const anchor = own && td.contains(own) ? own : td;

                if (anchor === hoveredCellRef.current) return;
                hoveredCellRef.current = anchor;
                setCellTip(getCellTip(anchor));
              }}
              onMouseLeave={clearCellTip}
            >
              {!selectedDocumentId ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-foreground/80">
                      Görüntülenecek belge seçilmedi
                    </p>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Lütfen sol menüden bir belge numarası seçin.
                    </p>
                  </td>
                </tr>
              ) : loadingMachines ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-5 py-14">
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e] dark:text-blue-300" />

                      <span className="text-sm text-muted-foreground">
                        Yükleniyor
                      </span>
                    </div>
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-foreground/80">
                      Kayıt bulunamadı
                    </p>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Bu belgeye ait ithal makine kaydı mevcut değil.
                    </p>
                  </td>
                </tr>
              ) : (
                machines.map((machine, index) => {
                  const isExpanded = expandedMachineId === machine.id;

                  // Sticky sütunların opak arka planı: zebra + hover ile eş güdümlü.
                  const stickyBg = isExpanded
                    ? "bg-[#eef1f8] dark:bg-[#1a2238]"
                    : index % 2 === 1
                      ? "bg-slate-50 dark:bg-muted/60"
                      : "bg-white dark:bg-card";
                  const stickyHover = isExpanded
                    ? ""
                    : "group-hover:bg-[#f8f9fb] dark:group-hover:bg-muted/40";

                  const customsQuantities = [
                    ...new Set(
                      (machine.realizations ?? [])
                        .map((row) => row.customsRealizedQuantity)
                        .filter(
                          (value): value is string =>
                            value !== null && value !== "",
                        )
                        .map((value) => formatQuantity(value))
                        .filter((value): value is string => value !== null),
                    ),
                  ];

                  return (
                    <Fragment key={machine.id}>
                      <tr
                        className={`group transition-colors ${isExpanded
                          ? "bg-[#eef1f8] dark:bg-[#1a2238]"
                          : `hover:bg-[#1e2a5e]/[0.03] dark:hover:bg-blue-400/5 ${index % 2 === 1 ? "bg-muted/40" : "bg-card"
                          }`
                          }`}
                      >
                        {/* Sıra */}
                        <td
                          className={`md:sticky md:left-0 md:z-10 w-[52px] min-w-[52px] ${CELL_BASE} text-right font-mono font-semibold tabular-nums ${isExpanded
                            ? "text-[#1e2a5e] shadow-[inset_3px_0_0_#1e2a5e] dark:text-blue-300 dark:shadow-[inset_3px_0_0_#60a5fa]"
                            : "text-muted-foreground"
                            } ${stickyBg} ${stickyHover}`}
                        >
                          {machine.sequenceNumber ?? EMPTY}
                        </td>

                        {/* Makine ID */}
                        <td
                          className={`md:sticky md:left-[var(--col1-left)] md:z-10 w-[88px] min-w-[88px] ${CELL_BASE} ${stickyBg} ${stickyHover}`}
                        >
                          {machine.externalMachineId ? (
                            <span className="inline-flex rounded border border-border bg-muted px-1.5 py-px font-mono text-[11px] font-medium text-foreground/80">
                              {machine.externalMachineId}
                            </span>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* Ad */}
                        <td
                          className={`md:sticky md:left-[var(--col2-left)] md:z-10 w-[220px] min-w-[220px] max-w-[220px] ${CELL_BASE} font-semibold leading-snug text-foreground ${STICKY_SHADOW} ${stickyBg} ${stickyHover}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e] opacity-0 transition-opacity group-hover:opacity-100" />

                            {machine.name ? (
                              <div className="line-clamp-2 min-w-0">
                                {machine.name}
                              </div>
                            ) : (
                              EMPTY
                            )}
                          </div>
                        </td>

                        {/* Öngörülen Miktar */}
                        <td
                          className={`${CELL_BASE} whitespace-nowrap text-right font-mono font-semibold tabular-nums text-foreground`}
                        >
                          {formatQuantity(machine.quantity) ?? EMPTY}
                        </td>

                        {/* Gümrük Gerçekleşen Miktar */}
                        <td
                          className={`${CELL_BASE} whitespace-nowrap text-right font-mono tabular-nums`}
                        >
                          {customsQuantities.length === 0 ? (
                            EMPTY
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-px font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                              <span className="h-1 w-1 rounded-full bg-emerald-500" />
                              {customsQuantities.join(" / ")}
                            </span>
                          )}
                        </td>

                        {/* Gerçekleşme Detayı — buton olduğu için hover kutusu yok */}
                        <td
                          data-no-tip
                          className={`${CELL_BASE} whitespace-nowrap text-center`}
                        >
                          {machine.realizations?.length ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMachineId(
                                  isExpanded ? null : machine.id,
                                )
                              }
                              aria-expanded={isExpanded}
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] font-semibold transition-all ${isExpanded
                                ? "border-[#1e2a5e] bg-[#1e2a5e] text-white shadow-sm dark:border-blue-400 dark:bg-blue-500"
                                : "border-border bg-card text-foreground hover:border-[#1e2a5e]/40 hover:bg-[#1e2a5e]/[0.04] dark:hover:border-blue-400/40"
                                }`}
                            >
                              <span
                                className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] tabular-nums ${isExpanded
                                  ? "bg-white/20 text-white"
                                  : "bg-[#1e2a5e] text-white dark:bg-blue-500"
                                  }`}
                              >
                                {machine.realizations.length}
                              </span>
                              kayıt
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* Birim */}
                        <td
                          data-tip={
                            machine.unit
                              ? shortUnit(machine.unit).toUpperCase() === "SET"
                                ? SET_NOTE
                                : machine.unit
                              : undefined
                          }
                          className={`${CELL_BASE} whitespace-nowrap`}
                        >
                          {machine.unit ? (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex rounded bg-muted px-1.5 py-px text-[10px] font-medium uppercase text-foreground/80">
                                {shortUnit(machine.unit)}
                              </span>

                              {shortUnit(machine.unit).toUpperCase() === "SET" && (
                                <span
                                  tabIndex={0}
                                  role="note"
                                  data-tip={SET_NOTE}
                                  aria-label={SET_NOTE}
                                  className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-[10px] font-bold text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                                >
                                  ?
                                </span>
                              )}
                            </div>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* GTİP Kodu */}
                        <td className={`${CELL_BASE} whitespace-nowrap`}>
                          {machine.gtipCode ? (
                            <span className="inline-flex rounded border border-[#1e2a5e]/20 bg-[#1e2a5e]/[0.05] px-1.5 py-px font-mono text-[11px] font-semibold text-[#1e2a5e] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300">
                              {machine.gtipCode}
                            </span>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* GTİP Açıklama */}
                        <td
                          className={`${CELL_BASE} w-[220px] min-w-[220px] max-w-[220px] text-muted-foreground`}
                        >
                          {machine.gtipDescription ? (
                            <div className="truncate">
                              {machine.gtipDescription}
                            </div>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* Kullanılmış */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-center`}>
                          <FlagBadge
                            value={machine.usedMachine}
                            positiveTone="amber"
                          />
                        </td>

                        {/* Araç */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-center`}>
                          <FlagBadge
                            value={machine.isVehicle}
                            positiveTone="slate"
                          />
                        </td>

                        {/* CKD */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-center`}>
                          <FlagBadge value={machine.isCkd} positiveTone="slate" />
                        </td>

                        {/* FOB USD */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                          {formatNumber(machine.totalFobUsd) ? (
                            <span className="font-mono font-bold tabular-nums text-[#1e2a5e] dark:text-blue-300">
                              {formatNumber(machine.totalFobUsd)}
                              <span className="ml-1 text-[9px] font-semibold uppercase text-muted-foreground">
                                USD
                              </span>
                            </span>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* FOB TL */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                          {formatNumber(machine.totalFobTl) ? (
                            <span className="font-mono tabular-nums text-foreground/80">
                              {formatNumber(machine.totalFobTl)}
                              <span className="ml-1 text-[9px] font-medium uppercase text-muted-foreground">
                                TL
                              </span>
                            </span>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* Menşei Döviz Tutarı */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                          {formatNumber(machine.originCurrencyFobAmount) ? (
                            <span className="font-mono tabular-nums text-foreground/80">
                              {formatNumber(machine.originCurrencyFobAmount)}
                              {machine.originCurrencyFob && (
                                <span className="ml-1 text-[9px] font-medium uppercase text-muted-foreground">
                                  {machine.originCurrencyFob}
                                </span>
                              )}
                            </span>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* KDV İstisnası */}
                        <td
                          className={`${CELL_BASE} w-px whitespace-nowrap text-center text-muted-foreground`}
                        >
                          {machine.vatExemptionDescription ? (
                            <div className="mx-auto max-w-[140px] truncate">
                              {machine.vatExemptionDescription}
                            </div>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* Gümrük Vergisi İstisnası */}
                        <td className="w-px overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-1.5 text-center text-muted-foreground">
                          {machine.customsTaxExemptionDescription ? (
                            <div className="mx-auto max-w-[140px] truncate">
                              {machine.customsTaxExemptionDescription}
                            </div>
                          ) : (
                            EMPTY
                          )}
                        </td>
                      </tr>

                      {isExpanded && (machine.realizations?.length ?? 0) > 0 && (
                        <tr>
                          <td
                            colSpan={COL_COUNT}
                            data-no-tip
                            className="border-b border-border bg-[#eef1f8]/60 p-0 dark:bg-[#1a2238]/50"
                          >
                            {/* Yatay kaydırmada panel ekranda sabit kalsın */}
                            <div className="w-full max-w-[560px] px-3 py-2.5 md:sticky md:left-0 md:px-4">
                              <div className="overflow-hidden rounded-md border border-[#1e2a5e]/15 bg-card shadow-[0_2px_10px_-4px_rgba(30,42,94,0.18)] dark:border-blue-400/20 dark:shadow-none">
                                {/* Başlık */}
                                <div className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-[#1e2a5e]/[0.06] to-transparent px-3 py-1.5 dark:from-blue-400/10">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#1e2a5e] text-white dark:bg-blue-500">
                                      <Receipt className="h-3 w-3" strokeWidth={2} />
                                    </span>
                                    <div className="min-w-0 leading-tight">
                                      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                                        Gümrük Gerçekleşme Detayları
                                      </h3>
                                      <p className="truncate text-[11px] text-muted-foreground">
                                        <span className="font-mono font-semibold text-foreground/70">
                                          Sıra {machine.sequenceNumber ?? "—"}
                                        </span>
                                        <span className="mx-1 text-muted-foreground/50">
                                          ·
                                        </span>
                                        {machine.name ?? "—"}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedMachineId(null)}
                                    className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                    Kapat
                                  </button>
                                </div>

                                {/* Kayıtlar */}
                                <div className="max-h-[240px] overflow-auto">
                                  <table className="w-full border-separate border-spacing-0 text-xs">
                                    <thead>
                                      <tr>
                                        <th className="sticky top-0 z-10 w-[48px] border-b border-border bg-slate-50 px-2.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#1e2a5e] dark:bg-muted dark:text-blue-300">
                                          Kayıt
                                        </th>
                                        <th className="sticky top-0 z-10 border-b border-border bg-slate-50 px-2.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#1e2a5e] dark:bg-muted dark:text-blue-300">
                                          Beyanname Numarası
                                        </th>
                                        <th className="sticky top-0 z-10 w-px whitespace-nowrap border-b border-border bg-slate-50 px-2.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#1e2a5e] dark:bg-muted dark:text-blue-300">
                                          Gümrük Gerç. Miktar
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {machine.realizations?.map(
                                        (record, recordIndex) => (
                                          <tr
                                            key={record.externalRowId}
                                            className={`transition-colors hover:bg-[#1e2a5e]/[0.03] dark:hover:bg-blue-400/5 ${recordIndex % 2 === 1
                                              ? "bg-muted/30"
                                              : ""
                                              }`}
                                          >
                                            <td className="border-b border-border px-2.5 py-1 text-center">
                                              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
                                                {recordIndex + 1}
                                              </span>
                                            </td>
                                            <td className="border-b border-border px-2.5 py-1 text-center">
                                              <span className="inline-flex rounded border border-border bg-muted/60 px-1.5 py-px font-mono text-[11px] font-medium text-foreground/90">
                                                {record.externalRowId
                                                  .split(":")
                                                  .slice(1)
                                                  .join(":") ||
                                                  record.externalRowId}
                                              </span>
                                            </td>
                                            <td className="whitespace-nowrap border-b border-border px-2.5 py-1 text-center font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                              {formatQuantity(
                                                record.customsRealizedQuantity,
                                              ) ?? "—"}
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* HÜCRE HOVER KUTUSU */}
      {cellTip && (
        <div
          role="tooltip"
          style={{ top: cellTip.top, left: cellTip.left }}
          className={`pointer-events-none fixed z-50 w-max max-w-[280px] rounded border border-border bg-popover px-2 py-1 text-[11px] leading-snug text-popover-foreground shadow-md ${cellTip.above ? "-translate-y-full" : ""
            }`}
        >
          {cellTip.text}
        </div>
      )}
    </div>
  );
}

function FlagBadge({
  value,
  positiveTone = "emerald",
}: {
  value: string | null;
  positiveTone?: "emerald" | "amber" | "slate";
}) {
  if (!value) {
    return EMPTY;
  }

  const isPositive = isPositiveFlag(value);

  if (!isPositive) {
    return (
      <span className="inline-flex items-center rounded bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {value}
      </span>
    );
  }

  const toneStyles = {
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    amber:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    slate:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-muted dark:text-foreground/80 dark:ring-border",
  }[positiveTone];

  const dotStyle =
    positiveTone === "emerald"
      ? "bg-emerald-500"
      : positiveTone === "amber"
        ? "bg-amber-500"
        : "bg-slate-500 dark:bg-slate-400";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${toneStyles}`}
    >
      <span className={`h-1 w-1 rounded-full ${dotStyle}`} />
      {value}
    </span>
  );
}