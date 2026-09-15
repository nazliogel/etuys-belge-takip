"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api";

interface AdminDocumentImportedMachinesProps {
  documentId: string;
  isClosed?: boolean;
}

type ImportedMachine = {
  id: number;
  externalMachineId: number | null;
  sequenceNumber: number | null;

  name: string | null;
  quantity: string | null;
  unit: string | null;
  machineryEquipmentType: string | null;

  gtipCode: string | null;
  gtipDescription: string | null;

  vatExemption: string | null;
  customsTaxExemption: string | null;

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

type ColumnKey =
  | "sequence"
  | "gtipCode"
  | "name"
  | "quantity"
  | "unit"
  | "originCurrency"
  | "fobUsd"
  | "customsTaxExemption"
  | "vatExemption"
  | "usedMachine"
  | "fobTl"
  | "cifTl"
  | "gtipDescription"
  | "machineId"
  | "machineType"
  | "vehicle"
  | "ckd";

type ColumnWidths = Record<ColumnKey, number>;

type ResizeState = {
  column: ColumnKey;
  startX: number;
  startWidth: number;
  pointerId: number;
};

const COLUMN_STORAGE_KEY = "imported-machines-column-widths-v1";

const MIN_COLUMN_WIDTH = 45;
const MAX_COLUMN_WIDTH = 500;

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  sequence: 42,
  gtipCode: 80,
  name: 180,
  quantity: 52,
  unit: 70,
  originCurrency: 105,
  fobUsd: 90,
  customsTaxExemption: 92,
  vatExemption: 62,
  usedMachine: 90,
  fobTl: 72,
  cifTl: 72,
  gtipDescription: 105,
  machineId: 65,
  machineType: 72,
  vehicle: 46,
  ckd: 42,
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

function normalizeFlag(
  value: string | null | undefined,
): "YES" | "NO" | "EMPTY" {
  if (value === null || value === undefined || value === "") {
    return "EMPTY";
  }

  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "1" ||
    normalized === "evet" ||
    normalized === "yes" ||
    normalized === "true" ||
    normalized === "e"
  ) {
    return "YES";
  }

  if (
    normalized === "0" ||
    normalized === "hayır" ||
    normalized === "hayir" ||
    normalized === "no" ||
    normalized === "false" ||
    normalized === "h"
  ) {
    return "NO";
  }

  return "EMPTY";
}

const HEAD_BASE =
  "sticky top-0 z-20 bg-slate-100 border-b-2 border-[#1e2a5e]/15 border-r border-slate-200 px-1 py-1.5 text-[9px] font-bold uppercase tracking-normal text-slate-500 shadow-[inset_0_-1px_0_rgba(30,42,94,0.15)]";

