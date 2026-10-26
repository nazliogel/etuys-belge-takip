"use client";

import {
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
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

type DomesticMachinesResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    items: DomesticMachine[];
  };
};

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

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

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num);
}

// Sabit başlık için ortak class'lar — her <th>'ye uygulanacak.
// sticky top-0 + opak arka plan zorunlu, aksi halde scroll'da hücre içerikleri sızar.
// Kompakt yoğunluk: dar padding, küçük font, uzun başlıklar 2 satıra kırılabilir.
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
  { key: "qty", label: "Miktar", className: "w-px whitespace-nowrap" },
  { key: "unit", label: "Birim", className: "w-px whitespace-nowrap" },
  {
    key: "unitPrice",
    label: <>Birim<br />Fiyat</>,
    className: "w-px whitespace-nowrap",
  },
  {
    key: "total",
    label: <>Tutar<br />(KDV Hariç)</>,
    className: "w-px whitespace-nowrap",
  },
  {
    key: "invoiceQty",
    label: <>Fatura Gerç.<br />Miktar</>,
    className: "w-px whitespace-nowrap",
  },
  {
    key: "invoiceValue",
    label: <>Fatura Gerç.<br />Değer</>,
    className: "w-px whitespace-nowrap",
  },
  { key: "vat", label: <>KDV<br />İst.</>, className: "w-px whitespace-nowrap" },
  { key: "gtipCode", label: "GTİP No", className: FIT },
  {
    key: "gtipDesc",
    label: "GTİP Açıklama",
    className: "w-[220px] min-w-[220px] max-w-[220px]",
  },
  { key: "machineType", label: <>Makine<br />Tipi</>, className: FIT },
  { key: "sellerVkn", label: <>Satıcı<br />VKN</>, className: FIT },
  { key: "sellerEmail", label: <>Satıcı<br />E-Posta</>, className: FIT },
  { key: "barcode", label: "Barkod", className: `${FIT} border-r-0` },
];

const EMPTY = <span className="text-muted-foreground/50">—</span>;

