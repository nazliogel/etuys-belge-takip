"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api";

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
  status?: "OPEN" | "CLOSED" | "CANCELLED";

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

function formatDate(date: string | null): string {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

function getStatus(document: ApiDocumentDetail): string {
  if (document.status === "CANCELLED") {
    return "İptal";
  }

  if (document.status === "CLOSED" || document.isActive === false) {
    return "Kapalı";
  }

  if (!document.documentEndDate) {
    return "Aktif";
  }

  const end = new Date(document.documentEndDate);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const remainingDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (remainingDays < 0) {
    return "Süresi Dolmuş";
  }

  if (remainingDays <= 180) {
    return "Süresi Yaklaşıyor";
  }

  return "Aktif";
}

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

  const status = getStatus(document);

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

        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
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
