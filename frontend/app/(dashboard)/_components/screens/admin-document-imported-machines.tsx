"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api";

interface AdminDocumentImportedMachinesProps {
  documentId: string;
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

export function AdminDocumentImportedMachines({
  documentId,
}: AdminDocumentImportedMachinesProps) {
  const [machines, setMachines] = useState<ImportedMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadMachines() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch<ImportedMachinesResponse>(
          `/documents/${documentId}/imported-machines`,
        );

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
  }, [documentId]);

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
        <div className="admin-table-scroll overflow-x-auto pb-1">
          <table className="w-full min-w-[1800px] border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50/95">
                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Sıra
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Makine ID
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Adı / Özelliği
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Miktar
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Birim
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  GTİP No
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  GTİP Açıklama
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Kullanılmış
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Araç
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  CKD
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  FOB USD
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  FOB TL
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  CIF TL
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Menşei Döviz
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  KDV İstisnası
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Gümrük V. İstisnası
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {machines.map((machine, index) => (
                <tr
                  key={machine.id}
                  className={
                    index % 2 === 1
                      ? "bg-slate-50/40 hover:bg-slate-50"
                      : "bg-white hover:bg-slate-50"
                  }
                >
                  {/* SIRA */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] font-semibold text-slate-600">
                    {machine.sequenceNumber ?? "-"}
                  </td>

                  {/* MAKİNE ID */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 font-mono text-[10px] text-slate-700">
                    {machine.externalMachineId ?? "-"}
                  </td>

                  {/* AD */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-900">
                    {machine.name ?? "-"}
                  </td>

                  {/* MİKTAR */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] text-slate-700">
                    {formatQuantity(machine.quantity)}
                  </td>

                  {/* BİRİM */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700">
                    {machine.unit ?? "-"}
                  </td>

                  {/* GTİP */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 font-mono text-[10px] text-slate-700">
                    {machine.gtipCode ?? "-"}
                  </td>

                  {/* GTİP AÇIKLAMA */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600">
                    {machine.gtipDescription ?? "-"}
                  </td>

                  {/* KULLANILMIŞ */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-center">
                    <FlagBadge value={machine.usedMachine} />
                  </td>

                  {/* ARAÇ */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-center">
                    <FlagBadge value={machine.isVehicle} />
                  </td>

                  {/* CKD */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-center">
                    <FlagBadge value={machine.isCkd} />
                  </td>

                  {/* FOB USD */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] font-bold text-slate-900">
                    {machine.totalFobUsd
                      ? `${formatNumber(machine.totalFobUsd)} USD`
                      : "-"}
                  </td>

                  {/* FOB TL */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] text-slate-700">
                    {machine.totalFobTl
                      ? `${formatNumber(machine.totalFobTl)} TL`
                      : "-"}
                  </td>

                  {/* CIF TL */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] text-slate-700">
                    {machine.totalCifTl
                      ? `${formatNumber(machine.totalCifTl)} TL`
                      : "-"}
                  </td>

                  {/* MENŞEİ DÖVİZ */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] text-slate-700">
                    {machine.originCurrencyFobAmount
                      ? `${formatNumber(machine.originCurrencyFobAmount)} ${
                          machine.originCurrencyFob ?? ""
                        }`
                      : "-"}
                  </td>

                  {/* KDV İSTİSNASI */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-center">
                    <YesNoBadge value={machine.vatExemption} />
                  </td>

                  {/* GÜMRÜK VERGİSİ İSTİSNASI */}
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-center">
                    <YesNoBadge value={machine.customsTaxExemption} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function YesNoBadge({ value }: { value: string | null | undefined }) {
  const normalized = normalizeFlag(value);

  if (normalized === "YES") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <span className="h-1 w-1 rounded-full bg-emerald-500" />
        EVET
      </span>
    );
  }

  if (normalized === "NO") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-200">
        <span className="h-1 w-1 rounded-full bg-red-500" />
        HAYIR
      </span>
    );
  }

  return <span className="text-slate-300">-</span>;
}

function FlagBadge({ value }: { value: string | null | undefined }) {
  const normalized = normalizeFlag(value);

  if (normalized === "YES") {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
        EVET
      </span>
    );
  }

  if (normalized === "NO") {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
        HAYIR
      </span>
    );
  }

  return <span className="text-slate-300">-</span>;
}
