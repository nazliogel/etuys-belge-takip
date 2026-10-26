"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import {
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

interface AdminDocumentDomesticMachinesProps {
  documentId: string;
  isClosed?: boolean;
}

type DomesticMachine = {
  id: number;
  externalMachineId: number | null;
  sequenceNumber: number | null;

  name: string | null;
  quantity: string | null;
  unitPriceTl: string | null;
  totalTl: string | null;
  unit: string | null;

  vatExemption: string | null;

  invoiceRealizedValue: string | null;
  invoiceRealizedQuantity: string | null;

  gtipCode: string | null;
  gtipDescription: string | null;

  barcode: string | null;
  sellerTaxNumber: string | null;
  sellerEmail: string | null;
  machineryEquipmentType: string | null;
};

type DomesticMachinesResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    items: DomesticMachine[];
  };
};

/* -------------------------------------------------------------------------- */
/*                                  YARDIMCI                                  */
/* -------------------------------------------------------------------------- */

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(num) ? num : null;
}

function formatNumber(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;

  const num = toNumber(value);
  if (num === null) return String(value);

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatQuantity(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;

  const num = toNumber(value);
  if (num === null) return String(value);

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num);
}

function flagLabel(value: string | null | undefined): "EVET" | "HAYIR" | null {
  if (value === null || value === undefined || value === "") return null;
  const v = String(value).trim().toLowerCase();
  if (["1", "evet", "yes", "true", "e"].includes(v)) return "EVET";
  if (["0", "hayır", "hayir", "no", "false", "h"].includes(v)) return "HAYIR";
  return null;
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
  { key: "invoiceQty", label: <>Fatura Gerç.<br />Miktar</>, className: FIT },
  { key: "unit", label: "Birim", className: FIT },
  { key: "unitPrice", label: <>Birim<br />Fiyat (TL)</>, className: FIT },
  { key: "total", label: <>Toplam<br />Tutar (TL)</>, className: FIT },
  { key: "invoiceValue", label: <>Fatura Gerç.<br />Değer (TL)</>, className: FIT },
  { key: "vat", label: <>KDV<br />İstisnası</>, className: FIT },
  { key: "gtipCode", label: "GTİP No", className: FIT },
  {
    key: "gtipDesc",
    label: "GTİP Açıklama",
    className: "w-[170px] min-w-[170px] max-w-[170px]",
  },
  { key: "machineType", label: <>Makine<br />Tipi</>, className: FIT },
  { key: "sellerTax", label: "Satıcı VKN", className: FIT },
  { key: "sellerEmail", label: "Satıcı E-Posta", className: FIT },
  { key: "barcode", label: "Barkod", className: `${FIT} border-r-0` },
];

const COL_COUNT = COLUMNS.length;

const EMPTY = <span className="text-muted-foreground/50">—</span>;

/* -------------------------------------------------------------------------- */
/*                                HOVER KUTUSU                                */
/* -------------------------------------------------------------------------- */

type CellTip = { text: string; top: number; left: number; above: boolean };

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

