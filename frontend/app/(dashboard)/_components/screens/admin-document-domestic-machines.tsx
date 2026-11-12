"use client";
import {
  AlertCircle,
  Check,
  Loader2,
  Minus,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
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
  realizations?: {
    externalInvoiceLineId: number;
    sellerName: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    invoiceValue: string | null;
  }[];
  unitPriceTl: string | null;
  totalTl: string | null;
  unit: string | null;
  vatExemption: string | null;
  transferRealizedValue: string | null;
  transferRealizedQuantity: string | null;
  transferOutgoingValue: string | null;
  transferOutgoingQuantity: string | null;
  leasingOutgoingValue: string | null;
  leasingOutgoingQuantity: string | null;
  leasingPermittedValue: string | null;
  leasingPermittedQuantity: string | null;
  invoiceRealizedValue: string | null;
  invoiceRealizedQuantity: string | null;
  customsRealizedValue: string | null;
  customsRealizedQuantity: string | null;
  customsPermittedValue: string | null;
  customsPermittedQuantity: string | null;
  exportOutgoingValue: string | null;
  exportOutgoingQuantity: string | null;
  exportPermittedValue: string | null;
  exportPermittedQuantity: string | null;
  financialLeasingRealizedValue: string | null;
  financialLeasingRealizedQuantity: string | null;
  financialLeasingPermittedValue: string | null;
  financialLeasingPermittedQuantity: string | null;
  saleOutgoingValue: string | null;
  saleOutgoingQuantity: string | null;
  salePermittedValue: string | null;
  salePermittedQuantity: string | null;
  saleRealizedQuantity: string | null;
  saleRealizedValue: string | null;
  gtipCode: string | null;
  gtipDescription: string | null;
  transferDocumentNumber: string | null;
  transferIncomingQuantity: string | null;
  transferIncomingAmount: string | null;
  barcode: string | null;
  sellerTaxNumber: string | null;
  sellerEmail: string | null;
  financialLeasingCompany: string | null;
  machineryEquipmentType: string | null;
};
type Realization = NonNullable<DomesticMachine["realizations"]>[number];
type DomesticMachinesResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    items: DomesticMachine[];
  };
};
// --- Biçimlendirme ---
// Formatter'lar bir kez oluşturulur; her hücrede yeniden kurulmaz.
const MONEY_FMT = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const QTY_FMT = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});
function formatWith(
  fmt: Intl.NumberFormat,
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(num) ? fmt.format(num) : String(value);
}
const formatNumber = (v: string | number | null | undefined) =>
  formatWith(MONEY_FMT, v);
const formatQuantity = (v: string | number | null | undefined) =>
  formatWith(QTY_FMT, v);
function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("tr-TR", { timeZone: "UTC" })
    : null;
}
// vatExemption DB'de serbest metin; "1"/"0" dışındaki yazımları da tanır.
function flagLabel(value: string | null | undefined): "EVET" | "HAYIR" | undefined {
  if (value === null || value === undefined) return undefined;
  const v = value.trim().toLocaleLowerCase("tr-TR");
  if (["1", "evet", "e", "yes", "true"].includes(v)) return "EVET";
  if (["0", "hayır", "hayir", "h", "no", "false"].includes(v)) return "HAYIR";
  return undefined;
}
// "ADET(UNIT)" → "ADET" — parantez içindeki İngilizce karşılığı atar.
function shortUnit(unit: string) {
  return unit.replace(/\s*\([^)]*\)\s*$/, "").trim() || unit;
}
// --- Tablo stilleri ---
// sticky top-0 + opak arka plan zorunlu, aksi halde scroll'da hücre içerikleri sızar.
const HEAD_BASE =
  "sticky top-0 z-20 bg-slate-100 dark:bg-muted border-b-2 border-[#1e2a5e]/15 dark:border-blue-400/20 border-r border-border overflow-hidden text-ellipsis px-2 py-1 align-middle text-center text-[10px] font-bold uppercase leading-tight text-[#1e2a5e] dark:text-blue-300";
// Gövde hücreleri: tek satır, dar padding. Taşan içerik kırpılır,
// tam metin hover kutusunda görünür.
const CELL_BASE =
  "overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-border px-2 py-1 leading-tight";
