"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api";

interface AdminDocumentDomesticMachinesProps {
  documentId: string;
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

export function AdminDocumentDomesticMachines({
  documentId,
}: AdminDocumentDomesticMachinesProps) {
  const [machines, setMachines] = useState<DomesticMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadMachines() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch<DomesticMachinesResponse>(
          `/documents/${documentId}/domestic-machines`,
        );

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
  }, [documentId]);

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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
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

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Birim Fiyat
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Tutar
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  KDV İstisnası
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  GTİP No
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  GTİP Açıklama
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Makine Tipi
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Satıcı VKN
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Satıcı E-Posta
                </th>

                <th className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Barkod
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
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] font-semibold text-slate-600">
                    {machine.sequenceNumber ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 font-mono text-[10px] text-slate-700">
                    {machine.externalMachineId ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-900">
                    {machine.name ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] text-slate-700">
                    {formatQuantity(machine.quantity)}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700">
                    {machine.unit ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] text-slate-700">
                    {formatNumber(machine.unitPriceTl)}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] font-bold text-slate-900">
                    {formatNumber(machine.totalTl)}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold">
                    {machine.vatExemption === "1" ? (
                      <span className="text-emerald-700">EVET</span>
                    ) : machine.vatExemption === "0" ? (
                      <span className="text-red-700">HAYIR</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 font-mono text-[10px] text-slate-700">
                    {machine.gtipCode ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600">
                    {machine.gtipDescription ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600">
                    {machine.machineryEquipmentType ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 font-mono text-[10px] text-slate-700">
                    {machine.sellerTaxNumber ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-700">
                    {machine.sellerEmail ?? "-"}
                  </td>

                  <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-600">
                    {machine.barcode ?? "-"}
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