export function AdminDocumentDomesticMachines({
  documentId,
  isClosed = false,
}: AdminDocumentDomesticMachinesProps) {
  const [machines, setMachines] = useState<DomesticMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- Hover kutusu ---
  const [cellTip, setCellTip] = useState<CellTip | null>(null);
  const hoveredCellRef = useRef<HTMLElement | null>(null);

  const clearCellTip = () => {
    hoveredCellRef.current = null;
    setCellTip(null);
  };

  // --- Sütun boyutlandırma (yalnızca oturum boyunca) ---
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

        const endpoint = isClosed
          ? `/closed-documents/${documentId}/domestic-machines`
          : `/documents/${documentId}/domestic-machines`;

        const response = await apiFetch<DomesticMachinesResponse>(endpoint);

        setMachines(response.data.items ?? []);
      } catch (error) {
        setMachines([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Yerli makine bilgileri alınamadı.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadMachines();
  }, [documentId, isClosed]);

  const realizedCount = machines.filter(
    (m) => (toNumber(m.invoiceRealizedQuantity) ?? 0) > 0,
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
                Yerli Makine ve Teçhizat Listesi
              </h2>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Belgede tanımlı yerli makineler, tutarlar, fatura gerçekleşme ve
                satıcı bilgileri.
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
                        Yerli liste yükleniyor
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
                      Bu belgeye ait yerli makine kaydı mevcut değil.
                    </p>
                  </td>
                </tr>
              ) : (
                machines.map((machine, index) => {
                  const stickyBg =
                    index % 2 === 1
                      ? "bg-slate-50 dark:bg-muted/60"
                      : "bg-white dark:bg-card";
                  const stickyHover =
                    "group-hover:bg-[#f8f9fb] dark:group-hover:bg-muted/40";

                  const invoiceQty = toNumber(machine.invoiceRealizedQuantity);
                  const hasInvoice = invoiceQty !== null && invoiceQty > 0;

                  // Orijinal gösterim korunur: boşsa "0", değer ham sayı.
                  const invoiceQuantityText =
                    machine.invoiceRealizedQuantity === null ||
                      machine.invoiceRealizedQuantity === undefined ||
                      machine.invoiceRealizedQuantity === ""
                      ? "0"
                      : (formatQuantity(machine.invoiceRealizedQuantity) ?? "0");

                  const invoiceValueText =
                    machine.invoiceRealizedValue === null ||
                      machine.invoiceRealizedValue === undefined ||
                      machine.invoiceRealizedValue === ""
                      ? "0"
                      : String(Number(machine.invoiceRealizedValue));
                  const hasInvoiceValue =
                    (toNumber(machine.invoiceRealizedValue) ?? 0) > 0;
                  const vat = flagLabel(machine.vatExemption);

                  return (
                    <tr
                      key={machine.id}
                      className={`group transition-colors hover:bg-[#1e2a5e]/[0.03] dark:hover:bg-blue-400/5 ${index % 2 === 1 ? "bg-muted/40" : "bg-card"
                        }`}
                    >
                      {/* Sıra */}
                      <td
                        className={`md:sticky md:left-0 md:z-10 w-[40px] min-w-[40px] ${CELL_BASE} text-right font-mono font-semibold tabular-nums text-muted-foreground ${stickyBg} ${stickyHover}`}
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

                      {/* Fatura Gerçekleşen Miktar */}
                      <td
                        className={`${CELL_BASE} whitespace-nowrap text-right font-mono tabular-nums`}
                      >
                        {hasInvoice ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1 py-px font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                            <span className="h-1 w-1 rounded-full bg-emerald-500" />
                            {invoiceQuantityText}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {invoiceQuantityText}
                          </span>
                        )}
                      </td>

                      {/* Birim */}
                      <td
                        data-tip={machine.unit ?? undefined}
                        className={`${CELL_BASE} whitespace-nowrap`}
                      >
                        {machine.unit ? (
                          <span className="inline-flex rounded bg-muted px-1 py-px text-[9px] font-medium uppercase text-foreground/80">
                            {shortUnit(machine.unit)}
                          </span>
                        ) : (
                          EMPTY
                        )}
                      </td>

                      {/* Birim Fiyat */}
                      <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                        <Money value={machine.unitPriceTl} suffix="TL" />
                      </td>

                      {/* Toplam Tutar */}
                      <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                        <Money value={machine.totalTl} suffix="TL" emphasis />
                      </td>

                      {/* Fatura Gerçekleşen Değer */}
                      <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                        <span
                          className={`font-mono tabular-nums ${hasInvoiceValue
                              ? "font-semibold text-emerald-700 dark:text-emerald-300"
                              : "text-muted-foreground"
                            }`}
                        >
                          {invoiceValueText}
                        </span>
                      </td>

                      {/* KDV İstisnası */}
                      <td className={`${CELL_BASE} whitespace-nowrap text-center`}>
                        <FlagBadge label={vat} />
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
                          <div className="truncate">{machine.gtipDescription}</div>
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

                      {/* Satıcı VKN */}
                      <td
                        className={`${CELL_BASE} whitespace-nowrap font-mono text-[10px] text-foreground/80`}
                      >
                        {machine.sellerTaxNumber ?? EMPTY}
                      </td>

                      {/* Satıcı E-Posta */}
                      <td
                        className={`${CELL_BASE} whitespace-nowrap text-muted-foreground`}
                      >
                        {machine.sellerEmail ? (
                          <div className="max-w-[140px] truncate">
                            {machine.sellerEmail}
                          </div>
                        ) : (
                          EMPTY
                        )}
                      </td>

                      {/* Barkod */}
                      <td className="w-px overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-1.5 py-1">
                        {machine.barcode ? (
                          <span className="inline-flex rounded border border-border bg-muted px-1 py-px font-mono text-[10px] text-foreground/80">
                            {machine.barcode}
                          </span>
                        ) : (
                          EMPTY
                        )}
                      </td>
                    </tr>
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

function FlagBadge({ label }: { label: "EVET" | "HAYIR" | null }) {
  if (!label) return EMPTY;

  if (label === "HAYIR") {
    return (
      <span className="inline-flex items-center rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        HAYIR
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
      <span className="h-1 w-1 rounded-full bg-emerald-500" />
      EVET
    </span>
  );
}