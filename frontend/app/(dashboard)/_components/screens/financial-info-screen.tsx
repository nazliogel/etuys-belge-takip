"use client";

import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
};

type DocumentsResponse = {
  success: boolean;
  data: {
    items: ApiDocument[];
  };
};

type FinancialInfo = {
  id: number;
  externalFinancialInfoId: string | null;

  totalInvestment: string | null;
  totalFinancing: string | null;
  equity: string | null;
  equityRate: string | null;
  foreignResources: string | null;
  foreignResourcesRate: string | null;

  tlLoan: string | null;
  foreignCurrencyLoan: string | null;
  foreignCurrencyIndexedLoan: string | null;
  domesticLoan: string | null;
  foreignLoan: string | null;
  otherLoans: string | null;
  financialLeasing: string | null;

  domesticMachinery: string | null;
  importedMachinery: string | null;
  totalMachineryExpenses: string | null;

  newMachinery: string | null;
  usedMachinery: string | null;
  importedMachineryUsd: string | null;

  totalBuildingConstructionExpenses: string | null;
  mainBuilding: string | null;
  auxiliaryEnterpriseEquipment: string | null;
  auxiliaryFacilities: string | null;

  otherInvestmentExpenses: string | null;
  landCost: string | null;
  landArrangement: string | null;
  importCustoms: string | null;
  transportInsurance: string | null;
  assembly: string | null;
  studyProject: string | null;
  otherExpenses: string | null;
  generalExpenses: string | null;

  fixedInvestmentUsd: string | null;
  fixedInvestmentCpi: string | null;
  fixedInvestmentUsdFirstCopy: string | null;
  fixedInvestmentCpiFirstCopy: string | null;
};

type FinancialInfoResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    financialInfo: FinancialInfo | null;
  };
};

