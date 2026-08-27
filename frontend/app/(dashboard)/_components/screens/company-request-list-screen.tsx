"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";

import { apiFetch } from "@/lib/api";

interface CompanyRequestListProps {
  companyId: string;
}

type ApiCompanyRequest = {
  id: number;
  requestNo: string;
  note: string | null;
  documentNo: string | null;
  documentId: number | null;
  requestType: string;
  status: string;
  department: string | null;
  assignedPersonnel: string | null;
  contactInfo: string | null;
  applicationDate: string | null;
  resultDate: string | null;
};

type CompanyRequestListResponse = {
  success: boolean;
  message: string;
  data: ApiCompanyRequest[];
};

function formatDate(date: string | null): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function getStatusStyle(status: string) {
  const normalized = status.toLocaleUpperCase("tr-TR");
  if (normalized.includes("SONUÇLAND")) return "bg-emerald-50 text-emerald-700";
  if (normalized.includes("İPTAL")) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

export function CompanyRequestList({ companyId }: CompanyRequestListProps) {
  const [requests, setRequests] = useState<ApiCompanyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadRequests() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch<CompanyRequestListResponse>(
          `/companies/${companyId}/requests`,
        );
        setRequests(response.data);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Talep listesi yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadRequests();
  }, [companyId]);

  const filteredRequests = requests.filter((request) => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (!query) return true;
    return (
      request.requestNo.toLocaleLowerCase("tr-TR").includes(query) ||
      (request.documentNo ?? "").toLocaleLowerCase("tr-TR").includes(query)
    );
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 shadow-sm">
            <ListChecks size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Gönderilmiş Talep Listesi
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Firmaya ait tüm taleplerin listesi ve durumları
            </p>
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Talep numarası ile ara..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-4 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <p className="px-6 py-12 text-center text-sm font-medium text-slate-500">
            Talepler yükleniyor...
          </p>
        ) : loadError ? (
          <p className="px-6 py-12 text-center text-sm font-semibold text-red-700">
            {loadError}
          </p>
        ) : filteredRequests.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm font-medium text-slate-500">
            Bu firma için gönderilmiş talep bulunamadı.
          </p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Talep No</th>
                <th className="px-6 py-3.5">Belge No</th>
                <th className="px-6 py-3.5">Talep Tipi</th>
                <th className="px-6 py-3.5">Durum</th>
                <th className="px-6 py-3.5">Daire</th>
                <th className="px-6 py-3.5">İlgilenen Personel</th>
                <th className="px-6 py-3.5">Başvuru Tarihi</th>
                <th className="px-6 py-3.5">Sonuçlandırma Tarihi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {request.requestNo}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {request.documentNo ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {request.requestType}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {request.department ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {request.assignedPersonnel ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {formatDate(request.applicationDate)}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {formatDate(request.resultDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}