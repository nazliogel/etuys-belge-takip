"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api";
import {
  formatDate,
  getDocumentStatusInfo,
  type StatusTone,
} from "./documents/lib";

interface AdminDocumentIdentityProps {
  documentId: string;
  isClosed?: boolean;
}

type ApiDocumentDetail = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  extensionDate: string | null;
  supportClass: string | null;
  isActive?: boolean;
  status?: string;

  // Backend'in hesapladığı durum (liste ekranıyla aynı kaynak)
  displayStatus?:
    | "CLOSED"
    | "CANCELLED"
    | "INACTIVE"
    | "AUTHORIZATION_EXPIRED"
    | "CLOSURE_ELIGIBLE"
    | "EXTENSION_ELIGIBLE"
    | "EXPIRED"
    | "EXPIRING"
    | "ACTIVE";

  company: {
    name: string;
    taxNumber: string;
    processStatus: string | null;
    authorizationEndDate: string | null;
  };
};

type DocumentDetailResponse = {
  success: boolean;
  data: ApiDocumentDetail;
};

// Durum etiketi ortak fonksiyondan (documents/lib.ts) gelir; burada sadece
// rengin bu ekrandaki karşılığı var.
const STATUS_BADGE_CLASSES: Record<StatusTone, string> = {
  red: "bg-red-50 text-red-700 border border-red-200",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

export function AdminDocumentIdentity({
  documentId,
  isClosed = false,
}: AdminDocumentIdentityProps) {
  const [document, setDocument] = useState<ApiDocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadDocument() {
      setIsLoading(true);
      setLoadError("");

      try {
        const endpoint = isClosed
          ? `/closed-documents/${documentId}`
          : `/documents/${documentId}`;

        const response = await apiFetch<DocumentDetailResponse>(endpoint);

        setDocument({
          ...response.data,
          isActive: isClosed ? false : response.data.isActive,
          status: isClosed
            ? (response.data.status ?? "CLOSED")
            : response.data.status,
        });
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Belge bilgileri yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDocument();
  }, [documentId, isClosed]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">
          Belge bilgileri yükleniyor...
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-700">{loadError}</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Belge bulunamadı.</p>
      </div>
    );
  }

  // isClosed ise yukarıda isActive=false yapıldığı için "Kapalı" çıkar.
  const { label: status, tone } = getDocumentStatusInfo(document);
  const statusBadgeClass = STATUS_BADGE_CLASSES[tone];
  return (
    <div className="space-y-3">
      <section className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
            <FileText size={16} />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Belge Detayı
            </p>

            <h2 className="text-base font-extrabold tracking-tight text-slate-900">
              {document.documentNumber ?? "-"}
              <span className="ml-2 text-xs font-medium text-slate-400">
                Numaralı Belge
              </span>
            </h2>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass}`}
        >
          {status}
        </span>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />

            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Belge Bilgileri
            </h3>
          </div>

          <span className="text-[10px] text-slate-400">
            Resmi kayıtlardan alınmıştır
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-100">
              <OperationRow
                label1="Belge ID"
                value1={String(document.externalDocumentId)}
                label2="Belge No"
                value2={document.documentNumber ?? "-"}
              />

              <OperationRow
                label1="Başlangıç Tarihi"
                value1={formatDate(document.documentStartDate)}
                label2="Bitiş Tarihi"
                value2={formatDate(document.documentEndDate)}
              />

              <OperationRow
                label1="Süre Uzatım Tarihi"
                value1={formatDate(document.extensionDate)}
                label2="Destekleme Sınıfı"
                value2={document.supportClass ?? "-"}
              />

              <OperationRow
                label1="Yetki Bitiş Tarihi"
                value1={formatDate(document.company.authorizationEndDate)}
                label2="Belge Durumu"
                value2={status}
              />

              <OperationRow
                label1="Firma Ünvanı"
                value1={document.company.name}
                label2="Vergi No"
                value2={document.company.taxNumber}
              />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OperationRow({
  label1,
  value1,
  label2,
  value2,
}: {
  label1: string;
  value1: string;
  label2: string;
  value2: string;
}) {
  return (
    <tr>
      <th className="w-[16%] bg-slate-50/60 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label1}
      </th>

      <td className="w-[34%] px-4 py-2 text-sm font-semibold text-slate-900">
        {value1}
      </td>

      <th className="w-[16%] border-l border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label2}
      </th>

      <td className="w-[34%] px-4 py-2 text-sm font-semibold text-slate-900">
        {value2}
      </td>
    </tr>
  );
}