export function FinancialInfoScreen() {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [financialInfo, setFinancialInfo] = useState<FinancialInfo | null>(
    null,
  );

  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [financialInfoLoading, setFinancialInfoLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await apiFetch<DocumentsResponse>(
          "/documents?isActive=true",
        );

        const items = response.data.items;

        setDocuments(items);

        if (items.length === 1) {
          setSelectedDocumentId(String(items[0].id));
        }
      } catch (error) {
        console.error("Aktif belgeler alınamadı:", error);
      } finally {
        setDocumentsLoading(false);
      }
    };

    void fetchDocuments();
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setFinancialInfo(null);
      return;
    }

    const fetchFinancialInfo = async () => {
      try {
        setFinancialInfoLoading(true);

        const response = await apiFetch<FinancialInfoResponse>(
          `/documents/${selectedDocumentId}/financial-info`,
        );

        setFinancialInfo(response.data.financialInfo);
      } catch (error) {
        console.error("Finansal bilgiler alınamadı:", error);
        setFinancialInfo(null);
      } finally {
        setFinancialInfoLoading(false);
      }
    };

    void fetchFinancialInfo();
  }, [selectedDocumentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Finansal Bilgiler
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Teşvik belgesine ait yatırım ve finansman bilgilerini
          görüntüleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Landmark className="h-5 w-5 text-slate-600" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Finansal Bilgi</h2>

            <p className="text-sm text-slate-500">
              Seçili belgeye ait finansal bilgiler burada görüntülenecek.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Belge
          </label>

          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.target.value)}
            disabled={documentsLoading || documents.length === 0}
          >
            <option value="" disabled>
              {documentsLoading
                ? "Belgeler yükleniyor..."
                : documents.length === 0
                  ? "Aktif belge bulunamadı"
                  : "Belge seçiniz"}
            </option>

            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.documentNumber ??
                  `Belge ${document.externalDocumentId}`}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          {!selectedDocumentId ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Önce bir belge seçiniz.
            </div>
          ) : financialInfoLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Finansal bilgiler yükleniyor...
            </div>
          ) : !financialInfo ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Bu belgeye ait finansal bilgi bulunamadı.
            </div>
          ) : (
            <div className="space-y-8">
              <FinancialSection title="Genel Finansman">
                <FinancialField
                  label="Finansal Bilgiler ID"
                  value={financialInfo.externalFinancialInfoId}
                />

                <FinancialField
                  label="Toplam Yatırım"
                  value={financialInfo.totalInvestment}
                />

                <FinancialField
                  label="Toplam Finansman"
                  value={financialInfo.totalFinancing}
                />

                <FinancialField
                  label="Öz Kaynaklar"
                  value={financialInfo.equity}
                />

                <FinancialField
                  label="Öz Kaynak Oranı"
                  value={financialInfo.equityRate}
                />

                <FinancialField
                  label="Yabancı Kaynaklar"
                  value={financialInfo.foreignResources}
                />

                <FinancialField
                  label="Yabancı Kaynak Oranı"
                  value={financialInfo.foreignResourcesRate}
                />
              </FinancialSection>

              <FinancialSection title="Kredi Bilgileri">
                <FinancialField
                  label="TL Kredisi"
                  value={financialInfo.tlLoan}
                />

                <FinancialField
                  label="Döviz Kredisi"
                  value={financialInfo.foreignCurrencyLoan}
                />

                <FinancialField
                  label="Dövize Endeksli Kredi"
                  value={financialInfo.foreignCurrencyIndexedLoan}
                />

                <FinancialField
                  label="İç Kredi"
                  value={financialInfo.domesticLoan}
                />

                <FinancialField
                  label="Dış Kredi"
                  value={financialInfo.foreignLoan}
                />

                <FinancialField
                  label="Diğer Krediler"
                  value={financialInfo.otherLoans}
                />

                <FinancialField
                  label="Finansal Kiralama"
                  value={financialInfo.financialLeasing}
                />
              </FinancialSection>

              <FinancialSection title="Makine ve Teçhizat">
                <FinancialField
                  label="Yerli Makine Teçhizat"
                  value={financialInfo.domesticMachinery}
                />

                <FinancialField
                  label="İthal Makine Teçhizat"
                  value={financialInfo.importedMachinery}
                />

                <FinancialField
                  label="Toplam Makine Teçhizat Giderleri"
                  value={financialInfo.totalMachineryExpenses}
                />

                <FinancialField
                  label="Yeni Makine"
                  value={financialInfo.newMachinery}
                />

                <FinancialField
                  label="Kullanılmış Makine"
                  value={financialInfo.usedMachinery}
                />

                <FinancialField
                  label="İthal Makine Dolar"
                  value={financialInfo.importedMachineryUsd}
                />
              </FinancialSection>

              <FinancialSection title="Bina ve İnşaat">
                <FinancialField
                  label="Toplam Bina İnşaat Giderleri"
                  value={financialInfo.totalBuildingConstructionExpenses}
                />

                <FinancialField
                  label="Ana Bina"
                  value={financialInfo.mainBuilding}
                />

                <FinancialField
                  label="Yardımcı İşletme Teçhizat"
                  value={financialInfo.auxiliaryEnterpriseEquipment}
                />

                <FinancialField
                  label="Yardımcı Tesisler"
                  value={financialInfo.auxiliaryFacilities}
                />
              </FinancialSection>

              <FinancialSection title="Diğer Yatırım Harcamaları">
                <FinancialField
                  label="Diğer Yatırım Harcamaları"
                  value={financialInfo.otherInvestmentExpenses}
                />

                <FinancialField
                  label="Arazi Bedeli"
                  value={financialInfo.landCost}
                />

                <FinancialField
                  label="Arazi Düzenlemesi"
                  value={financialInfo.landArrangement}
                />

                <FinancialField
                  label="İthalat / Gümrükleme"
                  value={financialInfo.importCustoms}
                />

                <FinancialField
                  label="Taşıma / Sigorta"
                  value={financialInfo.transportInsurance}
                />

                <FinancialField label="Montaj" value={financialInfo.assembly} />

                <FinancialField
                  label="Etüt Proje"
                  value={financialInfo.studyProject}
                />

                <FinancialField
                  label="Diğer Giderler"
                  value={financialInfo.otherExpenses}
                />

                <FinancialField
                  label="Genel Giderler"
                  value={financialInfo.generalExpenses}
                />
              </FinancialSection>

              <FinancialSection title="Sabit Yatırım Tutarları">
                <FinancialField
                  label="Sabit Yatırım Tutarı Dolar"
                  value={financialInfo.fixedInvestmentUsd}
                />

                <FinancialField
                  label="Sabit Yatırım Tutarı TÜFE"
                  value={financialInfo.fixedInvestmentCpi}
                />

                <FinancialField
                  label="Sabit Yatırım Tutarı Dolar İlk Nüsha"
                  value={financialInfo.fixedInvestmentUsdFirstCopy}
                />

                <FinancialField
                  label="Sabit Yatırım Tutarı TÜFE İlk Nüsha"
                  value={financialInfo.fixedInvestmentCpiFirstCopy}
                />
              </FinancialSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function FinancialSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}
function FinancialField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="text-sm font-medium text-slate-500">{label}</div>

      <div className="mt-2 text-base font-semibold text-slate-900">
        {value ?? "-"}
      </div>
    </div>
  );
}
