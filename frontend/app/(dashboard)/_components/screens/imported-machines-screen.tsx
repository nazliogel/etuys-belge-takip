"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";

type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  isActive: boolean;
};

type DocumentsResponse = {
  success: boolean;
  data: {
    items: ApiDocument[];
  };
};

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

export function ImportedMachinesScreen() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [machines, setMachines] = useState<ImportedMachine[]>([]);

  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [loadingMachines, setLoadingMachines] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoadingDocuments(true);
        setError(null);

        const response = await apiFetch<DocumentsResponse>(
          "/documents?isActive=true",
        );

        const items = response.data.items ?? [];

        setDocuments(items);

        if (items.length === 1) {
          setSelectedDocumentId(items[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Belgeler alınırken bir hata oluştu.",
        );
      } finally {
        setLoadingDocuments(false);
      }
    };

    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setMachines([]);
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

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          İthal Makine ve Teçhizat Listesi
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Yatırım teşvik belgesine ait ithal makine ve teçhizat bilgilerini
          görüntüleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Belge
        </label>

        {loadingDocuments ? (
          <div className="text-sm text-slate-500">Belgeler yükleniyor...</div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-slate-500">
            Aktif teşvik belgesi bulunamadı.
          </div>
        ) : (
          <select
            value={selectedDocumentId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedDocumentId(value ? Number(value) : null);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            {documents.length > 1 && <option value="">Belge seçiniz</option>}

            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.documentNumber
                  ? `Belge No: ${document.documentNumber}`
                  : `Belge ID: ${document.externalDocumentId}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!selectedDocumentId && documents.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          İthal listeyi görüntülemek için belge seçiniz.
        </div>
      )}

      {selectedDocumentId && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">İthal Liste</h2>

            {selectedDocument && (
              <p className="mt-1 text-sm text-slate-500">
                {selectedDocument.documentNumber
                  ? `Belge No: ${selectedDocument.documentNumber}`
                  : `Belge ID: ${selectedDocument.externalDocumentId}`}
              </p>
            )}
          </div>

          {loadingMachines ? (
            <div className="p-6 text-sm text-slate-500">
              İthal liste yükleniyor...
            </div>
          ) : machines.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              Bu belgeye ait ithal makine kaydı bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1900px] w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Sıra No</th>
                    <th className="px-4 py-3">İthal Makine ID</th>
                    <th className="px-4 py-3">Adı / Özelliği</th>
                    <th className="px-4 py-3">Miktar</th>
                    <th className="px-4 py-3">Birim</th>
                    <th className="px-4 py-3">GTİP No</th>
                    <th className="px-4 py-3">GTİP Açıklama</th>
                    <th className="px-4 py-3">Makine Tipi</th>
                    <th className="px-4 py-3">Kullanılmış Makine</th>
                    <th className="px-4 py-3">Araç mı?</th>
                    <th className="px-4 py-3">CKD mi?</th>
                    <th className="px-4 py-3">FOB Dolar</th>
                    <th className="px-4 py-3">FOB TL</th>
                    <th className="px-4 py-3">CIF TL</th>
                    <th className="px-4 py-3">Menşei Döviz Cinsi</th>
                    <th className="px-4 py-3">Menşei Döviz Tutarı</th>
                    <th className="px-4 py-3">KDV İstisnası</th>
                    <th className="px-4 py-3">Gümrük Vergisi İstisnası</th>
                    <th className="px-4 py-3">Finansal Kiralama Kurumu</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {machines.map((machine) => (
                    <tr key={machine.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {displayValue(machine.sequenceNumber)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.externalMachineId)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.name)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.quantity)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.unit)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.gtipCode)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.gtipDescription)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.machineryEquipmentType)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.usedMachine)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.isVehicle)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.isCkd)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.totalFobUsd)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.totalFobTl)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.totalCifTl)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.originCurrencyFob)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.originCurrencyFobAmount)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.vatExemptionDescription)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.customsTaxExemptionDescription)}
                      </td>
                      <td className="px-4 py-3">
                        {displayValue(machine.financialLeasingCompanyName)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
