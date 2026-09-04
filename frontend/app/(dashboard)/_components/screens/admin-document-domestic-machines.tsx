"use client";

import { useEffect, useState } from "react";
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
  "sticky top-0 z-20 bg-slate-100 border-b-2 border-[#1e2a5e]/15 border-r border-slate-200 px-1 py-1.5 text-[9px] font-bold uppercase tracking-normal text-slate-500 shadow-[inset_0_-1px_0_rgba(30,42,94,0.15)]";

export function AdminDocumentDomesticMachines({
  documentId,
  isClosed = false,
}: AdminDocumentDomesticMachinesProps) {
  const [machines, setMachines] = useState<DomesticMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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

                {/* 3 - ADI / ÖZELLİĞİ */}
                <th
                  className={`${HEAD_BASE} left-[122px] z-40 w-[180px] min-w-[180px] max-w-[180px]`}
                >
                  Adı / Özelliği
                </th>

                {/* KDV İSTİSNASI */}
                <th
                  className={`${HEAD_BASE} w-[52px] min-w-[52px] max-w-[52px] whitespace-normal leading-tight`}
                >
                  KDV
                  <br />
                  İstisnası
                </th>

                {/* MİKTAR */}
                <th
                  className={`${HEAD_BASE} w-[46px] min-w-[46px] max-w-[46px] text-right`}
                >
                  Miktar
                </th>

                {/* BİRİM */}
                <th
                  className={`${HEAD_BASE} w-[64px] min-w-[64px] max-w-[64px]`}
                >
                  Birim
                </th>

                {/* BİRİM FİYAT */}
                <th
                  className={`${HEAD_BASE} w-[64px] min-w-[64px] max-w-[64px] text-right whitespace-normal leading-tight`}
                >
                  Birim
                  <br />
                  Fiyat
                </th>

                {/* FATURA GERÇEKLEŞEN MİKTAR */}
                <th
                  className={`${HEAD_BASE} w-[68px] min-w-[68px] max-w-[68px] whitespace-normal text-right leading-tight`}
                >
                  Fatura
                  <br />
                  Gerç. Miktar
                </th>

                {/* FATURA GERÇEKLEŞEN DEĞER */}
                <th
                  className={`${HEAD_BASE} w-[68px] min-w-[68px] max-w-[68px] whitespace-normal text-right leading-tight`}
                >
                  Fatura
                  <br />
                  Gerç. Değer
                </th>

                {/* TOPLAM TUTAR */}
                <th
                  className={`${HEAD_BASE} w-[70px] min-w-[70px] max-w-[70px] text-right whitespace-normal leading-tight`}
                >
                  Toplam
                  <br />
                  Tutar
                </th>

                {/* DİĞER ALANLAR */}

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
                  className={`${HEAD_BASE} w-[72px] min-w-[72px] max-w-[72px]`}
                >
                  Satıcı VKN
                </th>

                <th
                  className={`${HEAD_BASE} w-[88px] min-w-[88px] max-w-[88px]`}
                >
                  Satıcı E-Posta
                </th>

                <th
                  className={`${HEAD_BASE} w-[72px] min-w-[72px] max-w-[72px] border-r-0`}
                >
                  Barkod
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
                      className={`sticky left-0 z-10 w-[42px] min-w-[42px] max-w-[42px] border-b border-r border-slate-200 px-1.5 py-1.5 text-right font-mono text-[10px] font-semibold text-slate-600 ${rowBackground}`}
                    >
                      {machine.sequenceNumber ?? "-"}
                    </td>

                    {/* GTİP NO */}
                    <td
                      title={machine.gtipCode ?? "-"}
                      className={`sticky left-[42px] z-10 w-[80px] min-w-[80px] max-w-[80px] border-b border-r border-slate-200 px-1.5 py-1.5 font-mono text-[9px] text-slate-700 ${rowBackground}`}
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

                    {/* KDV */}
                    <td className="w-[52px] min-w-[52px] max-w-[52px] border-b border-r border-slate-200 px-1 py-1.5 text-[10px] font-semibold text-slate-700">
                      {machine.vatExemption === "1"
                        ? "EVET"
                        : machine.vatExemption === "0"
                          ? "HAYIR"
                          : "-"}
                    </td>

                    {/* MİKTAR */}
                    <td
                      title={quantity}
                      className="w-[46px] min-w-[46px] max-w-[46px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {quantity}
                      </div>
                    </td>

                    {/* BİRİM */}
                    <td
                      title={machine.unit ?? "-"}
                      className="w-[64px] min-w-[64px] max-w-[64px] border-b border-r border-slate-200 px-1 py-1.5 text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.unit ?? "-"}
                      </div>
                    </td>

                    {/* BİRİM FİYAT */}
                    <td
                      title={unitPrice}
                      className="w-[64px] min-w-[64px] max-w-[64px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {unitPrice}
                      </div>
                    </td>

                    {/* FATURA GERÇEKLEŞEN MİKTAR */}
                    <td
                      title={invoiceQuantity}
                      className="w-[68px] min-w-[68px] max-w-[68px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {invoiceQuantity}
                      </div>
                    </td>

                    {/* FATURA GERÇEKLEŞEN DEĞER */}
                    <td
                      title={invoiceValue}
                      className="w-[68px] min-w-[68px] max-w-[68px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {invoiceValue}
                      </div>
                    </td>

                    {/* TOPLAM TUTAR */}
                    <td
                      title={total}
                      className="w-[70px] min-w-[70px] max-w-[70px] border-b border-r border-slate-200 px-1 py-1.5 text-right font-mono text-[10px] font-bold text-slate-900"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {total}
                      </div>
                    </td>

                    {/* GTİP AÇIKLAMA */}
                    <td
                      title={machine.gtipDescription ?? "-"}
                      className="w-[105px] min-w-[105px] max-w-[105px] border-b border-r border-slate-200 px-1.5 py-1.5 text-[10px] text-slate-600"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.gtipDescription ?? "-"}
                      </div>
                    </td>

                    {/* MAKİNE ID */}
                    <td
                      title={String(machine.externalMachineId ?? "-")}
                      className="w-[65px] min-w-[65px] max-w-[65px] border-b border-r border-slate-200 px-1.5 py-1.5 font-mono text-[9px] text-slate-700"
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

                    {/* SATICI VKN */}
                    <td
                      title={machine.sellerTaxNumber ?? "-"}
                      className="w-[72px] min-w-[72px] max-w-[72px] border-b border-r border-slate-200 px-1 py-1.5 font-mono text-[9px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.sellerTaxNumber ?? "-"}
                      </div>
                    </td>

                    {/* SATICI E-POSTA */}
                    <td
                      title={machine.sellerEmail ?? "-"}
                      className="w-[88px] min-w-[88px] max-w-[88px] border-b border-r border-slate-200 px-1 py-1.5 text-[9px] text-slate-700"
                    >
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {machine.sellerEmail ?? "-"}
                      </div>
                    </td>

                    {/* BARKOD */}
                    <td
                      title={machine.barcode ?? "-"}
                      className="w-[72px] min-w-[72px] max-w-[72px] border-b border-slate-200 px-1 py-1.5 font-mono text-[9px] text-slate-600"
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
