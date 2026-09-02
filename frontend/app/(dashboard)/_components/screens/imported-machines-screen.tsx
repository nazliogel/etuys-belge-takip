"use client";

import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getSelectedDocument } from "@/app/(dashboard)/_lib/selected-document";

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

function isPositiveFlag(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toString().trim().toLowerCase();
  return ["evet", "yes", "true", "1", "e"].includes(v);
}

// Sabit başlık için ortak class'lar — her <th>'ye uygulanacak.
// sticky top-0 + bg-slate-100 zorunlu, aksi halde scroll'da hücre içerikleri sızar.
const HEAD_BASE =
  "sticky top-0 z-20 bg-slate-100 border-b-2 border-[#1e2a5e]/15 border-r border-slate-200 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] shadow-[inset_0_-1px_0_rgba(30,42,94,0.15)]";

export function ImportedMachinesScreen() {
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [machines, setMachines] = useState<ImportedMachine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const documentIdFromUrl = searchParams.get("documentId");
    const storedDocument = getSelectedDocument();

    const documentId = documentIdFromUrl ?? storedDocument?.id ?? "";

    setSelectedDocumentId(documentId);
    setSelectedDocumentNumber(storedDocument?.documentNumber ?? null);
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

        const response = await apiFetch<ImportedMachinesResponse>(
          `/documents/${selectedDocumentId}/imported-machines`,
        );

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
  }, [selectedDocumentId]);

  return (
    <div className="space-y-8">
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-slate-200 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Belge Detayları
        </p>

        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
          İthal Makine ve Teçhizat Listesi
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Seçili yatırım teşvik belgesine ait ithal makine ve teçhizat
          bilgilerini görüntüleyebilirsiniz.
        </p>
      </header>

      {/* SEÇİLİ BELGE ŞERİDİ */}
      {selectedDocumentId && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <FileText className="h-4 w-4 text-slate-400" strokeWidth={1.75} />

            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Belge No
            </span>

            <span className="h-4 w-px bg-slate-200" />

            <span className="text-sm font-semibold tracking-tight text-slate-900">
              {selectedDocumentNumber ?? `#${selectedDocumentId}`}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Seçili
          </span>
        </div>
      )}

      {/* HATA */}
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
              Hata
            </p>

            <p className="mt-0.5 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* İÇERİK KARTI */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Kart Alt Başlığı */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-[#1e2a5e]" />

            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-800">
                İthal Makine ve Teçhizat Kayıtları
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Belge kapsamında tanımlı ithal makineler, FOB tutarlar ve
                muafiyet bilgileri.
              </p>
            </div>
          </div>

          {!loadingMachines && selectedDocumentId && machines.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c8102e]" />
              {machines.length} Kayıt
            </span>
          )}
        </div>

        {/* TABLO */}
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1900px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left">
                <th className={`${HEAD_BASE} text-right`}>Sıra</th>

                <th className={HEAD_BASE}>Makine ID</th>

                <th className={HEAD_BASE}>Adı / Özelliği</th>

                <th className={`${HEAD_BASE} text-right`}>Miktar</th>

                <th className={HEAD_BASE}>Birim</th>

                <th className={HEAD_BASE}>GTİP No</th>

                <th className={HEAD_BASE}>GTİP Açıklama</th>

                <th className={`${HEAD_BASE} text-center`}>Kullanılmış</th>

                <th className={`${HEAD_BASE} text-center`}>Araç</th>

                <th className={`${HEAD_BASE} text-center`}>CKD</th>

                <th className={`${HEAD_BASE} text-right`}>FOB (USD)</th>

                <th className={`${HEAD_BASE} text-right`}>FOB (TL)</th>

                <th className={`${HEAD_BASE} text-right`}>
                  Menşei Döviz Tutarı
                </th>

                <th className={HEAD_BASE}>KDV İstisnası</th>

                <th className={`${HEAD_BASE} border-r-0`}>
                  Gümrük V. İstisnası
                </th>
              </tr>
            </thead>

            <tbody>
              {!selectedDocumentId ? (
                <tr>
                  <td colSpan={15} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Görüntülenecek belge seçilmedi
                    </p>

                    <p className="mt-1.5 text-xs text-slate-500">
                      Lütfen sol menüden bir belge numarası seçin.
                    </p>
                  </td>
                </tr>
              ) : loadingMachines ? (
                <tr>
                  <td colSpan={15} className="px-5 py-14">
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e]" />

                      <span className="text-sm text-slate-500">Yükleniyor</span>
                    </div>
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Kayıt bulunamadı
                    </p>

                    <p className="mt-1.5 text-xs text-slate-500">
                      Bu belgeye ait ithal makine kaydı mevcut değil.
                    </p>
                  </td>
                </tr>
              ) : (
                machines.map((machine, index) => (
                  <tr
                    key={machine.id}
                    className={`group transition-colors hover:bg-[#1e2a5e]/[0.03] ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    {/* Sıra */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-500">
                      {machine.sequenceNumber ?? (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Makine ID */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5">
                      {machine.externalMachineId ? (
                        <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                          {machine.externalMachineId}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Ad */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e] opacity-0 transition-opacity group-hover:opacity-100" />

                        <span className="whitespace-normal">
                          {machine.name ?? (
                            <span className="text-slate-300">—</span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Miktar */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-700">
                      {formatQuantity(machine.quantity) ?? (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Birim */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5">
                      {machine.unit ? (
                        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {machine.unit}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* GTİP Kodu */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5">
                      {machine.gtipCode ? (
                        <span className="inline-flex rounded border border-[#1e2a5e]/20 bg-[#1e2a5e]/[0.05] px-2 py-0.5 font-mono text-xs font-semibold text-[#1e2a5e]">
                          {machine.gtipCode}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* GTİP Açıklama */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-sm text-slate-600">
                      {machine.gtipDescription ?? (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Kullanılmış */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-center">
                      <FlagBadge
                        value={machine.usedMachine}
                        positiveTone="amber"
                      />
                    </td>

                    {/* Araç */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-center">
                      <FlagBadge
                        value={machine.isVehicle}
                        positiveTone="slate"
                      />
                    </td>

                    {/* CKD */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-center">
                      <FlagBadge value={machine.isCkd} positiveTone="slate" />
                    </td>

                    {/* FOB USD */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right">
                      {formatNumber(machine.totalFobUsd) ? (
                        <span className="font-mono text-sm font-bold tabular-nums text-[#1e2a5e]">
                          {formatNumber(machine.totalFobUsd)}

                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            USD
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* FOB TL */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right">
                      {formatNumber(machine.totalFobTl) ? (
                        <span className="font-mono text-sm tabular-nums text-slate-700">
                          {formatNumber(machine.totalFobTl)}

                          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                            TL
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Menşei Döviz Tutarı */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right">
                      {formatNumber(machine.originCurrencyFobAmount) ? (
                        <span className="font-mono text-sm tabular-nums text-slate-700">
                          {formatNumber(machine.originCurrencyFobAmount)}

                          {machine.originCurrencyFob && (
                            <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                              {machine.originCurrencyFob}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* KDV İstisnası */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-sm text-slate-600">
                      {machine.vatExemptionDescription ?? (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Gümrük Vergisi İstisnası */}
                    <td className="border-b border-slate-200 px-4 py-2.5 text-sm text-slate-600">
                      {machine.customsTaxExemptionDescription ?? (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
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
    return <span className="text-slate-300">—</span>;
  }

  const isPositive = isPositiveFlag(value);

  if (!isPositive) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {value}
      </span>
    );
  }

  const toneStyles = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[positiveTone];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset ${toneStyles}`}
    >
      <span
        className={`h-1 w-1 rounded-full ${
          positiveTone === "emerald"
            ? "bg-emerald-500"
            : positiveTone === "amber"
              ? "bg-amber-500"
              : "bg-slate-500"
        }`}
      />

      {value}
    </span>
  );
}