export function AdminDocumentImportedMachines({
  documentId,
  isClosed = false,
}: AdminDocumentImportedMachinesProps) {
  const [machines, setMachines] = useState<ImportedMachine[]>([]);
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
      // localStorage okunamazsa varsayılan genişlikler kullanılır.
    }
  }, []);

  useEffect(() => {
    async function loadMachines() {
      setIsLoading(true);
      setLoadError("");

      try {
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

    const minimumWidth =
      resizeState.column === "sequence" || resizeState.column === "ckd"
        ? 42
        : MIN_COLUMN_WIDTH;

    const nextWidth = Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(minimumWidth, resizeState.startWidth + difference),
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
            İthal Makine ve Teçhizat Listesi
          </h3>

          <p className="mt-0.5 text-[10px] text-slate-400">
            Belgede tanımlı ithal makine, FOB ve muafiyet bilgileri
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
            İthal liste yükleniyor...
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
            Bu belgeye ait ithal makine kaydı mevcut değil.
          </p>
        </div>
      ) : (
        <div className="admin-table-scroll max-h-[70vh] overflow-auto pb-1">
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
              <col style={{ width: columnWidths.quantity }} />
              <col style={{ width: columnWidths.unit }} />
              <col style={{ width: columnWidths.originCurrency }} />
              <col style={{ width: columnWidths.fobUsd }} />
              <col style={{ width: columnWidths.customsTaxExemption }} />
              <col style={{ width: columnWidths.vatExemption }} />
              <col style={{ width: columnWidths.usedMachine }} />
              <col style={{ width: columnWidths.fobTl }} />
              <col style={{ width: columnWidths.cifTl }} />
              <col style={{ width: columnWidths.gtipDescription }} />
              <col style={{ width: columnWidths.machineId }} />
              <col style={{ width: columnWidths.machineType }} />
              <col style={{ width: columnWidths.vehicle }} />
              <col style={{ width: columnWidths.ckd }} />
            </colgroup>

            <thead>
              <tr className="text-left">
                {/* SIRA */}
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

                {/* GTİP NO */}
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

                {/* ADI VE ÖZELLİĞİ */}
                <th
                  className={`${HEAD_BASE} z-40`}
                  style={{
                    left: nameLeft,
                    width: columnWidths.name,
                  }}
                >
                  Adı ve Özelliği
                  {resizeHandle("name", "Adı ve Özelliği")}
                </th>

                {/* MİKTARI */}
                <th className={`${HEAD_BASE} text-right`}>
                  Miktarı
                  {resizeHandle("quantity", "Miktarı")}
                </th>

                {/* BİRİM */}
                <th className={HEAD_BASE}>
                  Birim
                  {resizeHandle("unit", "Birim")}
                </th>

                {/* MENŞEİ ÜLKE DÖVİZ BİRİM FİYAT */}
                <th
                  className={`${HEAD_BASE} whitespace-normal text-right text-[8px] leading-[1.15]`}
                >
                  Menşei Ülke Döviz
                  <br />
                  Birim Fiyat (FOB)
                  {resizeHandle(
                    "originCurrency",
                    "Menşei Ülke Döviz Birim Fiyat FOB",
                  )}
                </th>

                {/* TOPLAM FOB USD */}
                <th
                  className={`${HEAD_BASE} whitespace-normal text-right text-[8px] leading-[1.15]`}
                >
                  Toplam Tutar
                  <br />
                  (FOB $)
                  {resizeHandle("fobUsd", "Toplam Tutar FOB USD")}
                </th>

                {/* GÜMRÜK */}
                <th
                  className={`${HEAD_BASE} whitespace-normal text-center text-[8px] leading-[1.15]`}
                >
                  Gümrük Vergisi
                  <br />
                  İstisnası
                  {resizeHandle(
                    "customsTaxExemption",
                    "Gümrük Vergisi İstisnası",
                  )}
                </th>

                {/* KDV */}
                <th
                  className={`${HEAD_BASE} whitespace-normal text-center text-[8px] leading-[1.15]`}
                >
                  KDV
                  <br />
                  İstisnası
                  {resizeHandle("vatExemption", "KDV İstisnası")}
                </th>

                {/* KULLANILMIŞ MAKİNE */}
                <th
                  className={`${HEAD_BASE} whitespace-normal text-center leading-tight`}
                >
                  Kullanılmış
                  <br />
                  Makine
                  {resizeHandle("usedMachine", "Kullanılmış Makine")}
                </th>

                {/* FOB TL */}
                <th className={`${HEAD_BASE} text-right`}>
                  FOB
                  <br />
                  TL
                  {resizeHandle("fobTl", "FOB TL")}
                </th>

                {/* CIF TL */}
                <th className={`${HEAD_BASE} text-right`}>
                  CIF
                  <br />
                  TL
                  {resizeHandle("cifTl", "CIF TL")}
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

                <th className={`${HEAD_BASE} text-center`}>
                  Araç
                  {resizeHandle("vehicle", "Araç")}
                </th>

                <th className={`${HEAD_BASE} border-r-0 text-center`}>
                  CKD
                  {resizeHandle("ckd", "CKD")}
                </th>
              </tr>
            </thead>

            <tbody>
              {machines.map((machine, index) => {
                const rowBackground =
                  index % 2 === 1 ? "bg-slate-50" : "bg-white";

                const quantity = formatQuantity(machine.quantity);

                const fobUsd = machine.totalFobUsd
                  ? `${formatNumber(machine.totalFobUsd)} USD`
                  : "-";

                const fobTl = machine.totalFobTl
                  ? `${formatNumber(machine.totalFobTl)} TL`
                  : "-";

                const cifTl = machine.totalCifTl
                  ? `${formatNumber(machine.totalCifTl)} TL`
                  : "-";

                const originCurrency = machine.originCurrencyFobAmount
                  ? `${formatNumber(machine.originCurrencyFobAmount)} ${
                      machine.originCurrencyFob ?? ""
                    }`
                  : "-";

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
                      className={`sticky z-10 border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] font-semibold text-slate-600 ${rowBackground}`}
                      style={{
                        left: sequenceLeft,
                        width: columnWidths.sequence,
                      }}
                    >
                      {machine.sequenceNumber ?? "-"}
                    </td>

                    {/* GTİP */}
                    <td
                      title={machine.gtipCode ?? "-"}
                      className={`sticky z-10 border-b border-r border-slate-200 px-1 py-1.5 font-mono text-[9px] text-slate-700 ${rowBackground}`}
                      style={{
                        left: gtipLeft,
                        width: columnWidths.gtipCode,
                      }}
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.gtipCode ?? "-"}
                      </div>
                    </td>

                    {/* ADI */}
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

                    {/* MENŞEİ DÖVİZ FOB */}
                    <td
                      title={originCurrency}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {originCurrency}
                      </div>
                    </td>

                    {/* FOB USD */}
                    <td
                      title={fobUsd}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] font-bold text-slate-900"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {fobUsd}
                      </div>
                    </td>

                    {/* GÜMRÜK */}
                    <td className="border-b border-r border-slate-200 px-1 py-1.5 text-center">
                      <CompactFlag value={machine.customsTaxExemption} />
                    </td>

                    {/* KDV */}
                    <td className="border-b border-r border-slate-200 px-1 py-1.5 text-center">
                      <CompactFlag value={machine.vatExemption} />
                    </td>

                    {/* KULLANILMIŞ MAKİNE */}
                    <td
                      title={machine.usedMachine ?? "-"}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-center text-[10px] font-semibold text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.usedMachine ?? "-"}
                      </div>
                    </td>

                    {/* FOB TL */}
                    <td
                      title={fobTl}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {fobTl}
                      </div>
                    </td>

                    {/* CIF TL */}
                    <td
                      title={cifTl}
                      className="border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {cifTl}
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
                      className="border-b border-r border-slate-200 px-1 py-1.5 font-mono text-[9px] text-slate-700"
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

                    {/* ARAÇ */}
                    <td className="border-b border-r border-slate-200 px-1 py-1.5 text-center">
                      <CompactFlag value={machine.isVehicle} />
                    </td>

                    {/* CKD */}
                    <td className="border-b border-slate-200 px-1 py-1.5 text-center">
                      <CompactFlag value={machine.isCkd} />
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

function CompactFlag({ value }: { value: string | null | undefined }) {
  const normalized = normalizeFlag(value);

  if (normalized === "YES") {
    return (
      <span title="EVET" className="text-[9px] font-semibold text-slate-700">
        EVET
      </span>
    );
  }

  if (normalized === "NO") {
    return (
      <span title="HAYIR" className="text-[9px] font-medium text-slate-500">
        HAYIR
      </span>
    );
  }

  return <span className="text-slate-300">-</span>;
}
