"use client";

import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getSelectedDocument } from "@/app/(dashboard)/_lib/selected-document";

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
// sticky top-0 + bg-slate-100 zorunlu, aksi halde scroll'da hücre içerikleri sızar.
const HEAD_BASE =
  "sticky top-0 z-20 bg-slate-100 border-b-2 border-[#1e2a5e]/15 border-r border-slate-200 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] shadow-[inset_0_-1px_0_rgba(30,42,94,0.15)]";

export function DomesticMachinesScreen() {
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [machines, setMachines] = useState<DomesticMachine[]>([]);
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

        const response = await apiFetch<DomesticMachinesResponse>(
          `/documents/${selectedDocumentId}/domestic-machines`,
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
            : "Yerli liste alınırken bir hata oluştu.",
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
          Yerli Makine ve Teçhizat Listesi
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Seçili yatırım teşvik belgesine ait yerli makine ve teçhizat
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
                Yerli Makine ve Teçhizat Kayıtları
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Belge kapsamında tanımlı yerli makineler, tutarlar ve KDV
                bilgileri.
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

        {/* Tablo */}
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[2200px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left">
                <th className={`${HEAD_BASE} w-[80px] text-right`}>Sıra</th>

                <th className={`${HEAD_BASE} w-[130px]`}>Makine ID</th>

                <th className={`${HEAD_BASE} min-w-[260px]`}>Adı / Özelliği</th>

                <th className={`${HEAD_BASE} w-[110px] text-right`}>Miktar</th>

                <th className={`${HEAD_BASE} w-[100px]`}>Birim</th>

                <th className={`${HEAD_BASE} min-w-[150px] text-right`}>
                  Birim Fiyat
                </th>

                <th className={`${HEAD_BASE} min-w-[170px] text-right`}>
                  Tutar (KDV Hariç)
                </th>

                <th className={`${HEAD_BASE} min-w-[190px] text-right`}>
                  Fatura Gerçekleşen Miktar
                </th>

                <th className={`${HEAD_BASE} min-w-[190px] text-right`}>
                  Fatura Gerçekleşen Değer
                </th>

                <th className={`${HEAD_BASE} min-w-[140px]`}>KDV İstisnası</th>

                <th className={`${HEAD_BASE} min-w-[130px]`}>GTİP No</th>

                <th className={`${HEAD_BASE} min-w-[230px]`}>GTİP Açıklama</th>

                <th className={`${HEAD_BASE} min-w-[150px]`}>Makine Tipi</th>

                <th className={`${HEAD_BASE} min-w-[140px]`}>Satıcı VKN</th>

                <th className={`${HEAD_BASE} min-w-[210px]`}>Satıcı E-Posta</th>

                <th className={`${HEAD_BASE} min-w-[150px] border-r-0`}>
                  Barkod
                </th>
              </tr>
            </thead>

            <tbody>
              {!selectedDocumentId ? (
                <tr>
                  <td colSpan={16} className="px-5 py-14 text-center">
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
                  <td colSpan={16} className="px-5 py-14">
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e]" />

                      <span className="text-sm text-slate-500">Yükleniyor</span>
                    </div>
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Kayıt bulunamadı
                    </p>

                    <p className="mt-1.5 text-xs text-slate-500">
                      Bu belgeye ait yerli makine kaydı mevcut değil.
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
                          {displayValue(machine.name) === "-" ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            machine.name
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
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-sm text-slate-600">
                      {machine.unit ? (
                        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {machine.unit}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Birim Fiyat */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right">
                      {formatNumber(machine.unitPriceTl) ? (
                        <span className="font-mono text-sm tabular-nums text-slate-700">
                          {formatNumber(machine.unitPriceTl)}

                          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                            TL
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Tutar */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right">
                      {formatNumber(machine.totalTl) ? (
                        <span className="font-mono text-sm font-bold tabular-nums text-[#1e2a5e]">
                          {formatNumber(machine.totalTl)}

                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            TL
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Fatura Gerçekleşen Miktar */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-700">
                      {machine.invoiceRealizedQuantity === null ||
                      machine.invoiceRealizedQuantity === undefined ||
                      machine.invoiceRealizedQuantity === ""
                        ? "0"
                        : Number(machine.invoiceRealizedQuantity)}
                    </td>

                    {/* Fatura Gerçekleşen Değer */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-right font-mono text-sm tabular-nums text-slate-700">
                      {machine.invoiceRealizedValue === null ||
                      machine.invoiceRealizedValue === undefined ||
                      machine.invoiceRealizedValue === ""
                        ? "0"
                        : Number(machine.invoiceRealizedValue)}
                    </td>

                    {/* KDV İstisnası */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700">
                      {machine.vatExemption === "1" ? (
                        <span>EVET</span>
                      ) : machine.vatExemption === "0" ? (
                        <span>HAYIR</span>
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
                      {displayValue(machine.gtipDescription) === "-" ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        machine.gtipDescription
                      )}
                    </td>

                    {/* Makine Tipi */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5 text-sm text-slate-600">
                      {displayValue(machine.machineryEquipmentType) === "-" ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        machine.machineryEquipmentType
                      )}
                    </td>

                    {/* Satıcı VKN */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5">
                      {machine.sellerTaxNumber ? (
                        <span className="font-mono text-xs font-medium text-slate-700">
                          {machine.sellerTaxNumber}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Satıcı E-Posta */}
                    <td className="border-b border-r border-slate-200 px-4 py-2.5">
                      {machine.sellerEmail ? (
                        <a
                          href={`mailto:${machine.sellerEmail}`}
                          className="text-xs font-medium text-[#1e2a5e] underline-offset-2 hover:underline"
                        >
                          {machine.sellerEmail}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Barkod */}
                    <td className="border-b border-slate-200 px-4 py-2.5">
                      {machine.barcode ? (
                        <span className="font-mono text-xs text-slate-500">
                          {machine.barcode}
                        </span>
                      ) : (
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
