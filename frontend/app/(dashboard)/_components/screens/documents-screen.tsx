"use client";

import {
  ChevronRight,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
  Check,
  CalendarDays, // 1. EKSİK İKON EKLENDİ
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  extensionDate: string | null;
  supportClass: string | null;
  isActive: boolean;
};

type CompanyDetailResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    name: string;
    taxNumber: string;
    authorizationEndDate: string | null;
    documents: ApiDocument[];
  };
};

interface DocumentsScreenProps {
  companyId?: string;
  selectedDocumentId?: string | null;
  onSelectDocument?: (documentId: string) => void;
}

function formatDate(date: string | null): string {
  if (!date) return "-";

  return new Intl.DateTimeFormat("tr-TR").format(new Date(date));
}

function getDocumentStatus(document: ApiDocument) {
  if (!document.isActive) {
    return "INACTIVE";
  }

  const endDate = document.extensionDate ?? document.documentEndDate;

  if (!endDate) {
    return "ACTIVE";
  }

  const end = new Date(endDate);
  const today = new Date();

  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return end < today ? "EXPIRED" : "ACTIVE";
}

export function DocumentsScreen({
  companyId,
  selectedDocumentId,
  onSelectDocument,
}: DocumentsScreenProps) {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [authorizationEndDate, setAuthorizationEndDate] = useState<
    string | null
  >(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadDocuments() {
      if (!companyId) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch<CompanyDetailResponse>(
          `/companies/${companyId}`,
        );

        setDocuments(response.data.documents);
        setAuthorizationEndDate(response.data.authorizationEndDate);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Belgeler yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDocuments();
  }, [companyId]);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("tr-TR");

    if (!query) {
      return documents;
    }

    return documents.filter((document) =>
      document.documentNumber?.toLocaleLowerCase("tr-TR").includes(query),
    );
  }, [documents, searchQuery]);

  const stats = {
    toplam: documents.length,

    aktif: documents.filter(
      (document) => getDocumentStatus(document) === "ACTIVE",
    ).length,

    suresiDolmus: documents.filter(
      (document) => getDocumentStatus(document) === "EXPIRED",
    ).length,

    bitisTarihi: formatDate(authorizationEndDate),
  };

  return (
    <div className="space-y-8">
      {/* BAŞLIK */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 border border-red-100 text-red-600 shadow-sm">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Belgelerim
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              Firmanıza ait tüm teşvik belgelerini ve güncel durumlarını
              görüntüleyin.
            </p>
          </div>
        </div>
      </section>

      {/* İSTATİSTİK KARTLARI */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Belge"
          value={String(stats.toplam)}
          description="Firmanıza kayıtlı belge"
          icon={<FileText size={18} />}
          accentColor="border-l-slate-400"
          iconBg="bg-slate-100 text-slate-700 border border-slate-200/60"
        />
        <StatCard
          title="Aktif Belge"
          value={String(stats.aktif)}
          description="Süresi devam eden belge"
          icon={<FileCheck2 size={18} />}
          accentColor="border-l-emerald-500"
          iconBg="bg-emerald-50 text-emerald-600 border border-emerald-100"
        />
        <StatCard
          title="Süresi Dolmuş"
          value={String(stats.suresiDolmus)}
          description="İşlem gerektiren belge"
          icon={<ShieldCheck size={18} />}
          accentColor="border-l-red-500"
          iconBg="bg-red-50 text-red-600 border border-red-100"
        />
        <StatCard
          title="Yetki Bitiş Tarihi"
          value={stats.bitisTarihi}
          description="Geçerlilik son günü"
          icon={<CalendarDays size={18} />}
          accentColor="border-l-amber-500"
          iconBg="bg-amber-50 text-amber-600 border border-amber-100"
        />
      </section>

      {/* BELGE LİSTESİ */}
      <section className="rounded-2xl bg-white shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between bg-slate-50/40">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Belge Listesi</h2>
            <p className="text-xs text-slate-500 font-medium">
              Belge numarası, tarih ve durum bilgileri
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Belge numarası ile ara..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/60">
              <tr>
                <th className="px-6 py-3.5">Belge No</th>
                <th className="px-6 py-3.5">Belge Başlangıç</th>
                <th className="px-6 py-3.5">Belge Bitiş</th>
                <th className="px-6 py-3.5">Süre Uzatım</th>
                <th className="px-6 py-3.5">Destekleme Sınıfı</th>
                <th className="px-6 py-3.5">Durum</th>
                <th className="px-6 py-3.5 text-right">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Belgeler yükleniyor...
                    </p>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-red-700">
                      Belgeler yüklenemedi
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{loadError}</p>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Bu firmaya ait belge bulunamadı.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const isSelected = selectedDocumentId === String(doc.id);

                  return (
                    <tr
                      key={doc.id}
                      className={`transition-colors ${
                        isSelected ? "bg-red-50/40" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              isSelected
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            <FileText size={16} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {doc.documentNumber ?? "-"}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400">
                              ID: #{doc.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.documentStartDate)}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.documentEndDate)}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {formatDate(doc.extensionDate)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200/60 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {doc.supportClass ?? "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={getDocumentStatus(doc)} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectDocument?.(String(doc.id));
                            }}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} />
                                Görüntüleniyor
                              </>
                            ) : (
                              <>
                                Görüntüle
                                <ChevronRight size={14} />
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// --- Alt bileşenler ---

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  iconBg: string;
}

function StatCard({
  title,
  value,
  description,
  icon,
  accentColor,
  iconBg,
}: StatCardProps) {
  return (
    <article
      className={`rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 border-l-4 ${accentColor}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            {description}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; dot: string; text: string; bg: string; border: string }
  > = {
    ACTIVE: {
      label: "Aktif",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200/60",
    },
    EXPIRED: {
      label: "Süresi Dolmuş",
      dot: "bg-red-500",
      text: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200/60",
    },
    CANCELLED: {
      label: "İptal",
      dot: "bg-slate-400",
      text: "text-slate-600",
      bg: "bg-slate-100",
      border: "border-slate-200",
    },
    INACTIVE: {
      label: "Pasif",
      dot: "bg-slate-400",
      text: "text-slate-600",
      bg: "bg-slate-100",
      border: "border-slate-200",
    },
  };

  const c = config[status] ?? {
    label: status,
    dot: "bg-slate-400",
    text: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
