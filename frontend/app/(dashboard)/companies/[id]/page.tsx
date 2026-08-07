"use client";

import { useState, useRef, useEffect } from "react"; // ← useRef, useEffect eklendi
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, FileText } from "lucide-react";

import { DocumentsScreen } from "@/app/(dashboard)/_components/screens/documents-screen";

type Tab = "info" | "documents";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const contentRef = useRef<HTMLDivElement>(null); // ← YENİ

  // Tab değiştiğinde içeriğe smooth scroll
  useEffect(() => {
    contentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeTab]);

  // mock — sonra id ile fetch
  const firma = {
    firmaAdi: "1453 İstanbul Otomat",
    tcNo: "12345678901",
    vergiNo: "1234567890",
  };

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: "info", label: "Firma Bilgileri", icon: Building2 },
    { key: "documents", label: "Belgeler", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Geri dön */}
      <Link
        href="/companies"
        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
      >
        <ArrowLeft size={17} />
        Firma listesine dön
      </Link>

      {/* Başlık */}
      <section className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Building2 size={22} />
        </div>
        <div>
          <p className="text-sm font-medium text-indigo-600">Firma detayı</p>
          <h1 className="text-2xl font-bold text-slate-900">{firma.firmaAdi}</h1>
        </div>
      </section>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Aktif tab içeriği — ref burada */}
      <div ref={contentRef} className="scroll-mt-6">
        {activeTab === "info" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Firma Bilgileri
            </h2>
            <dl className="mt-6 divide-y divide-slate-200">
              <InfoRow label="Firma Adı" value={firma.firmaAdi} />
              <InfoRow label="TC No" value={firma.tcNo} />
              <InfoRow label="Vergi No" value={firma.vergiNo} />
              <InfoRow label="Firma ID" value={id} />
            </dl>
          </section>
        )}

        {activeTab === "documents" && <DocumentsScreen companyId={id} />}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
      <dt className="w-full text-sm font-medium text-slate-500 sm:w-56">
        {label}
      </dt>
      <dd className="flex-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}