const DEFAULT_SEQ_WIDTH = 40;
const DEFAULT_GTIP_WIDTH = 96;
const MIN_COL_WIDTH = 40;
const STICKY_SHADOW = "md:shadow-[5px_0_8px_-6px_rgba(15,23,42,0.35)]";
const FIT = "w-px whitespace-nowrap"; // sütun içeriği kadar daralır
// Soldaki ilk 3 sütunun yatay sabitlemesi — başlık ve gövde aynı class'ı kullanır.
const STICKY_COL = {
  seq: "md:sticky md:left-0",
  gtip: "md:sticky md:left-[var(--col1-left)]",
  name: `md:sticky md:left-[var(--col2-left)] ${STICKY_SHADOW}`,
};
// Başlık tanımları — sıra, gövdedeki <td> sırasıyla aynı olmalı.
// Para birimi (TL) her hücrede tekrar etmek yerine başlıkta yazılır.
const COLUMNS: { key: string; label: ReactNode; className: string }[] = [
  { key: "seq", label: "#", className: `${STICKY_COL.seq} md:z-40 w-[40px] min-w-[40px]` },
  {
    key: "gtipCode",
    label: "GTİP No",
    className: `${STICKY_COL.gtip} md:z-40 w-[96px] min-w-[96px]`,
  },
  {
    key: "name",
    label: "Adı / Özelliği",
    className: `${STICKY_COL.name} md:z-40 w-[200px] min-w-[200px] max-w-[200px]`,
  },
  { key: "machineId", label: <>Makine<br />ID</>, className: FIT },
  { key: "vat", label: "KDV", className: FIT },
  { key: "qty", label: "Miktar", className: FIT },
  { key: "unitPrice", label: <>Birim Fiyat<br />(TL)</>, className: FIT },
  {
    key: "sellerName",
    label: "Satıcı",
    className: "w-[140px] min-w-[140px] max-w-[140px]",
  },
  { key: "invoiceNumber", label: <>Fatura<br />No</>, className: FIT },
  { key: "invoiceDate", label: <>Fatura<br />Tarihi</>, className: FIT },
  { key: "invoiceAmount", label: <>Fatura<br />Tutarı (TL)</>, className: FIT },
  { key: "total", label: <>Tutar KDV<br />Hariç (TL)</>, className: FIT },
  { key: "invoiceQty", label: <>Fatura Gerç.<br />Miktar</>, className: FIT },
  {
    key: "gtipDesc",
    label: "GTİP Açıklama",
    className: "w-[180px] min-w-[180px] max-w-[180px]",
  },
  { key: "machineType", label: <>Makine<br />Tipi</>, className: FIT },
  { key: "sellerVkn", label: <>Satıcı<br />VKN</>, className: FIT },
  { key: "sellerEmail", label: <>Satıcı<br />E-Posta</>, className: FIT },
  { key: "barcode", label: "Barkod", className: `${FIT} border-r-0` },
];
const EMPTY = <span className="text-muted-foreground/50">—</span>;
// Bir makinenin fatura satırlarını alt alta listeler (4 sütunda ortak).
function realizationList(
  machine: DomesticMachine,
  render: (r: Realization) => ReactNode,
) {
  if (!machine.realizations?.length) return EMPTY;
  return (
    <div className="space-y-0.5">
      {machine.realizations.map((r) => (
        <div key={r.externalInvoiceLineId} className="truncate">
          {render(r) || "—"}
        </div>
      ))}
    </div>
  );
}
// Hücre hover kutusu: tablonun tamamı için tek bir dinleyici kullanılır.
// Kutu `fixed` konumlanır, böylece overflow-auto alanında kesilmez.
// Hücrenin gösterilecek metni varsayılan olarak görünen metnidir;
// farklı bir metin gerekiyorsa <td data-tip="..."> ile verilebilir.
type CellTip = { text: string; top: number; left: number; above: boolean };
function getCellTip(td: HTMLTableCellElement): CellTip | null {
  if (td.colSpan > 1) return null; // boş/yükleniyor satırları
  const text = (td.dataset.tip ?? td.innerText).replace(/\s+/g, " ").trim();
  if (!text || text === "—") return null;
  const r = td.getBoundingClientRect();
  const above = window.innerHeight - r.bottom < 160;
  return {
    text,
    top: above ? r.top - 2 : r.bottom + 2,
    left: Math.max(8, Math.min(r.left, window.innerWidth - 296)),
    above,
  };
}
export function AdminDocumentDomesticMachines({ documentId, isClosed = false }: AdminDocumentDomesticMachinesProps) {
  const [machines, setMachines] = useState<DomesticMachine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cellTip, setCellTip] = useState<CellTip | null>(null);
  const hoveredCellRef = useRef<HTMLTableCellElement | null>(null);
  const clearCellTip = () => {
    hoveredCellRef.current = null;
    setCellTip(null);
  };
  // --- Sütun boyutlandırma ---
  // Genişlikler yalnızca bu bileşenin state'inde tutulur (localStorage yok).
  // null = otomatik düzen. İlk sürüklemede mevcut genişlikler ölçülüp
  // sabitlenir ve tablo table-fixed'e geçer.
  const tableRef = useRef<HTMLTableElement>(null);
  const [colWidths, setColWidths] = useState<number[] | null>(null);
  const stopResizeRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopResizeRef.current?.(), []);
  const startResize = (index: number, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const ths = tableRef.current?.querySelectorAll<HTMLTableCellElement>(
      "thead th",
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
  const gtipWidth = colWidths?.[1] ?? DEFAULT_GTIP_WIDTH;
  const tableStyle = {
    "--col1-left": `${seqWidth}px`,
    "--col2-left": `${seqWidth + gtipWidth}px`,
    width: colWidths ? colWidths.reduce((a, b) => a + b, 0) : undefined,
  } as CSSProperties;
  useEffect(() => {
    if (!documentId) {
      setMachines([]);
      setLoadingMachines(false);
      return;
    }
    let cancelled = false;
    const loadMachines = async () => {
      try {
        setLoadingMachines(true);
        setError(null);
        const endpoint = isClosed
          ? `/closed-documents/${documentId}/domestic-machines`
          : `/documents/${documentId}/domestic-machines`;
        const response = await apiFetch<DomesticMachinesResponse>(endpoint);
        if (!cancelled) setMachines(response.data.items ?? []);
      } catch (err) {
        if (!cancelled) {
          setMachines([]);
          setError(err instanceof Error ? err.message : "Yerli liste alınırken bir hata oluştu.");
        }
      } finally {
        if (!cancelled) setLoadingMachines(false);
      }
    };
    void loadMachines();
    return () => { cancelled = true; };
  }, [documentId, isClosed]);
  return (
    <div className="space-y-4">
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
                Yerli Makine ve Teçhizat Kayıtları
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Belge kapsamında tanımlı yerli makineler, tutarlar ve KDV
                bilgileri.
              </p>
            </div>
          </div>
          {!loadingMachines && machines.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm dark:shadow-none">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c8102e]" />
              {machines.length} Kayıt
            </span>
          )}
        </div>
        {/* Tablo */}
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
                const td = (e.target as HTMLElement).closest("td");
                if (!td || td === hoveredCellRef.current) return;
                hoveredCellRef.current = td;
                setCellTip(getCellTip(td));
              }}
              onMouseLeave={clearCellTip}
            >
              {loadingMachines ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-5 py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e] dark:text-blue-300" />
                      <span className="text-sm text-muted-foreground">
                        Yükleniyor
                      </span>
                    </div>
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-5 py-8 text-center">
                    <p className="text-sm font-medium text-foreground/80">
                      Kayıt bulunamadı
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bu belgeye ait yerli makine kaydı mevcut değil.
                    </p>
                  </td>
                </tr>
              ) : (
                machines.map((machine, index) => {
                  // Sticky sütunların opak arka planı: zebra + hover ile eş güdümlü.
                  const stickyBg = `${index % 2 === 1
                    ? "bg-slate-50 dark:bg-muted/60"
                    : "bg-white dark:bg-card"
                    } group-hover:bg-[#f8f9fb] dark:group-hover:bg-muted/40`;
                  const qty = formatQuantity(machine.quantity);
                  const vatLabel = flagLabel(machine.vatExemption);
                  return (
                    <tr
                      key={machine.id}
                      className={`group transition-colors hover:bg-[#1e2a5e]/[0.03] dark:hover:bg-blue-400/5 ${index % 2 === 1 ? "bg-muted/40" : "bg-card"
                        }`}
                    >
                      {/* Sıra */}
                      <td
                        className={`${STICKY_COL.seq} md:z-10 ${CELL_BASE} text-right font-mono font-semibold tabular-nums text-muted-foreground ${stickyBg}`}
                      >
                        {machine.sequenceNumber ?? EMPTY}
                      </td>
                      {/* GTİP Kodu */}
                      <td
                        className={`${STICKY_COL.gtip} md:z-10 ${CELL_BASE} text-center font-mono font-semibold text-[#1e2a5e] dark:text-blue-300 ${stickyBg}`}
                      >
                        {machine.gtipCode ?? EMPTY}
                      </td>
                      {/* Ad */}
                      <td
                        className={`${STICKY_COL.name} md:z-10 w-[200px] min-w-[200px] max-w-[200px] ${CELL_BASE} font-semibold text-foreground ${stickyBg}`}
                      >
                        {machine.name ? (
                          <div className="truncate">{machine.name}</div>
                        ) : (
                          EMPTY
                        )}
                      </td>
                      {/* Makine ID */}
                      <td
                        className={`${CELL_BASE} text-center font-mono text-foreground/80`}
                      >
                        {machine.externalMachineId ?? EMPTY}
                      </td>
                      {/* KDV İstisnası */}
                      <td data-tip={vatLabel} className={`${CELL_BASE} text-center`}>
                        {vatLabel === "EVET" ? (
                          <Check
                            className="mx-auto h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                            strokeWidth={2.5}
                          />
                        ) : vatLabel === "HAYIR" ? (
                          <Minus className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          EMPTY
                        )}
                      </td>
                      {/* Miktar + Birim */}
                      <td
                        data-tip={
                          qty
                            ? [qty, machine.unit].filter(Boolean).join(" ")
                            : undefined
                        }
                        className={`${CELL_BASE} text-right font-mono tabular-nums text-foreground/80`}
                      >
                        {qty ? (
                          <>
                            {qty}
                            {machine.unit && (
                              <span className="ml-1 font-sans text-[9px] font-medium uppercase text-muted-foreground">
                                {shortUnit(machine.unit)}
                              </span>
                            )}
                          </>
                        ) : (
                          EMPTY
                        )}
                      </td>
                      {/* Birim Fiyat */}
                      <td
                        className={`${CELL_BASE} text-right font-mono tabular-nums text-foreground/80`}
                      >
                        {formatNumber(machine.unitPriceTl) ?? EMPTY}
                      </td>
                      {/* Satıcı */}
                      <td
                        className={`${CELL_BASE} w-[140px] min-w-[140px] max-w-[140px] text-left`}
                      >
                        {realizationList(machine, (r) => r.sellerName)}
                      </td>
                      {/* Fatura No */}
                      <td className={`${CELL_BASE} text-center`}>
                        {realizationList(machine, (r) => r.invoiceNumber)}
                      </td>
                      {/* Fatura Tarihi */}
                      <td className={`${CELL_BASE} text-center tabular-nums`}>
                        {realizationList(machine, (r) => formatDate(r.invoiceDate))}
                      </td>
                      {/* Fatura Tutarı */}
                      <td
                        className={`${CELL_BASE} text-right font-mono tabular-nums`}
                      >
                        {realizationList(machine, (r) =>
                          formatNumber(r.invoiceValue),
                        )}
                      </td>
                      {/* Tutar (KDV Hariç) */}
                      <td
                        className={`${CELL_BASE} text-right font-mono font-bold tabular-nums text-[#1e2a5e] dark:text-blue-300`}
                      >
                        {formatNumber(machine.totalTl) ?? EMPTY}
                      </td>
                      {/* Fatura Gerçekleşen Miktar */}
                      <td
                        className={`${CELL_BASE} text-right font-mono tabular-nums text-foreground/80`}
                      >
                        {formatQuantity(machine.invoiceRealizedQuantity) ?? "0"}
                      </td>
                      {/* GTİP Açıklama */}
                      <td
                        className={`${CELL_BASE} w-[180px] min-w-[180px] max-w-[180px] text-muted-foreground`}
                      >
                        {machine.gtipDescription ? (
                          <div className="truncate">{machine.gtipDescription}</div>
                        ) : (
                          EMPTY
                        )}
                      </td>
                      {/* Makine Tipi */}
                      <td
                        className={`${CELL_BASE} text-center text-muted-foreground`}
                      >
                        {machine.machineryEquipmentType ? (
                          <div className="mx-auto max-w-[120px] truncate">
                            {machine.machineryEquipmentType}
                          </div>
                        ) : (
                          EMPTY
                        )}
                      </td>
                      {/* Satıcı VKN */}
                      <td
                        className={`${CELL_BASE} text-center font-mono text-foreground/80`}
                      >
                        {machine.sellerTaxNumber ?? EMPTY}
                      </td>
                      {/* Satıcı E-Posta */}
                      <td className={`${CELL_BASE} text-center`}>
                        {machine.sellerEmail ? (
                          <a
                            href={`mailto:${machine.sellerEmail}`}
                            className="mx-auto block max-w-[160px] truncate font-medium text-[#1e2a5e] underline-offset-2 hover:underline dark:text-blue-300"
                          >
                            {machine.sellerEmail}
                          </a>
                        ) : (
                          EMPTY
                        )}
                      </td>
                      {/* Barkod */}
                      <td
                        className={`${CELL_BASE} border-r-0 text-center font-mono text-muted-foreground`}
                      >
                        {machine.barcode ?? EMPTY}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      {/* HÜCRE HOVER KUTUSU
          body'ye portal ile basılır: admin sayfasında bileşen transform/overflow
          içeren bir kapsayıcının (tab, kart, panel) içinde. Orada `fixed`
          ekrana değil kapsayıcıya göre konumlanır; kutu kapsayıcıyı taşırıp
          scrollbar açtırınca düzen kayar, fare başka hücreye geçer, kutu
          kapanır, scrollbar gider... ve ekran titrer. */}
      {cellTip &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: cellTip.top, left: cellTip.left }}
            className={`pointer-events-none fixed z-50 w-max max-w-[280px] rounded border border-border bg-popover px-2 py-1 text-[11px] leading-snug text-popover-foreground shadow-md ${cellTip.above ? "-translate-y-full" : ""
              }`}
          >
            {cellTip.text}
          </div>,
          document.body,
        )}
    </div>
  );
}