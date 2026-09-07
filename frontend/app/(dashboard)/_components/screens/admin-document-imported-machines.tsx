"use client";

import { useEffect, useState } from "react";
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
          <table className="w-max min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-left">
                {/* 1 - SIRA */}
                <th
                  className={`${HEAD_BASE} left-0 z-40 w-[42px] min-w-[42px] max-w-[42px] text-right`}
                >
                  Sıra
                </th>

                {/* 2 - GTİP NO */}
                <th
                  className={`${HEAD_BASE} left-[42px] z-40 w-[80px] min-w-[80px] max-w-[80px]`}
                >
                  GTİP No
                </th>

                {/* 3 - ADI VE ÖZELLİĞİ */}
                <th
                  className={`${HEAD_BASE} left-[122px] z-40 w-[180px] min-w-[180px] max-w-[180px]`}
                >
                  Adı ve Özelliği
                </th>

                {/* 4 - MİKTARI */}
                <th
                  className={`${HEAD_BASE} w-[52px] min-w-[52px] max-w-[52px] text-right`}
                >
                  Miktarı
                </th>

                {/* 5 - BİRİM */}
                <th
                  className={`${HEAD_BASE} w-[70px] min-w-[70px] max-w-[70px]`}
                >
                  Birim
                </th>

                {/* MENŞEİ ÜLKE DÖVİZ BİRİM FİYAT FOB */}
                <th
                  className={`${HEAD_BASE} w-[105px] min-w-[105px] max-w-[105px] whitespace-normal text-right text-[8px] leading-[1.15]`}
                >
                  Menşei Ülke Döviz
                  <br />
                  Birim Fiyat (FOB)
                </th>

                {/* TOPLAM TUTAR FOB $ */}
                <th
                  className={`${HEAD_BASE} w-[90px] min-w-[90px] max-w-[90px] whitespace-normal text-right text-[8px] leading-[1.15]`}
                >
                  Toplam Tutar
                  <br />
                  (FOB $)
                </th>

                {/* GÜMRÜK VERGİSİ İSTİSNASI */}
                <th
                  className={`${HEAD_BASE} w-[92px] min-w-[92px] max-w-[92px] whitespace-normal text-center text-[8px] leading-[1.15]`}
                >
                  Gümrük Vergisi
                  <br />
                  İstisnası
                </th>

                {/* KDV İSTİSNASI */}
                <th
                  className={`${HEAD_BASE} w-[62px] min-w-[62px] max-w-[62px] whitespace-normal text-center text-[8px] leading-[1.15]`}
                >
                  KDV
                  <br />
                  İstisnası
                </th>

                {/* 10 - KULLANILMIŞ MAKİNE */}
                <th
                  className={`${HEAD_BASE} w-[90px] min-w-[90px] max-w-[90px] whitespace-normal text-center leading-tight`}
                >
                  Kullanılmış
                  <br />
                  Makine
                </th>

                {/* BUNDAN SONRASI BİZİM EK ALANLAR */}
                <th
                  className={`${HEAD_BASE} w-[72px] min-w-[72px] max-w-[72px] text-right`}
                >
                  FOB
                  <br />
                  TL
                </th>

                <th
                  className={`${HEAD_BASE} w-[72px] min-w-[72px] max-w-[72px] text-right`}
                >
                  CIF
                  <br />
                  TL
                </th>

                <th
                  className={`${HEAD_BASE} w-[105px] min-w-[105px] max-w-[105px]`}
                >
                  GTİP Açıklama
                </th>

                <th
                  className={`${HEAD_BASE} w-[65px] min-w-[65px] max-w-[65px]`}
                >
                  Makine ID
                </th>

                <th
                  className={`${HEAD_BASE} w-[72px] min-w-[72px] max-w-[72px]`}
                >
                  Makine Tipi
                </th>

                <th
                  className={`${HEAD_BASE} w-[46px] min-w-[46px] max-w-[46px] text-center`}
                >
                  Araç
                </th>

                <th
                  className={`${HEAD_BASE} w-[42px] min-w-[42px] max-w-[42px] border-r-0 text-center`}
                >
                  CKD
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
                      className={`sticky left-0 z-10 w-[42px] min-w-[42px] max-w-[42px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] font-semibold text-slate-600 ${rowBackground}`}
                    >
                      {machine.sequenceNumber ?? "-"}
                    </td>

                    {/* GTİP NO */}
                    <td
                      title={machine.gtipCode ?? "-"}
                      className={`sticky left-[42px] z-10 w-[80px] min-w-[80px] max-w-[80px] border-b border-r border-slate-200 px-1 py-1.5 font-mono text-[9px] text-slate-700 ${rowBackground}`}
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.gtipCode ?? "-"}
                      </div>
                    </td>

                    {/* ADI / ÖZELLİĞİ */}
                    <td
                      title={machine.name ?? "-"}
                      className={`sticky left-[122px] z-10 w-[180px] min-w-[180px] max-w-[180px] border-b border-r border-slate-200 px-1.5 py-1.5 text-[11px] font-semibold text-slate-900 ${rowBackground}`}
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.name ?? "-"}
                      </div>
                    </td>

                    {/* MİKTARI */}
                    <td
                      title={quantity}
                      className="w-[52px] min-w-[52px] max-w-[52px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {quantity}
                      </div>
                    </td>

                    {/* BİRİM */}
                    <td
                      title={machine.unit ?? "-"}
                      className="w-[70px] min-w-[70px] max-w-[70px] border-b border-r border-slate-200 px-1 py-1.5 text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.unit ?? "-"}
                      </div>
                    </td>

                    {/* MENŞEİ ÜLKE DÖVİZ BİRİM FİYAT FOB */}
                    <td
                      title={originCurrency}
                      className="w-[105px] min-w-[105px] max-w-[105px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {originCurrency}
                      </div>
                    </td>

                    {/* TOPLAM TUTAR FOB $ */}
                    <td
                      title={fobUsd}
                      className="w-[90px] min-w-[90px] max-w-[90px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] font-bold text-slate-900"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {fobUsd}
                      </div>
                    </td>

                    {/* GÜMRÜK VERGİSİ İSTİSNASI */}
                    <td className="w-[92px] min-w-[92px] max-w-[92px] border-b border-r border-slate-200 px-1 py-1.5 text-center">
                      <CompactFlag value={machine.customsTaxExemption} />
                    </td>

                    {/* KDV İSTİSNASI */}
                    <td className="w-[62px] min-w-[62px] max-w-[62px] border-b border-r border-slate-200 px-1 py-1.5 text-center">
                      <CompactFlag value={machine.vatExemption} />
                    </td>
                    {/* KULLANILMIŞ MAKİNE */}
                    <td
                      title={machine.usedMachine ?? "-"}
                      className="w-[90px] min-w-[90px] max-w-[90px] border-b border-r border-slate-200 px-1 py-1.5 text-center text-[10px] font-semibold text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.usedMachine ?? "-"}
                      </div>
                    </td>

                    {/* FOB TL */}
                    <td
                      title={fobTl}
                      className="w-[72px] min-w-[72px] max-w-[72px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {fobTl}
                      </div>
                    </td>

                    {/* CIF TL */}
                    <td
                      title={cifTl}
                      className="w-[72px] min-w-[72px] max-w-[72px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {cifTl}
                      </div>
                    </td>

                    {/* GTİP AÇIKLAMA */}
                    <td
                      title={machine.gtipDescription ?? "-"}
                      className="w-[105px] min-w-[105px] max-w-[105px] border-b border-r border-slate-200 px-1 py-1.5 text-[10px] text-slate-600"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.gtipDescription ?? "-"}
                      </div>
                    </td>

                    {/* MAKİNE ID */}
                    <td
                      title={String(machine.externalMachineId ?? "-")}
                      className="w-[65px] min-w-[65px] max-w-[65px] border-b border-r border-slate-200 px-1 py-1.5 font-mono text-[9px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.externalMachineId ?? "-"}
                      </div>
                    </td>

                    {/* MAKİNE TİPİ */}
                    <td
                      title={machine.machineryEquipmentType ?? "-"}
                      className="w-[72px] min-w-[72px] max-w-[72px] border-b border-r border-slate-200 px-1 py-1.5 text-[10px] text-slate-600"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.machineryEquipmentType ?? "-"}
                      </div>
                    </td>

                    {/* ARAÇ */}
                    <td className="w-[46px] min-w-[46px] max-w-[46px] border-b border-r border-slate-200 px-1 py-1.5 text-center">
                      <CompactFlag value={machine.isVehicle} />
                    </td>

                    {/* CKD */}
                    <td className="w-[42px] min-w-[42px] max-w-[42px] border-b border-slate-200 px-1 py-1.5 text-center">
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
