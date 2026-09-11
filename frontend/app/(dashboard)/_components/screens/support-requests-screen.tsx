"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  Headphones,
  Inbox,
  Loader2,
  Plus,
  Search,
  Send,
  Tag,
  User,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { getSessionUser } from "@/lib/mock-auth";

type UserRole = "ADMIN" | "OPERATION" | "COMPANY";

type SupportRequestStatus = "SENT" | "IN_PROGRESS" | "RESOLVED";

type SupportRequestTopic =
  | "DOCUMENT_GENERAL"
  | "EXTENSION"
  | "CLOSURE"
  | "AUTHORIZATION"
  | "DOCUMENT_DETAIL"
  | "TECHNICAL"
  | "OTHER";

type SupportRequestSection =
  | "INVESTMENT_TYPE"
  | "PRODUCTS"
  | "SUPPORTS"
  | "FINANCIAL_INFO"
  | "DOMESTIC_MACHINES"
  | "IMPORTED_MACHINES"
  | "SPECIAL_CONDITIONS";

type SupportRequestUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

type SupportRequestCompany = {
  id: number;
  name: string;
  taxNumber: string;
};

type SupportRequest = {
  id: number;
  ticketNumber: string | null;

  companyId: number;
  assignedToId: number | null;

  topic: SupportRequestTopic;
  section: SupportRequestSection | null;

  externalDocumentId: number | null;
  documentNumber: string | null;

  relatedRecordId: number | null;
  relatedRecordName: string | null;

  description: string;

  status: SupportRequestStatus;

  viewedAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
  updatedAt: string;

  company: SupportRequestCompany;
  assignedTo: SupportRequestUser | null;
};

type SupportRequestsResponse = {
  success: boolean;
  data: SupportRequest[];
};

type SupportRequestResponse = {
  success: boolean;
  data: SupportRequest;
};

const topicLabels: Record<SupportRequestTopic, string> = {
  DOCUMENT_GENERAL: "Belge İşlemleri",
  EXTENSION: "Süre Uzatma",
  CLOSURE: "Belge Kapama",
  AUTHORIZATION: "Yetkilendirme",
  DOCUMENT_DETAIL: "Belge Detayları",
  TECHNICAL: "Sistem / Teknik Destek",
  OTHER: "Diğer",
};