// "ADET(UNIT)" → "ADET" — parantez içindeki İngilizce karşılığı atar.
function shortUnit(unit: string) {
  return unit.replace(/\s*\(.*\)\s*$/, "").trim() || unit;
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

export function DomesticMachinesScreen() {
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [machines, setMachines] = useState<DomesticMachine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentStatus, setSelectedDocumentStatus] =
    useState<SelectedDocumentStatus>("OPEN");

  const [cellTip, setCellTip] = useState<CellTip | null>(null);
  const hoveredCellRef = useRef<HTMLTableCellElement | null>(null);

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
          ? `/closed-documents/${selectedDocumentId}/domestic-machines`
          : `/documents/${selectedDocumentId}/domestic-machines`;

        const response = await apiFetch<DomesticMachinesResponse>(endpoint);

        setMachines(response.data.items ?? []);

        if (response.data.documentNumber) {
          setSelectedDocumentNumber(response.data.documentNumber);
        }
      } catch (err) {
        setMachines([]);

        setError(
          err instanceof Error
            ? err.message
            : "Yerli liste alınırken bir hata oluştu.",
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
          Yerli Makine ve Teçhizat Listesi
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Seçili yatırım teşvik belgesine ait yerli makine ve teçhizat
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
                Yerli Makine ve Teçhizat Kayıtları
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Belge kapsamında tanımlı yerli makineler, tutarlar ve KDV
                bilgileri.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">


            {!loadingMachines && selectedDocumentId && machines.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm dark:shadow-none">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c8102e]" />
                {machines.length} Kayıt
              </span>
            )}
          </div>
        </div>

        {/* Tablo */}
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
                const td = (e.target as HTMLElement).closest("td");
                if (!td || td === hoveredCellRef.current) return;
                hoveredCellRef.current = td;
                setCellTip(getCellTip(td));
              }}
              onMouseLeave={clearCellTip}
            >
              {!selectedDocumentId ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-5 py-14 text-center">
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
                  <td colSpan={COLUMNS.length} className="px-5 py-14">
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
                  <td colSpan={COLUMNS.length} className="px-5 py-14 text-center">
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
                  // Sticky sütunların opak arka planı: zebra + hover ile eş güdümlü.
                  const stickyBg =
                    index % 2 === 1
                      ? "bg-slate-50 dark:bg-muted/60"
                      : "bg-white dark:bg-card";
                  const stickyHover =
                    "group-hover:bg-[#f8f9fb] dark:group-hover:bg-muted/40";

                  return (
                    <tr
                      key={machine.id}
                      className={`group transition-colors hover:bg-[#1e2a5e]/[0.03] dark:hover:bg-blue-400/5 ${index % 2 === 1 ? "bg-muted/40" : "bg-card"
                        }`}
                    >
                      {/* Sıra */}
                      <td
                        className={`md:sticky md:left-0 md:z-10 w-[52px] min-w-[52px] ${CELL_BASE} text-right font-mono font-semibold tabular-nums text-muted-foreground ${stickyBg} ${stickyHover}`}
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
                        className={`md:sticky md:left-[var(--col2-left)] md:z-10 w-[220px] min-w-[220px] max-w-[220px] ${CELL_BASE} font-semibold leading-snug text-foreground md:shadow-[5px_0_8px_-6px_rgba(15,23,42,0.35)] ${stickyBg} ${stickyHover}`}
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

                      {/* Miktar */}
                      <td
                        className={`${CELL_BASE} whitespace-nowrap text-right font-mono tabular-nums text-foreground/80`}
                      >
                        {formatQuantity(machine.quantity) ?? EMPTY}
                      </td>

                      {/* Birim */}
                      <td
                        data-tip={machine.unit ?? undefined}
                        className={`${CELL_BASE} w-px whitespace-nowrap text-muted-foreground`}
                      >
                        {machine.unit ? (
                          <span
                            className="inline-flex rounded bg-muted px-1.5 py-px text-[10px] font-medium uppercase text-foreground/80"
                          >
                            {shortUnit(machine.unit)}
                          </span>
                        ) : (
                          EMPTY
                        )}
                      </td>

                      {/* Birim Fiyat */}
                      <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                        {formatNumber(machine.unitPriceTl) ? (
                          <span className="font-mono tabular-nums text-foreground/80">
                            {formatNumber(machine.unitPriceTl)}
                            <span className="ml-1 text-[9px] font-medium uppercase text-muted-foreground">
                              TL
                            </span>
                          </span>
                        ) : (
                          EMPTY
                        )}
                      </td>

                      {/* Tutar */}
                      <td className={`${CELL_BASE} whitespace-nowrap text-right`}>
                        {formatNumber(machine.totalTl) ? (
                          <span className="font-mono font-bold tabular-nums text-[#1e2a5e] dark:text-blue-300">
                            {formatNumber(machine.totalTl)}
                            <span className="ml-1 text-[9px] font-semibold uppercase text-muted-foreground">
                              TL
                            </span>
                          </span>
                        ) : (
                          EMPTY
                        )}
                      </td>

                      {/* Fatura Gerçekleşen Miktar */}
                      <td
                        className={`${CELL_BASE} whitespace-nowrap text-right font-mono tabular-nums text-foreground/80`}
                      >
                        {formatQuantity(machine.invoiceRealizedQuantity) ??
                          "0"}
                      </td>

                      {/* Fatura Gerçekleşen Değer */}
                      <td
                        className={`${CELL_BASE} whitespace-nowrap text-right font-mono tabular-nums text-foreground/80`}
                      >
                        {formatNumber(machine.invoiceRealizedValue) ?? "0"}
                      </td>

                      {/* KDV İstisnası */}
                      <td
                        className={`${CELL_BASE} whitespace-nowrap text-center text-[11px] font-semibold text-foreground/80`}
                      >
                        {machine.vatExemption === "1"
                          ? "EVET"
                          : machine.vatExemption === "0"
                            ? "HAYIR"
                            : EMPTY}
                      </td>

                      {/* GTİP Kodu */}
                      <td className={`${CELL_BASE} w-px whitespace-nowrap text-center`}>
                        {machine.gtipCode ? (
                          <span className="inline-flex whitespace-nowrap rounded border border-[#1e2a5e]/20 bg-[#1e2a5e]/[0.05] px-1.5 py-px font-mono text-[11px] font-semibold text-[#1e2a5e] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300">
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

                      {/* Makine Tipi */}
                      <td
                        className={`${CELL_BASE} w-px whitespace-nowrap text-center text-muted-foreground`}
                      >
                        {displayValue(machine.machineryEquipmentType) === "-" ? (
                          EMPTY
                        ) : (
                          <div className="mx-auto max-w-[140px] truncate">
                            {machine.machineryEquipmentType}
                          </div>
                        )}
                      </td>

                      {/* Satıcı VKN */}
                      <td className={`${CELL_BASE} w-px whitespace-nowrap text-center`}>
                        {machine.sellerTaxNumber ? (
                          <span className="font-mono text-[11px] font-medium text-foreground/80">
                            {machine.sellerTaxNumber}
                          </span>
                        ) : (
                          EMPTY
                        )}
                      </td>

                      {/* Satıcı E-Posta */}
                      <td className={`${CELL_BASE} w-px whitespace-nowrap text-center`}>
                        {machine.sellerEmail ? (
                          <a
                            href={`mailto:${machine.sellerEmail}`}
                            className="mx-auto block max-w-[180px] truncate text-[11px] font-medium text-[#1e2a5e] underline-offset-2 hover:underline dark:text-blue-300"
                          >
                            {machine.sellerEmail}
                          </a>
                        ) : (
                          EMPTY
                        )}
                      </td>

                      {/* Barkod */}
                      <td className="w-px overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-1.5 text-center">
                        {machine.barcode ? (
                          <span className="font-mono text-[11px] text-muted-foreground">
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