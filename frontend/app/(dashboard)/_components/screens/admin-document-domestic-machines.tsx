"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Loader2 } from "lucide-react";

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

type ColumnKey =
  | "sequence"
  | "gtipCode"
  | "name"
  | "vatExemption"
  | "quantity"
  | "unit"
  | "unitPrice"
  | "invoiceQuantity"
  | "invoiceValue"
  | "total"
  | "gtipDescription"
  | "machineId"
  | "machineType"
  | "sellerTaxNumber"
  | "sellerEmail"
  | "barcode";

type ColumnWidths = Record<ColumnKey, number>;

type ResizeState = {
  column: ColumnKey;
  startX: number;
  startWidth: number;
  pointerId: number;
};

const COLUMN_STORAGE_KEY = "domestic-machines-column-widths-v1";

const MIN_COLUMN_WIDTH = 45;
const MAX_COLUMN_WIDTH = 500;

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  sequence: 42,
  gtipCode: 80,
  name: 180,
  vatExemption: 52,
  quantity: 46,
  unit: 64,
  unitPrice: 64,
  invoiceQuantity: 68,
  invoiceValue: 68,
  total: 70,
  gtipDescription: 105,
  machineId: 65,
  machineType: 72,
  sellerTaxNumber: 72,
  sellerEmail: 88,
  barcode: 72,
};

function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const normalized = String(value).replace(",", ".").trim();
  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatQuantity(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const normalized = String(value).replace(",", ".").trim();
  const number = Number(normalized);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(number);
}

const HEAD_BASE =
  "sticky top-0 z-20 relative bg-slate-100 border-b-2 border-[#1e2a5e]/15 border-r border-slate-200 px-1 py-1.5 text-[9px] font-bold uppercase tracking-normal text-slate-500 shadow-[inset_0_-1px_0_rgba(30,42,94,0.15)]";