const sectionLabels: Record<SupportRequestSection, string> = {
  INVESTMENT_TYPE: "Yatırım Cinsi",
  PRODUCTS: "Ürün Bilgileri",
  SUPPORTS: "Destek Unsurları",
  FINANCIAL_INFO: "Finansal Bilgiler",
  DOMESTIC_MACHINES: "Yerli Liste",
  IMPORTED_MACHINES: "İthal Liste",
  SPECIAL_CONDITIONS: "Özel Şartlar",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SupportRequestsScreen() {
  const sessionUser = getSessionUser();
  const role = sessionUser?.role as UserRole | undefined;

  const [requests, setRequests] = useState<SupportRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(
    null,
  );

  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | SupportRequestStatus
  >("ALL");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response =
        await apiFetch<SupportRequestsResponse>("/support-requests");

      setRequests(response.data ?? []);
    } catch (error) {
      console.error("Destek talepleri alınamadı:", error);
      setErrorMessage("Destek talepleri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [role]);

  const resetForm = () => {
    setDescription("");
    setErrorMessage("");
  };

  const closeCreateForm = () => {
    resetForm();
    setIsCreateOpen(false);
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!description.trim()) {
      setErrorMessage("Açıklama alanı zorunludur.");
      return;
    }

    try {
      setSubmitting(true);

      await apiFetch<SupportRequestResponse>("/support-requests", {
        method: "POST",
        body: JSON.stringify({
          description: description.trim(),
        }),
      });

      closeCreateForm();

      await loadRequests();
    } catch (error) {
      console.error("Destek talebi oluşturulamadı:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Destek talebi oluşturulamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openRequest = async (request: SupportRequest) => {
    try {
      const response = await apiFetch<SupportRequestResponse>(
        `/support-requests/${request.id}`,
      );

      setSelectedRequest(response.data);

      setRequests((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
    } catch (error) {
      console.error("Destek talebi açılamadı:", error);
    }
  };

  const markInProgress = async (id: number) => {
    try {
      setActionLoading(id);

      const response = await apiFetch<SupportRequestResponse>(
        `/support-requests/${id}/in-progress`,
        {
          method: "PATCH",
        },
      );

      setSelectedRequest(response.data);

      setRequests((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
    } catch (error) {
      console.error("Talep işleme alınamadı:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const resolveRequest = async (id: number) => {
    try {
      setActionLoading(id);

      const response = await apiFetch<SupportRequestResponse>(
        `/support-requests/${id}/resolve`,
        {
          method: "PATCH",
        },
      );

      setSelectedRequest(response.data);

      setRequests((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
    } catch (error) {
      console.error("Talep çözüldü olarak işaretlenemedi:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusLabel = (request: SupportRequest) => {
    if (request.status === "RESOLVED") {
      return "Çözüldü";
    }

    if (request.status === "IN_PROGRESS") {
      return "İşlemde";
    }

    if (role === "OPERATION" || role === "ADMIN") {
      return request.viewedAt ? "Görüldü" : "Yeni";
    }

    return "Gönderildi";
  };

  const getStatusClass = (request: SupportRequest) => {
    if (request.status === "RESOLVED") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (request.status === "IN_PROGRESS") {
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    }

    if ((role === "OPERATION" || role === "ADMIN") && !request.viewedAt) {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  };

  const getStatusDot = (request: SupportRequest) => {
    if (request.status === "RESOLVED") {
      return "bg-emerald-500";
    }

    if (request.status === "IN_PROGRESS") {
      return "bg-indigo-500";
    }

    if ((role === "OPERATION" || role === "ADMIN") && !request.viewedAt) {
      return "bg-rose-500";
    }

    return "bg-blue-500";
  };

  const getAccentBorder = (request: SupportRequest) => {
    if (request.status === "RESOLVED") {
      return "border-l-emerald-400";
    }

    if (request.status === "IN_PROGRESS") {
      return "border-l-indigo-400";
    }

    if ((role === "OPERATION" || role === "ADMIN") && !request.viewedAt) {
      return "border-l-rose-400";
    }

    return "border-l-blue-400";
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (statusFilter !== "ALL" && request.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();

        const searchable = [
          request.ticketNumber,
          request.description,
          request.documentNumber,
          request.company.name,
          topicLabels[request.topic],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [requests, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: requests.length,

      sent: requests.filter((request) => request.status === "SENT").length,

      newForOperation: requests.filter(
        (request) => request.status === "SENT" && !request.viewedAt,
      ).length,

      inProgress: requests.filter((request) => request.status === "IN_PROGRESS")
        .length,

      resolved: requests.filter((request) => request.status === "RESOLVED")
        .length,
    };
  }, [requests]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        {/* BAŞLIK */}
        <div className="flex flex-col gap-5 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm shadow-blue-700/20">
              <Headphones size={20} strokeWidth={1.75} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
                {role === "COMPANY" ? "Destek Taleplerim" : "Destek Talepleri"}
              </h1>

              <p className="mt-0.5 text-sm text-stone-500">
                {role === "COMPANY"
                  ? "Destek taleplerinizi oluşturun ve durumlarını takip edin."
                  : "Size atanan destek taleplerini yönetin."}
              </p>
            </div>
          </div>

          {role === "COMPANY" && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900"
            >
              <Plus size={16} strokeWidth={2} />
              Yeni Talep
            </button>
          )}
        </div>

        {/* İSTATİSTİKLER */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Toplam Talep"
            value={stats.total}
            icon={<Inbox size={15} strokeWidth={1.75} />}
            accentClass="border-l-stone-300"
          />

          <StatCard
            label={role === "COMPANY" ? "Gönderildi" : "Yeni / Görülmedi"}
            value={role === "COMPANY" ? stats.sent : stats.newForOperation}
            icon={<AlertCircle size={15} strokeWidth={1.75} />}
            accentClass="border-l-rose-400"
          />

          <StatCard
            label="İşlemde"
            value={stats.inProgress}
            icon={<Clock3 size={15} strokeWidth={1.75} />}
            accentClass="border-l-indigo-400"
          />

          <StatCard
            label="Çözüldü"
            value={stats.resolved}
            icon={<CheckCircle2 size={15} strokeWidth={1.75} />}
            accentClass="border-l-emerald-400"
          />
        </div>

        {errorMessage && !isCreateOpen && (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TALEP LİSTESİ */}
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm shadow-stone-200/40">
          {/* ARAMA VE FİLTRE */}
          <div className="flex flex-col gap-3 border-b border-stone-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  role === "COMPANY"
                    ? "Bilet no veya açıklama ara..."
                    : "Bilet no, açıklama veya firma ara..."
                }
                className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="hidden text-stone-400 sm:block" />

              <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
                {[
                  {
                    key: "ALL" as const,
                    label: "Tümü",
                  },
                  {
                    key: "SENT" as const,
                    label: role === "COMPANY" ? "Gönderildi" : "Yeni",
                  },
                  {
                    key: "IN_PROGRESS" as const,
                    label: "İşlemde",
                  },
                  {
                    key: "RESOLVED" as const,
                    label: "Çözüldü",
                  },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      statusFilter === filter.key
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2 size={26} className="animate-spin text-blue-700" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                <Inbox size={22} strokeWidth={1.75} />
              </div>

              <h2 className="mt-4 text-base font-semibold text-stone-900">
                {searchQuery || statusFilter !== "ALL"
                  ? "Filtreye uyan talep bulunamadı"
                  : "Henüz destek talebi bulunmuyor"}
              </h2>

              <p className="mt-1 max-w-sm text-sm text-stone-500">
                {searchQuery || statusFilter !== "ALL"
                  ? "Farklı bir arama veya filtre deneyebilirsiniz."
                  : role === "COMPANY"
                    ? "Yeni bir destek talebi oluşturarak uzmanınıza iletebilirsiniz."
                    : "Size atanmış yeni bir destek talebi bulunmuyor."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* DESKTOP BAŞLIKLARI */}
              <div
                className={`hidden border-b border-stone-100 px-5 py-2.5 text-xs font-medium text-stone-400 lg:grid lg:items-center lg:gap-6 ${
                  role === "ADMIN"
                    ? "lg:grid-cols-[130px_minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(150px,0.7fr)_110px_170px]"
                    : role === "OPERATION"
                      ? "lg:grid-cols-[150px_minmax(240px,1fr)_minmax(200px,0.8fr)_120px_180px]"
                      : "lg:grid-cols-[180px_minmax(300px,1fr)_140px_190px]"
                }`}
              >
                <div>Bilet no</div>

                <div>Konu</div>

                {(role === "OPERATION" || role === "ADMIN") && <div>Firma</div>}

                {role === "ADMIN" && <div>Atanan Uzman</div>}

                <div>Durum</div>

                <div className="text-right">Tarih</div>
              </div>

              <div className="divide-y divide-stone-100">
                {filteredRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => void openRequest(request)}
                    className={`group flex w-full flex-col gap-3 border-l-[3px] px-5 py-4 text-left transition hover:bg-stone-50 lg:grid lg:items-center lg:gap-6 ${getAccentBorder(
                      request,
                    )} ${
                      role === "ADMIN"
                        ? "lg:grid-cols-[130px_minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(150px,0.7fr)_110px_170px]"
                        : role === "OPERATION"
                          ? "lg:grid-cols-[150px_minmax(240px,1fr)_minmax(200px,0.8fr)_120px_180px]"
                          : "lg:grid-cols-[180px_minmax(300px,1fr)_140px_190px]"
                    }`}
                  >
                    {/* BİLET */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-stone-900">
                        {request.ticketNumber ?? `#${request.id}`}
                      </span>
                    </div>

                    {/* KONU */}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-stone-900">
                        {topicLabels[request.topic]}
                      </div>

                      <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                        {request.description}
                      </p>
                    </div>

                    {/* FİRMA */}
                    {(role === "OPERATION" || role === "ADMIN") && (
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-stone-600">
                        <Building2
                          size={13}
                          className="shrink-0 text-stone-400"
                        />

                        <span className="truncate">{request.company.name}</span>
                      </div>
                    )}

                    {/* ATANAN UZMAN */}
                    {role === "ADMIN" && (
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-stone-600">
                        <User size={13} className="shrink-0 text-stone-400" />

                        <span className="truncate">
                          {request.assignedTo
                            ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
                            : "Atanmamış"}
                        </span>
                      </div>
                    )}

                    {/* DURUM */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${getStatusClass(
                          request,
                        )}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                            request,
                          )}`}
                        />
                        {getStatusLabel(request)}
                      </span>
                    </div>

                    {/* TARİH */}
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap text-xs text-stone-500">
                      <Calendar size={13} className="shrink-0 text-stone-400" />

                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* YENİ DESTEK TALEBİ */}
      {role === "COMPANY" && isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* MODAL BAŞLIK */}
            <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white">
                  <Plus size={18} strokeWidth={2} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    Yeni Destek Talebi
                  </h2>

                  <p className="mt-0.5 text-sm text-stone-500">
                    Belge işlemleriyle ilgili destek talebinizi açıklayın.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}
            <div className="space-y-5 p-6">
              {errorMessage && (
                <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />

                  <span>{errorMessage}</span>
                </div>
              )}

              {/* KONU */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  <Tag size={13} />
                  Konu
                </label>

                <div className="rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm font-medium text-stone-700">
                  Belge İşlemleri
                </div>
              </div>

              {/* AÇIKLAMA */}
              <FormField label="Açıklama" required>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Talebinizi açıklayınız..."
                  className="w-full resize-none rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />

                <div className="mt-1 text-right text-xs text-stone-400">
                  {description.length} karakter
                </div>
              </FormField>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-end gap-3 border-t border-stone-100 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={closeCreateForm}
                disabled={submitting}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-60"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !description.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}

                {submitting ? "Gönderiliyor..." : "Talebi Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TALEP DETAY DRAWER */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/50 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedRequest(null)}
          />

          <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            {/* DRAWER BAŞLIK */}
            <div className="border-b border-stone-100 px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-semibold text-stone-900">
                      {selectedRequest.ticketNumber ?? `#${selectedRequest.id}`}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                        selectedRequest,
                      )}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                          selectedRequest,
                        )}`}
                      />

                      {getStatusLabel(selectedRequest)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-sm text-stone-600">
                    <Tag size={14} className="text-stone-400" />

                    <span className="font-medium">
                      {topicLabels[selectedRequest.topic]}
                    </span>

                    {selectedRequest.section && (
                      <>
                        <span className="text-stone-300">/</span>

                        <span>{sectionLabels[selectedRequest.section]}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* DRAWER İÇERİK */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* META */}
                <div className="grid grid-cols-2 gap-4">
                  {(role === "OPERATION" || role === "ADMIN") && (
                    <MetaItem
                      icon={<Building2 size={14} />}
                      label="Firma"
                      value={selectedRequest.company.name}
                    />
                  )}

                  {selectedRequest.assignedTo && (
                    <MetaItem
                      icon={<User size={14} />}
                      label="Atanan Uzman"
                      value={`${selectedRequest.assignedTo.firstName} ${selectedRequest.assignedTo.lastName}`}
                    />
                  )}

                  {/* ESKİ TALEPLERDE VARSA GÖSTER */}
                  {selectedRequest.documentNumber && (
                    <MetaItem
                      icon={<FileText size={14} />}
                      label="Belge No"
                      value={selectedRequest.documentNumber}
                      mono
                    />
                  )}

                  {selectedRequest.relatedRecordName && (
                    <MetaItem
                      icon={<Tag size={14} />}
                      label="İlgili Kayıt"
                      value={selectedRequest.relatedRecordName}
                    />
                  )}
                </div>

                {/* AÇIKLAMA */}
                <div>
                  <div className="mb-2 text-xs font-medium text-stone-500">
                    Açıklama
                  </div>

                  <div className="whitespace-pre-wrap rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">
                    {selectedRequest.description}
                  </div>
                </div>

                {/* ZAMAN ÇİZELGESİ */}
                <div>
                  <div className="mb-3 text-xs font-medium text-stone-500">
                    Zaman Çizelgesi
                  </div>

                  <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
                    <TimelineItem
                      icon={<Send size={14} />}
                      iconClass="bg-blue-100 text-blue-700"
                      label="Talep oluşturuldu"
                      date={selectedRequest.createdAt}
                    />

                    {selectedRequest.viewedAt && (
                      <TimelineItem
                        icon={<Eye size={14} />}
                        iconClass="bg-stone-100 text-stone-700"
                        label="Uzman tarafından görüldü"
                        date={selectedRequest.viewedAt}
                      />
                    )}

                    {selectedRequest.status === "IN_PROGRESS" && (
                      <TimelineItem
                        icon={<Clock3 size={14} />}
                        iconClass="bg-indigo-100 text-indigo-700"
                        label="İşleme alındı"
                        date={selectedRequest.updatedAt}
                      />
                    )}

                    {selectedRequest.resolvedAt && (
                      <TimelineItem
                        icon={<CheckCircle2 size={14} />}
                        iconClass="bg-emerald-100 text-emerald-700"
                        label="Çözüldü"
                        date={selectedRequest.resolvedAt}
                        isLast
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* UZMAN AKSİYONLARI */}
            {(role === "OPERATION" || role === "ADMIN") &&
              selectedRequest.status !== "RESOLVED" && (
                <div className="flex items-center justify-end gap-3 border-t border-stone-100 bg-stone-50 px-6 py-4">
                  {selectedRequest.status === "SENT" && (
                    <button
                      type="button"
                      disabled={actionLoading === selectedRequest.id}
                      onClick={() => void markInProgress(selectedRequest.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
                    >
                      {actionLoading === selectedRequest.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Clock3 size={16} />
                      )}
                      İşleme Al
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionLoading === selectedRequest.id}
                    onClick={() => void resolveRequest(selectedRequest.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {actionLoading === selectedRequest.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Çözüldü Olarak İşaretle
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------ Yardımcı Bileşenler ------------------ */

function StatCard({
  label,
  value,
  icon,
  accentClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div
      className={`rounded-lg border border-stone-200 border-l-[3px] bg-white px-4 py-3.5 ${accentClass}`}
    >
      <div className="flex items-center gap-1.5 text-stone-500">
        {icon}
        <p className="text-sm">{label}</p>
      </div>

      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-stone-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500">
        {label}

        {required && <span className="text-rose-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
        <span className="text-stone-400">{icon}</span>

        {label}
      </div>

      <p
        className={`mt-1 text-sm font-medium text-stone-800 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TimelineItem({
  icon,
  iconClass,
  label,
  date,
  isLast,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  date: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full ${iconClass}`}
        >
          {icon}
        </div>

        {!isLast && <div className="mt-1 h-4 w-px bg-stone-200" />}
      </div>

      <div className="flex-1 pt-1">
        <p className="text-sm font-semibold text-stone-800">{label}</p>

        <p className="mt-0.5 text-xs text-stone-500">{formatDate(date)}</p>
      </div>
    </div>
  );
}
