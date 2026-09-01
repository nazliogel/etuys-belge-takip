"use client";

import { useState } from "react";
import { AdminDocumentIdentity } from "./admin-document-identity";
import { AdminDocumentInvestmentType } from "./admin-document-investment-type";
import { AdminDocumentProducts } from "./admin-document-products";
import { AdminDocumentDomesticMachines } from "./admin-document-domestic-machines";
import { AdminDocumentImportedMachines } from "./admin-document-imported-machines";
import { AdminDocumentFinancialInfo } from "./admin-document-financial-info";
import { AdminDocumentSpecialConditions } from "./admin-document-special-conditions";
import { AdminDocumentSupportElements } from "./admin-document-support-elements";

interface AdminDocumentDetailScreenProps {
  documentId: string;
}

const tabs = [
  { key: "identity", label: "Belge Künye Bilgileri" },
  { key: "investment", label: "Yatırım Cinsi" },
  { key: "products", label: "Ürün Bilgileri" },
  { key: "domestic", label: "Yerli Liste" },
  { key: "imported", label: "İthal Liste" },
  { key: "financial", label: "Finansal Bilgiler" },
  { key: "special", label: "Özel Şartlar" },
  { key: "support", label: "Destek Unsurları" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function AdminDocumentDetailScreen({
  documentId,
}: AdminDocumentDetailScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("identity");

  return (
    <div className="space-y-4">
      {/* SEKME BAŞLIKLARI */}
      <div className="relative z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex w-full items-stretch">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                console.log("Sekme değişti:", tab.key);
                setActiveTab(tab.key);
              }}
              className={`relative z-20 flex-1 cursor-pointer whitespace-nowrap border-r border-slate-300 px-2 py-2.5 text-[11px] font-semibold transition last:border-r-0 ${
                activeTab === tab.key
                  ? "bg-red-50 text-red-700"
                  : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "identity" && (
        <AdminDocumentIdentity documentId={documentId} />
      )}

      {activeTab === "investment" && (
        <AdminDocumentInvestmentType documentId={documentId} />
      )}

      {activeTab === "products" && (
        <AdminDocumentProducts documentId={documentId} />
      )}

      {activeTab === "domestic" && (
        <AdminDocumentDomesticMachines documentId={documentId} />
      )}

      {activeTab === "imported" && (
        <AdminDocumentImportedMachines documentId={documentId} />
      )}

      {activeTab === "financial" && (
        <AdminDocumentFinancialInfo documentId={documentId} />
      )}

      {activeTab === "special" && (
        <AdminDocumentSpecialConditions documentId={documentId} />
      )}

      {activeTab === "support" && (
        <AdminDocumentSupportElements documentId={documentId} />
      )}
    </div>
  );
}
