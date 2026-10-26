"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
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

import { apiFetch } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/*                                   TİPLER                                   */
/* -------------------------------------------------------------------------- */

interface AdminDocumentImportedMachinesProps {
  documentId: string;
  isClosed?: boolean;
}

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
  vatExemptionDescription?: string | null;

  customsTaxExemption: string | null;
  customsTaxExemptionDescription?: string | null;

  usedMachine: string | null;
  isVehicle: string | null;
  isCkd: string | null;

  totalFobUsd: string | null;
  totalFobTl: string | null;
  totalCifTl: string | null;

  originCurrencyFob: string | null;
  originCurrencyFobAmount: string | null;
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

/* -------------------------------------------------------------------------- */
/*                                  YARDIMCI                                  */
/* -------------------------------------------------------------------------- */

function formatNumber(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;

  const num = Number(String(value).replace(",", ".").trim());
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

  const num = Number(String(value).replace(",", ".").trim());
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

// "ADET(UNIT)" → "ADET"
function shortUnit(unit: string) {
  return unit.replace(/\s*\(.*\)\s*$/, "").trim() || unit;
}

/* -------------------------------------------------------------------------- */
/*                               TABLO SABİTLERİ                              */
/* -------------------------------------------------------------------------- */

const HEAD_BASE =
  "sticky top-0 z-20 bg-slate-100 dark:bg-muted border-b-2 border-[#1e2a5e]/15 dark:border-blue-400/20 border-r border-border overflow-hidden text-ellipsis px-1.5 py-1 align-middle text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-[#1e2a5e] dark:text-blue-300 shadow-[inset_0_-1px_0_rgba(30,42,94,0.15)]";

const CELL_BASE =
  "overflow-hidden text-ellipsis border-b border-r border-border px-1.5 py-1";

const DEFAULT_SEQ_WIDTH = 40;
const DEFAULT_ID_WIDTH = 72;
const MIN_COL_WIDTH = 40;

const STICKY_SHADOW = "md:shadow-[5px_0_8px_-6px_rgba(15,23,42,0.35)]";
const FIT = "w-px whitespace-nowrap";

// Sıra, gövdedeki <td> sırasıyla aynı olmalı.
const COLUMNS: { key: string; label: ReactNode; className: string }[] = [
  { key: "seq", label: "Sıra", className: "md:left-0 md:z-40 w-[40px] min-w-[40px]" },
  {
    key: "machineId",
    label: "Makine ID",
    className: "md:left-[var(--col1-left)] md:z-40 w-[72px] min-w-[72px]",
  },
  {
    key: "name",
    label: "Adı / Özelliği",
    className: `md:left-[var(--col2-left)] md:z-40 w-[170px] min-w-[170px] max-w-[170px] ${STICKY_SHADOW}`,
  },
  { key: "qty", label: <>Öngörülen<br />Miktar</>, className: FIT },
  { key: "customsQty", label: <>Gümrük Gerç.<br />Miktar</>, className: FIT },
  { key: "detail", label: "Detay", className: FIT },
  { key: "unit", label: "Birim", className: FIT },
  { key: "gtipCode", label: "GTİP No", className: FIT },
  {
    key: "gtipDesc",
    label: "GTİP Açıklama",
    className: "w-[170px] min-w-[170px] max-w-[170px]",
  },
  { key: "machineType", label: <>Makine<br />Tipi</>, className: FIT },
  { key: "used", label: <>Kullanılmış<br />Makine</>, className: FIT },
  { key: "vehicle", label: "Araç", className: FIT },
  { key: "ckd", label: "CKD", className: FIT },
  { key: "fobUsd", label: <>FOB<br />(USD)</>, className: FIT },
  { key: "fobTl", label: <>FOB<br />(TL)</>, className: FIT },
  { key: "cifTl", label: <>CIF<br />(TL)</>, className: FIT },
  { key: "originAmount", label: <>Menşei<br />Döviz Tutarı</>, className: FIT },
  { key: "vat", label: <>KDV<br />İstisnası</>, className: FIT },
  {
    key: "customsTax",
    label: <>Gümrük V.<br />İstisnası</>,
    className: `${FIT} border-r-0`,
  },
];

const COL_COUNT = COLUMNS.length;

const EMPTY = <span className="text-muted-foreground/50">—</span>;

/* -------------------------------------------------------------------------- */
/*                                HOVER KUTUSU                                */
/* -------------------------------------------------------------------------- */

type CellTip = { text: string; top: number; left: number; above: boolean };

const SET_NOTE = "Set alımlarında detaylı bilgi için uzmanla görüşülmelidir.";

function getCellTip(el: HTMLElement): CellTip | null {
  if (el instanceof HTMLTableCellElement && el.colSpan > 1) return null;
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

/* -------------------------------------------------------------------------- */
/*                                  BİLEŞEN                                   */
/* -------------------------------------------------------------------------- */

export function AdminDocumentImportedMachines({
  documentId,
  isClosed = false,
}: AdminDocumentImportedMachinesProps) {
  const [machines, setMachines] = useState<ImportedMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  // null = otomatik düzen. İlk sürüklemede mevcut genişlikler ölçülüp sabitlenir.
  const tableRef = useRef<HTMLTableElement>(null);
  const [colWidths, setColWidths] = useState<number[] | null>(null);
  const stopResizeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopResizeRef.current?.(), []);

  const startResize = (index: number, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

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

  const seqWidth = colWidths?.[0] ?? DEFAULT_SEQ_WIDTH;
  const idWidth = colWidths?.[1] ?? DEFAULT_ID_WIDTH;
  const tableStyle = {
    "--col1-left": `${seqWidth}px`,
    "--col2-left": `${seqWidth + idWidth}px`,
    width: colWidths ? colWidths.reduce((a, b) => a + b, 0) : undefined,
  } as CSSProperties;

  // --- Veri ---
  useEffect(() => {
    const loadMachines = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setExpandedMachineId(null);

        const endpoint = isClosed
          ? `/closed-documents/${documentId}/imported-machines`
          : `/documents/${documentId}/imported-machines`;

        const response = await apiFetch<ImportedMachinesResponse>(endpoint);

        setMachines(response.data.items ?? []);
      } catch (error) {
        setMachines([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "İthal makine bilgileri alınamadı.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadMachines();
  }, [documentId, isClosed]);

  const realizedCount = machines.filter(
    (m) => (m.realizations?.length ?? 0) > 0,
  ).length;

  /* --------------------------------- RENDER -------------------------------- */

  return (
    <div className="space-y-4">
      {/* HATA */}
      {loadError && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              Hata
            </p>
            <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
              {loadError}
            </p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:shadow-none">
        {/* KART BAŞLIĞI */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-b from-slate-50 to-white px-3 py-2 dark:from-muted/40 dark:to-card">
          <div className="flex items-center gap-3">
            <span className="h-6 w-1 rounded-full bg-[#1e2a5e] dark:bg-blue-400" />
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                İthal Makine ve Teçhizat Listesi
              </h2>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Belgede tanımlı ithal makineler, FOB/CIF tutarlar, muafiyet ve
                gümrük gerçekleşme bilgileri.
              </p>
            </div>
          </div>

          {!isLoading && machines.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {realizedCount} Gerçekleşen
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm dark:shadow-none">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c8102e]" />
                {machines.length} Kayıt
              </span>
            </div>
          )}
        </div>

        {/* TABLO */}
        <div className="max-h-[70vh] overflow-auto" onScroll={clearCellTip}>
          <table
            ref={tableRef}
            style={tableStyle}
            className={`border-separate border-spacing-0 text-[11px] ${colWidths ? "table-fixed" : "w-max min-w-full"
              }`}
          >
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

                const own = target.closest<HTMLElement>("[data-tip]");
                const anchor = own && td.contains(own) ? own : td;

                if (anchor === hoveredCellRef.current) return;
                hoveredCellRef.current = anchor;
                setCellTip(getCellTip(anchor));
              }}
              onMouseLeave={clearCellTip}
            >
              {isLoading ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-5 py-14">
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e] dark:text-blue-300" />
                      <span className="text-sm text-muted-foreground">
                        İthal liste yükleniyor
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
                        .map((row) => formatQuantity(row.customsRealizedQuantity))
                        .filter((v): v is string => v !== null),
                    ),
                  ];

                  const unitShort = machine.unit ? shortUnit(machine.unit) : null;
                  const isSet = unitShort?.toUpperCase() === "SET";

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
                          className={`md:sticky md:left-0 md:z-10 w-[40px] min-w-[40px] ${CELL_BASE} text-right font-mono font-semibold tabular-nums ${isExpanded
                              ? "text-[#1e2a5e] shadow-[inset_3px_0_0_#1e2a5e] dark:text-blue-300 dark:shadow-[inset_3px_0_0_#60a5fa]"
                              : "text-muted-foreground"
                            } ${stickyBg} ${stickyHover}`}
                        >
                          {machine.sequenceNumber ?? EMPTY}
                        </td>

                        {/* Makine ID */}
                        <td
                          className={`md:sticky md:left-[var(--col1-left)] md:z-10 w-[72px] min-w-[72px] ${CELL_BASE} ${stickyBg} ${stickyHover}`}
                        >
                          {machine.externalMachineId ? (
                            <span className="inline-flex rounded border border-border bg-muted px-1 py-px font-mono text-[10px] font-medium text-foreground/80">
                              {machine.externalMachineId}
                            </span>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* Ad */}
                        <td
                          className={`md:sticky md:left-[var(--col2-left)] md:z-10 w-[170px] min-w-[170px] max-w-[170px] ${CELL_BASE} font-semibold leading-snug text-foreground ${STICKY_SHADOW} ${stickyBg} ${stickyHover}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e] opacity-0 transition-opacity group-hover:opacity-100" />
                            {machine.name ? (
                              <div className="line-clamp-2 min-w-0 leading-tight">
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
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1 py-px font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                              <span className="h-1 w-1 rounded-full bg-emerald-500" />
                              {customsQuantities.join(" / ")}
                            </span>
                          )}
                        </td>

                        {/* Detay */}
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
                              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border py-px pl-px pr-1.5 text-[10px] font-semibold transition-all ${isExpanded
                                  ? "border-[#1e2a5e] bg-[#1e2a5e] text-white shadow-sm dark:border-blue-400 dark:bg-blue-500"
                                  : "border-border bg-card text-foreground hover:border-[#1e2a5e]/40 hover:bg-[#1e2a5e]/[0.04] dark:hover:border-blue-400/40"
                                }`}
                            >
                              <span
                                className={`inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 font-mono text-[9px] tabular-nums ${isExpanded
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
                              ? isSet
                                ? SET_NOTE
                                : machine.unit
                              : undefined
                          }
                          className={`${CELL_BASE} whitespace-nowrap`}
                        >
                          {unitShort ? (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex rounded bg-muted px-1 py-px text-[9px] font-medium uppercase text-foreground/80">
                                {unitShort}
                              </span>
                              {isSet && (
                                <span
                                  tabIndex={0}
                                  role="note"
                                  data-tip={SET_NOTE}
                                  aria-label={SET_NOTE}
                                  className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-[10px] font-bold text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                                >
                                  ?
                                </span>
                              )}
                            </div>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* GTİP No */}
                        <td className={`${CELL_BASE} whitespace-nowrap`}>
                          {machine.gtipCode ? (
                            <span className="inline-flex rounded border border-[#1e2a5e]/20 bg-[#1e2a5e]/[0.05] px-1 py-px font-mono text-[10px] font-semibold text-[#1e2a5e] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300">
                              {machine.gtipCode}
                            </span>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* GTİP Açıklama */}
                        <td
                          className={`${CELL_BASE} w-[170px] min-w-[170px] max-w-[170px] text-muted-foreground`}
                        >
                          {machine.gtipDescription ? (
                            <div className="truncate">
                              {machine.gtipDescription}
                            </div>
                          ) : (
                            EMPTY
                          )}
                        </td>

                        {/* Makine Tipi */}
                        <td
                          className={`${CELL_BASE} whitespace-nowrap text-muted-foreground`}
                        >
                          {machine.machineryEquipmentType ? (
                            <div className="max-w-[110px] truncate">
                              {machine.machineryEquipmentType}
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
                          <FlagBadge value={machine.isVehicle} positiveTone="slate" />
                        </td>

                        {/* CKD */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-center`}>
                          <FlagBadge value={machine.isCkd} positiveTone="slate" />
                        </td>

                        {/* FOB USD */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                          <Money
                            value={machine.totalFobUsd}
                            suffix="USD"
                            emphasis
                          />
                        </td>

                        {/* FOB TL */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                          <Money value={machine.totalFobTl} suffix="TL" />
                        </td>

                        {/* CIF TL */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                          <Money value={machine.totalCifTl} suffix="TL" />
                        </td>

                        {/* Menşei Döviz Tutarı */}
                        <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                          <Money
                            value={machine.originCurrencyFobAmount}
                            suffix={machine.originCurrencyFob}
                          />
                        </td>

                        {/* KDV İstisnası */}
                        <td
                          className={`${CELL_BASE} w-px whitespace-nowrap text-center text-muted-foreground`}
                        >
                          <Exemption
                            description={machine.vatExemptionDescription}
                            flag={machine.vatExemption}
                          />
                        </td>

                        {/* Gümrük Vergisi İstisnası */}
                        <td className="w-px overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-1.5 py-1 text-center text-muted-foreground">
                          <Exemption
                            description={machine.customsTaxExemptionDescription}
                            flag={machine.customsTaxExemption}
                          />
                        </td>
                      </tr>

                      {/* GERÇEKLEŞME DETAY PANELİ */}
                      {isExpanded && (machine.realizations?.length ?? 0) > 0 && (
                        <tr>
                          <td
                            colSpan={COL_COUNT}
                            data-no-tip
                            className="border-b border-border bg-[#eef1f8]/60 p-0 dark:bg-[#1a2238]/50"
                          >
                            <div className="w-full max-w-[480px] px-2 py-1.5 md:sticky md:left-0 md:px-3">
                              <RealizationPanel
                                machine={machine}
                                onClose={() => setExpandedMachineId(null)}
                              />
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

/* -------------------------------------------------------------------------- */
/*                           GERÇEKLEŞME DETAY PANELİ                         */
/* -------------------------------------------------------------------------- */

function RealizationPanel({
  machine,
  onClose,
}: {
  machine: ImportedMachine;
  onClose: () => void;
}) {
  const TH =
    "sticky top-0 z-10 border-b border-border bg-slate-50 px-2.5 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#1e2a5e] dark:bg-muted dark:text-blue-300";

  return (
    <div className="overflow-hidden rounded-md border border-[#1e2a5e]/15 bg-card shadow-[0_2px_10px_-4px_rgba(30,42,94,0.18)] dark:border-blue-400/20 dark:shadow-none">
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
              <span className="mx-1 text-muted-foreground/50">·</span>
              {machine.name ?? "—"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Kapat
        </button>
      </div>

      <div className="max-h-[200px] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-[11px]">
          <thead>
            <tr>
              <th className={`${TH} w-[48px]`}>Kayıt</th>
              <th className={TH}>Beyanname Numarası</th>
              <th className={`${TH} w-px whitespace-nowrap`}>
                Gümrük Gerç. Miktar
              </th>
            </tr>
          </thead>
          <tbody>
            {machine.realizations?.map((record, i) => (
              <tr
                key={record.externalRowId}
                className={`transition-colors hover:bg-[#1e2a5e]/[0.03] dark:hover:bg-blue-400/5 ${i % 2 === 1 ? "bg-muted/30" : ""
                  }`}
              >
                <td className="border-b border-border px-2.5 py-1 text-center">
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                </td>
                <td className="border-b border-border px-2.5 py-1 text-center">
                  <span className="inline-flex rounded border border-border bg-muted/60 px-1 py-px font-mono text-[10px] font-medium text-foreground/90">
                    {record.externalRowId.split(":").slice(1).join(":") ||
                      record.externalRowId}
                  </span>
                </td>
                <td className="whitespace-nowrap border-b border-border px-2.5 py-1 text-center font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatQuantity(record.customsRealizedQuantity) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               KÜÇÜK BİLEŞENLER                             */
/* -------------------------------------------------------------------------- */

function Money({
  value,
  suffix,
  emphasis = false,
}: {
  value: string | null;
  suffix?: string | null;
  emphasis?: boolean;
}) {
  const formatted = formatNumber(value);
  if (!formatted) return EMPTY;

  return (
    <span
      className={`font-mono tabular-nums ${emphasis
          ? "font-bold text-[#1e2a5e] dark:text-blue-300"
          : "text-foreground/80"
        }`}
    >
      {formatted}
      {suffix && (
        <span
          className={`ml-1 text-[9px] uppercase text-muted-foreground ${emphasis ? "font-semibold" : "font-medium"
            }`}
        >
          {suffix}
        </span>
      )}
    </span>
  );
}

// Açıklama varsa onu, yoksa EVET/HAYIR bayrağını gösterir.
function Exemption({
  description,
  flag,
}: {
  description?: string | null;
  flag: string | null;
}) {
  if (description) {
    return <div className="mx-auto max-w-[110px] truncate">{description}</div>;
  }
  return <FlagBadge value={flag} positiveTone="emerald" />;
}

function FlagBadge({
  value,
  positiveTone = "emerald",
}: {
  value: string | null;
  positiveTone?: "emerald" | "amber" | "slate";
}) {
  if (!value) return EMPTY;

  if (!isPositiveFlag(value)) {
    return (
      <span className="inline-flex items-center rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
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
      className={`inline-flex items-center gap-1 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide ring-1 ring-inset ${toneStyles}`}
    >
      <span className={`h-1 w-1 rounded-full ${dotStyle}`} />
      {value}
    </span>
  );
}