export function AdminDocumentDomesticMachines({
  documentId,
  isClosed = false,
}: AdminDocumentDomesticMachinesProps) {
  const [machines, setMachines] = useState<DomesticMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(
    DEFAULT_COLUMN_WIDTHS,
  );

  const columnWidthsRef = useRef<ColumnWidths>(DEFAULT_COLUMN_WIDTHS);
  const resizeStateRef = useRef<ResizeState | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<ColumnWidths>;

      const nextWidths: ColumnWidths = {
        ...DEFAULT_COLUMN_WIDTHS,
        ...parsed,
      };

      columnWidthsRef.current = nextWidths;
      setColumnWidths(nextWidths);
    } catch {
      // localStorage okunamazsa varsayılan değerler kullanılır.
    }
  }, []);

  useEffect(() => {
    async function loadMachines() {
      setIsLoading(true);
      setLoadError("");

      try {
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
    }

    void loadMachines();
  }, [documentId, isClosed]);

  const handleResizeStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    column: ColumnKey,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      column,
      startX: event.clientX,
      startWidth: columnWidthsRef.current[column],
      pointerId: event.pointerId,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeState = resizeStateRef.current;

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const difference = event.clientX - resizeState.startX;

    const nextWidth = Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(
        resizeState.column === "sequence" ? 42 : MIN_COLUMN_WIDTH,
        resizeState.startWidth + difference,
      ),
    );

    setColumnWidths((current) => {
      const next = {
        ...current,
        [resizeState.column]: nextWidth,
      };

      columnWidthsRef.current = next;

      return next;
    });
  };

  const handleResizeEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeState = resizeStateRef.current;

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer zaten bırakılmış olabilir.
    }

    resizeStateRef.current = null;

    try {
      window.localStorage.setItem(
        COLUMN_STORAGE_KEY,
        JSON.stringify(columnWidthsRef.current),
      );
    } catch {
      // localStorage kullanılamıyorsa devam et.
    }
  };

  const resizeHandle = (column: ColumnKey, label: string) => (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`${label} sütun genişliğini değiştir`}
      onPointerDown={(event) => handleResizeStart(event, column)}
      onPointerMove={handleResizeMove}
      onPointerUp={handleResizeEnd}
      onPointerCancel={handleResizeEnd}
      className="group absolute right-0 top-0 z-50 h-full w-2 cursor-col-resize touch-none select-none"
    >
      <span className="mx-auto block h-full w-px bg-transparent transition-colors group-hover:bg-blue-500" />
    </button>
  );

  const sequenceLeft = 0;

  const gtipLeft = columnWidths.sequence;

  const nameLeft = columnWidths.sequence + columnWidths.gtipCode;

  const totalTableWidth = Object.values(columnWidths).reduce(
    (total, width) => total + width,
    0,
  );

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
            Yerli Makine ve Teçhizat Listesi
          </h3>

          <p className="mt-0.5 text-[10px] text-slate-400">
            Belgede tanımlı yerli makine, miktar ve tutar bilgileri
          </p>
        </div>

        {!isLoading && machines.length > 0 && (
          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            {machines.length} Kayıt
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />

          <span className="text-xs text-slate-500">
            Yerli liste yükleniyor...
          </span>
        </div>
      ) : loadError ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-semibold text-red-600">{loadError}</p>
        </div>
      ) : machines.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-medium text-slate-600">Kayıt bulunamadı</p>

          <p className="mt-1 text-[10px] text-slate-400">
            Bu belgeye ait yerli makine kaydı mevcut değil.
          </p>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-auto">
          <table
            className="table-fixed border-separate border-spacing-0 text-left"
            style={{
              width: `${totalTableWidth}px`,
              minWidth: `${totalTableWidth}px`,
            }}
          >
            <colgroup>
              <col style={{ width: columnWidths.sequence }} />
              <col style={{ width: columnWidths.gtipCode }} />
              <col style={{ width: columnWidths.name }} />
              <col style={{ width: columnWidths.vatExemption }} />
              <col style={{ width: columnWidths.quantity }} />
              <col style={{ width: columnWidths.unit }} />
              <col style={{ width: columnWidths.unitPrice }} />
              <col style={{ width: columnWidths.invoiceQuantity }} />
              <col style={{ width: columnWidths.invoiceValue }} />
              <col style={{ width: columnWidths.total }} />
              <col style={{ width: columnWidths.gtipDescription }} />
              <col style={{ width: columnWidths.machineId }} />
              <col style={{ width: columnWidths.machineType }} />
              <col style={{ width: columnWidths.sellerTaxNumber }} />
              <col style={{ width: columnWidths.sellerEmail }} />
              <col style={{ width: columnWidths.barcode }} />
            </colgroup>

            <thead>
              <tr className="text-left">
                <th
                  className={`${HEAD_BASE} z-40 text-right`}
                  style={{
                    left: sequenceLeft,
                    width: columnWidths.sequence,
                  }}
                >
                  Sıra
                  {resizeHandle("sequence", "Sıra")}
                </th>

                <th
                  className={`${HEAD_BASE} z-40`}
                  style={{
                    left: gtipLeft,
                    width: columnWidths.gtipCode,
                  }}
                >
                  GTİP No
                  {resizeHandle("gtipCode", "GTİP No")}
                </th>

                <th
                  className={`${HEAD_BASE} z-40`}
                  style={{
                    left: nameLeft,
                    width: columnWidths.name,
                  }}
                >
                  Adı / Özelliği
                  {resizeHandle("name", "Adı / Özelliği")}
                </th>

                <th className={HEAD_BASE}>
                  KDV
                  <br />
                  İstisnası
                  {resizeHandle("vatExemption", "KDV İstisnası")}
                </th>

                <th className={`${HEAD_BASE} text-right`}>
                  Miktar
                  {resizeHandle("quantity", "Miktar")}
                </th>

                <th className={HEAD_BASE}>
                  Birim
                  {resizeHandle("unit", "Birim")}
                </th>

                <th className={`${HEAD_BASE} text-right leading-tight`}>
                  Birim
                  <br />
                  Fiyat
                  {resizeHandle("unitPrice", "Birim Fiyat")}
                </th>

                <th className={`${HEAD_BASE} text-right leading-tight`}>
                  Fatura
                  <br />
                  Gerç. Miktar
                  {resizeHandle("invoiceQuantity", "Fatura Gerçekleşen Miktar")}
                </th>

                <th className={`${HEAD_BASE} text-right leading-tight`}>
                  Fatura
                  <br />
                  Gerç. Değer
                  {resizeHandle("invoiceValue", "Fatura Gerçekleşen Değer")}
                </th>

                <th className={`${HEAD_BASE} text-right leading-tight`}>
                  Toplam
                  <br />
                  Tutar
                  {resizeHandle("total", "Toplam Tutar")}
                </th>

                <th className={HEAD_BASE}>
                  GTİP Açıklama
                  {resizeHandle("gtipDescription", "GTİP Açıklama")}
                </th>

                <th className={HEAD_BASE}>
                  Makine ID
                  {resizeHandle("machineId", "Makine ID")}
                </th>

                <th className={HEAD_BASE}>
                  Makine Tipi
                  {resizeHandle("machineType", "Makine Tipi")}
                </th>

                <th className={HEAD_BASE}>
                  Satıcı VKN
                  {resizeHandle("sellerTaxNumber", "Satıcı VKN")}
                </th>

                <th className={HEAD_BASE}>
                  Satıcı E-Posta
                  {resizeHandle("sellerEmail", "Satıcı E-Posta")}
                </th>

                <th className={`${HEAD_BASE} border-r-0`}>
                  Barkod
                  {resizeHandle("barcode", "Barkod")}
                </th>
              </tr>
            </thead>

            <tbody>
              {machines.map((machine, index) => {
                const rowBackground =
                  index % 2 === 1 ? "bg-slate-50" : "bg-white";

                const quantity = formatQuantity(machine.quantity);
                const unitPrice = formatNumber(machine.unitPriceTl);
                const total = formatNumber(machine.totalTl);

                const invoiceQuantity =
                  machine.invoiceRealizedQuantity === null ||
                  machine.invoiceRealizedQuantity === undefined ||
                  machine.invoiceRealizedQuantity === ""
                    ? "0"
                    : formatQuantity(machine.invoiceRealizedQuantity);

                const invoiceValue =
                  machine.invoiceRealizedValue === null ||
                  machine.invoiceRealizedValue === undefined ||
                  machine.invoiceRealizedValue === ""
                    ? "0"
                    : String(Number(machine.invoiceRealizedValue));

                return (
                  <tr
                    key={machine.id}
                    className={
                      index % 2 === 1
                        ? "bg-slate-50/40 hover:bg-slate-50"
                        : "bg-white hover:bg-slate-50"
                    }
                  >
                    {/* SIRA */}
                    <td
                      title={String(machine.sequenceNumber ?? "-")}
                      className={`sticky z-10 border-b border-r border-slate-200 px-1.5 py-1.5 text-right font-mono text-[10px] font-semibold text-slate-600 ${rowBackground}`}
                      style={{
                        left: sequenceLeft,
                        width: columnWidths.sequence,
                      }}
                    >
                      {machine.sequenceNumber ?? "-"}
                    </td>

                    {/* GTİP NO */}
                    <td
                      title={machine.gtipCode ?? "-"}
                      className={`sticky z-10 border-b border-r border-slate-200 px-1.5 py-1.5 font-mono text-[9px] text-slate-700 ${rowBackground}`}
                      style={{
                        left: gtipLeft,
                        width: columnWidths.gtipCode,
                      }}
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.gtipCode ?? "-"}
                      </div>
                    </td>

                    {/* ADI / ÖZELLİĞİ */}
                    <td
                      title={machine.name ?? "-"}
                      className={`sticky z-10 border-b border-r border-slate-200 px-1.5 py-1.5 text-[11px] font-semibold text-slate-900 ${rowBackground}`}
                      style={{
                        left: nameLeft,
                        width: columnWidths.name,
                      }}
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.name ?? "-"}
                      </div>
                    </td>

                    {/* KDV */}
                    <td className="border-b border-r border-slate-200 px-1 py-1.5 text-[10px] font-semibold text-slate-700">
                      {machine.vatExemption === "1"
                        ? "EVET"
                        : machine.vatExemption === "0"
                          ? "HAYIR"
                          : "-"}
                    </td>

                    {/* MİKTAR */}
                    <td
                      title={quantity}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {quantity}
                      </div>
                    </td>

                    {/* BİRİM */}
                    <td
                      title={machine.unit ?? "-"}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.unit ?? "-"}
                      </div>
                    </td>

                    {/* BİRİM FİYAT */}
                    <td
                      title={unitPrice}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {unitPrice}
                      </div>
                    </td>

                    {/* FATURA GERÇEKLEŞEN MİKTAR */}
                    <td
                      title={invoiceQuantity}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {invoiceQuantity}
                      </div>
                    </td>

                    {/* FATURA GERÇEKLEŞEN DEĞER */}
                    <td
                      title={invoiceValue}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {invoiceValue}
                      </div>
                    </td>

                    {/* TOPLAM TUTAR */}
                    <td
                      title={total}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] font-bold text-slate-900"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {total}
                      </div>
                    </td>

                    {/* GTİP AÇIKLAMA */}
                    <td
                      title={machine.gtipDescription ?? "-"}
                      className="border-b border-r border-slate-200 px-1.5 py-1.5 text-[10px] text-slate-600"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.gtipDescription ?? "-"}
                      </div>
                    </td>

                    {/* MAKİNE ID */}
                    <td
                      title={String(machine.externalMachineId ?? "-")}
                      className="border-b border-r border-slate-200 px-1.5 py-1.5 font-mono text-[9px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.externalMachineId ?? "-"}
                      </div>
                    </td>

                    {/* MAKİNE TİPİ */}
                    <td
                      title={machine.machineryEquipmentType ?? "-"}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-[10px] text-slate-600"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.machineryEquipmentType ?? "-"}
                      </div>
                    </td>

                    {/* SATICI VKN */}
                    <td
                      title={machine.sellerTaxNumber ?? "-"}
                      className="border-b border-r border-slate-200 px-1 py-1.5 font-mono text-[9px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.sellerTaxNumber ?? "-"}
                      </div>
                    </td>

                    {/* SATICI E-POSTA */}
                    <td
                      title={machine.sellerEmail ?? "-"}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-[9px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.sellerEmail ?? "-"}
                      </div>
                    </td>

                    {/* BARKOD */}
                    <td
                      title={machine.barcode ?? "-"}
                      className="border-b border-slate-200 px-1 py-1.5 font-mono text-[9px] text-slate-600"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.barcode ?? "-"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
