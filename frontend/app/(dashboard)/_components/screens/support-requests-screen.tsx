"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
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
  ChevronLeft,
  ChevronRight,
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
type SupportConsultant = {
  id: number;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "OPERATION";
};
type SupportConsultantsResponse = {
  success: boolean;
  data: SupportConsultant[];
};
type SupportRequestCompany = { id: number; name: string; taxNumber: string };
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
type SupportRequestsResponse = { success: boolean; data: SupportRequest[] };
type SupportRequestResponse = { success: boolean; data: SupportRequest };

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

const PAGE_SIZE = 10;

export default function SupportRequestsScreen() {
  const sessionUser = getSessionUser();
  const role = sessionUser?.role as UserRole | undefined;

  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [consultants, setConsultants] = useState<SupportConsultant[]>([]);
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
  const [consultantFilter, setConsultantFilter] = useState<
    "ALL" | number | "UNASSIGNED"
  >("ALL");
  const [currentPage, setCurrentPage] = useState(1);

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

  const loadConsultants = async () => {
    if (role !== "ADMIN") {
      setConsultants([]);
      return;
    }
    try {
      const response = await apiFetch<SupportConsultantsResponse>(
        "/support-requests/consultants",
      );
      setConsultants(response.data ?? []);
    } catch (error) {
      console.error("Uzman listesi alınamadı:", error);
    }
  };

  useEffect(() => {
    void loadRequests();
    void loadConsultants();
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
        body: JSON.stringify({ description: description.trim() }),
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
      window.dispatchEvent(new Event("support-request-unread-changed"));
    } catch (error) {
      console.error("Destek talebi açılamadı:", error);
    }
  };

  const markUnread = async (id: number) => {
    try {
      setActionLoading(id);
      const response = await apiFetch<SupportRequestResponse>(
        `/support-requests/${id}/unread`,
        { method: "PATCH" },
      );
      setSelectedRequest(response.data);
      setRequests((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
      window.dispatchEvent(new Event("support-request-unread-changed"));
    } catch (error) {
      console.error("Talep okunmadı olarak işaretlenemedi:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const markInProgress = async (id: number) => {
    try {
      setActionLoading(id);
      const response = await apiFetch<SupportRequestResponse>(
        `/support-requests/${id}/in-progress`,
        { method: "PATCH" },
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
        { method: "PATCH" },
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
    if (request.status === "RESOLVED") return "Çözüldü";
    if (request.status === "IN_PROGRESS") return "İşlemde";
    if (role === "OPERATION" || role === "ADMIN")
      return request.viewedAt ? "Görüldü" : "Yeni";
    return "Gönderildi";
  };

  const getStatusClass = (request: SupportRequest) => {
    if (request.status === "RESOLVED")
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    if (request.status === "IN_PROGRESS")
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300";
    if ((role === "OPERATION" || role === "ADMIN") && !request.viewedAt)
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  };

  const getStatusDot = (request: SupportRequest) => {
    if (request.status === "RESOLVED") return "bg-emerald-500";
    if (request.status === "IN_PROGRESS") return "bg-indigo-500";
    if ((role === "OPERATION" || role === "ADMIN") && !request.viewedAt)
      return "bg-rose-500";
    return "bg-blue-500";
  };

  const getAccentBorder = (request: SupportRequest) => {
    if (request.status === "RESOLVED") return "border-l-emerald-400";
    if (request.status === "IN_PROGRESS") return "border-l-indigo-400";
    if ((role === "OPERATION" || role === "ADMIN") && !request.viewedAt)
      return "border-l-rose-400";
    return "border-l-blue-400";
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (statusFilter !== "ALL" && request.status !== statusFilter)
        return false;
      if (role === "ADMIN" && consultantFilter !== "ALL") {
        if (consultantFilter === "UNASSIGNED") {
          if (request.assignedToId !== null) return false;
        } else if (request.assignedToId !== consultantFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          request.ticketNumber,
          request.description,
          request.documentNumber,
          request.company.name,
          topicLabels[request.topic],
          request.assignedTo
            ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [requests, searchQuery, statusFilter, consultantFilter, role]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / PAGE_SIZE),
  );
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredRequests.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRequests, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, consultantFilter]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const stats = useMemo(
    () => ({
      total: requests.length,
      sent: requests.filter((r) => r.status === "SENT").length,
      newForOperation: requests.filter(
        (r) => r.status === "SENT" && !r.viewedAt,
      ).length,
      inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
      resolved: requests.filter((r) => r.status === "RESOLVED").length,
    }),
    [requests],
  );

  const consultantStats = useMemo(() => {
    const summary = new Map<
      string,
      {
        consultantId: number | null;
        name: string;
        total: number;
        sent: number;
        inProgress: number;
        resolved: number;
      }
    >();
    consultants.forEach((c) => {
      summary.set(String(c.id), {
        consultantId: c.id,
        name: `${c.firstName} ${c.lastName}`,
        total: 0,
        sent: 0,
        inProgress: 0,
        resolved: 0,
      });
    });
    requests.forEach((request) => {
      const consultantId = request.assignedToId;
      const key = consultantId === null ? "UNASSIGNED" : String(consultantId);
      const name = request.assignedTo
        ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
        : "Atanmamış";
      const current = summary.get(key) ?? {
        consultantId,
        name,
        total: 0,
        sent: 0,
        inProgress: 0,
        resolved: 0,
      };
      current.total += 1;
      if (request.status === "SENT" && !request.viewedAt) current.sent += 1;
      if (request.status === "IN_PROGRESS") current.inProgress += 1;
      if (request.status === "RESOLVED") current.resolved += 1;
      summary.set(key, current);
    });
    return Array.from(summary.values())
      .map((item) => {
        const unresolved = item.total - item.resolved;
        const resolutionRate =
          item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0;
        return { ...item, unresolved, resolutionRate };
      })
      .sort(
        (a, b) =>
          b.unresolved - a.unresolved ||
          b.total - a.total ||
          a.name.localeCompare(b.name, "tr"),
      );
  }, [requests, consultants]);

  const selectedConsultantName = useMemo(() => {
    if (consultantFilter === "ALL") return null;
    if (consultantFilter === "UNASSIGNED") return "Atanmamış";
    return (
      consultantStats.find((c) => c.consultantId === consultantFilter)?.name ??
      null
    );
  }, [consultantFilter, consultantStats]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-4 lg:space-y-8 lg:p-6">
        <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:pb-2">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm shadow-blue-700/20 dark:bg-blue-600 dark:shadow-none sm:h-11 sm:w-11">
              <Headphones size={18} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
                {role === "COMPANY" ? "Destek Taleplerim" : "Destek Talepleri"}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 dark:shadow-none sm:w-auto"
            >
              <Plus size={16} strokeWidth={2} />
              Yeni Talep
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Toplam Talep"
            value={stats.total}
            icon={<Inbox size={15} strokeWidth={1.75} />}
            accentClass="border-l-border"
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
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {role === "ADMIN" && consultantStats.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground sm:text-base">
                    Uzman Bazlı Talep Özeti
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
                    Uzmanların talep ve çözüm durumlarını görüntüleyin.
                  </p>
                </div>
              </div>
              {consultantFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setConsultantFilter("ALL")}
                  className="text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Filtreyi temizle
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[minmax(220px,1.5fr)_100px_90px_90px_100px_110px_minmax(160px,1fr)] items-center gap-4 border-b border-border bg-muted/60 px-5 py-3 text-xs font-medium text-muted-foreground">
                  <div>Uzman</div>
                  <div>Toplam</div>
                  <div>Yeni</div>
                  <div>İşlemde</div>
                  <div>Çözüldü</div>
                  <div>Çözülmemiş</div>
                  <div>Çözüm Oranı</div>
                </div>
                <div className="divide-y divide-border">
                  {consultantStats.map((consultant) => {
                    const filterValue =
                      consultant.consultantId === null
                        ? "UNASSIGNED"
                        : consultant.consultantId;
                    const isSelected = consultantFilter === filterValue;
                    return (
                      <button
                        key={
                          consultant.consultantId === null
                            ? "unassigned"
                            : consultant.consultantId
                        }
                        type="button"
                        onClick={() =>
                          setConsultantFilter(isSelected ? "ALL" : filterValue)
                        }
                        className={`grid w-full grid-cols-[minmax(220px,1.5fr)_100px_90px_90px_100px_110px_minmax(160px,1fr)] items-center gap-4 px-5 py-3 text-left transition ${isSelected ? "bg-blue-50/70 dark:bg-blue-500/10" : "hover:bg-muted/60"}`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <User
                            size={14}
                            className="shrink-0 text-muted-foreground"
                          />
                          <span
                            className={`truncate text-sm font-medium ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}
                          >
                            {consultant.name}
                          </span>
                        </div>
                        <div>
                          <span className="inline-flex min-w-8 justify-center rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground/80">
                            {consultant.total}
                          </span>
                        </div>
                        <div>
                          <span className="inline-flex min-w-8 justify-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                            {consultant.sent}
                          </span>
                        </div>
                        <div>
                          <span className="inline-flex min-w-8 justify-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                            {consultant.inProgress}
                          </span>
                        </div>
                        <div>
                          <span className="inline-flex min-w-8 justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {consultant.resolved}
                          </span>
                        </div>
                        <div>
                          <span className="inline-flex min-w-8 justify-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                            {consultant.unresolved}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${consultant.resolutionRate}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold tabular-nums text-foreground/80">
                            %{consultant.resolutionRate}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card shadow-sm dark:shadow-none">
          {role === "ADMIN" && selectedConsultantName && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 bg-blue-50/60 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <Filter
                  size={14}
                  className="shrink-0 text-blue-600 dark:text-blue-400"
                />
                <span className="text-muted-foreground">Uzman:</span>
                <span className="truncate font-semibold text-blue-700 dark:text-blue-300">
                  {selectedConsultantName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setConsultantFilter("ALL")}
                className="text-xs font-medium text-blue-700 transition hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
              >
                Filtreyi temizle
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
                className="w-full rounded-lg border border-border bg-muted/40 py-2 pl-9 pr-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-blue-400 focus:bg-background focus:ring-2 focus:ring-blue-500/15 dark:focus:bg-card sm:text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter
                size={14}
                className="hidden text-muted-foreground sm:block"
              />
              <div className="flex w-full gap-1 rounded-lg bg-muted p-1 sm:w-auto">
                {[
                  { key: "ALL" as const, label: "Tümü" },
                  {
                    key: "SENT" as const,
                    label: role === "COMPANY" ? "Gönderildi" : "Yeni",
                  },
                  { key: "IN_PROGRESS" as const, label: "İşlemde" },
                  { key: "RESOLVED" as const, label: "Çözüldü" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition sm:flex-none sm:px-3 sm:text-xs ${statusFilter === filter.key ? "bg-card text-blue-700 shadow-sm dark:text-blue-300 dark:shadow-none" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2
                size={26}
                className="animate-spin text-blue-700 dark:text-blue-400"
              />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Inbox size={22} strokeWidth={1.75} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                {searchQuery ||
                statusFilter !== "ALL" ||
                consultantFilter !== "ALL"
                  ? "Filtreye uyan talep bulunamadı"
                  : "Henüz destek talebi bulunmuyor"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {searchQuery ||
                statusFilter !== "ALL" ||
                consultantFilter !== "ALL"
                  ? "Farklı bir arama veya filtre deneyebilirsiniz."
                  : role === "COMPANY"
                    ? "Yeni bir destek talebi oluşturarak uzmanınıza iletebilirsiniz."
                    : "Size atanmış yeni bir destek talebi bulunmuyor."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div
                className={`hidden border-b border-border px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid lg:items-center lg:gap-6 ${role === "ADMIN" ? "lg:grid-cols-[130px_minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(150px,0.7fr)_110px_170px]" : role === "OPERATION" ? "lg:grid-cols-[150px_minmax(240px,1fr)_minmax(200px,0.8fr)_120px_180px]" : "lg:grid-cols-[180px_minmax(300px,1fr)_140px_190px]"}`}
              >
                <div>Bilet no</div>
                <div>Konu</div>
                {(role === "OPERATION" || role === "ADMIN") && <div>Firma</div>}
                {role === "ADMIN" && <div>Atanan Uzman</div>}
                <div>Durum</div>
                <div className="text-right">Tarih</div>
              </div>
              <div className="divide-y divide-border">
                {paginatedRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => void openRequest(request)}
                    className={`group flex w-full flex-col gap-2 border-l-[3px] px-3 py-3 text-left transition hover:bg-muted/60 sm:gap-3 sm:px-5 sm:py-4 lg:grid lg:items-center lg:gap-6 ${getAccentBorder(request)} ${role === "ADMIN" ? "lg:grid-cols-[130px_minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(150px,0.7fr)_110px_170px]" : role === "OPERATION" ? "lg:grid-cols-[150px_minmax(240px,1fr)_minmax(200px,0.8fr)_120px_180px]" : "lg:grid-cols-[180px_minmax(300px,1fr)_140px_190px]"}`}
                  >
                    <div className="flex items-center justify-between gap-2 lg:contents">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {request.ticketNumber ?? `#${request.id}`}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium sm:text-xs lg:hidden ${getStatusClass(request)}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getStatusDot(request)}`}
                        />
                        {getStatusLabel(request)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {topicLabels[request.topic]}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground lg:line-clamp-1">
                        {request.description}
                      </p>
                    </div>
                    {(role === "OPERATION" || role === "ADMIN") && (
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-foreground/80">
                        <Building2
                          size={13}
                          className="shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{request.company.name}</span>
                      </div>
                    )}
                    {role === "ADMIN" && (
                      <div className="flex min-w-0 items-center gap-1.5 text-xs text-foreground/80">
                        <User
                          size={13}
                          className="shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">
                          {request.assignedTo
                            ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
                            : "Atanmamış"}
                        </span>
                      </div>
                    )}
                    <div className="hidden lg:block">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${getStatusClass(request)}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getStatusDot(request)}`}
                        />
                        {getStatusLabel(request)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground lg:justify-end">
                      <Calendar
                        size={13}
                        className="shrink-0 text-muted-foreground"
                      />
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && filteredRequests.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>
                {" - "}
                <span className="font-medium text-foreground/80">
                  {Math.min(currentPage * PAGE_SIZE, filteredRequests.length)}
                </span>
                {" / "}
                <span className="font-medium text-foreground/80">
                  {filteredRequests.length}
                </span>
                {" talep"}
              </div>
              <div className="flex items-center justify-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Önceki
                </button>
                <div className="min-w-16 text-center text-xs text-muted-foreground sm:min-w-20">
                  <span className="font-semibold text-foreground">
                    {currentPage}
                  </span>
                  {" / "}
                  {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sonraki
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {role === "COMPANY" && isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm dark:bg-black/70 sm:p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white dark:bg-blue-600">
                  <Plus size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground sm:text-lg">
                    Yeni Destek Talebi
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                    Belge işlemleriyle ilgili destek talebinizi açıklayın.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCreateForm}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              {errorMessage && (
                <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag size={13} />
                  Konu
                </label>
                <div className="rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm font-medium text-foreground/80">
                  Belge İşlemleri
                </div>
              </div>
              <FormField label="Açıklama" required>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Talebinizi açıklayınız..."
                  className="w-full resize-none rounded-lg border border-border bg-background px-3.5 py-2.5 text-base leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 sm:text-sm"
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {description.length} karakter
                </div>
              </FormField>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={closeCreateForm}
                disabled={submitting}
                className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-60 sm:flex-none"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !description.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 dark:shadow-none sm:flex-none sm:px-5"
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

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedRequest(null)}
          />
          <div className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
            <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-semibold text-foreground sm:text-lg">
                      {selectedRequest.ticketNumber ?? `#${selectedRequest.id}`}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium sm:px-2.5 sm:text-xs ${getStatusClass(selectedRequest)}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${getStatusDot(selectedRequest)}`}
                      />
                      {getStatusLabel(selectedRequest)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/80 sm:text-sm">
                    <Tag size={14} className="shrink-0 text-muted-foreground" />
                    <span className="font-medium">
                      {topicLabels[selectedRequest.topic]}
                    </span>
                    {selectedRequest.section && (
                      <>
                        <span className="text-muted-foreground/50">/</span>
                        <span>{sectionLabels[selectedRequest.section]}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Açıklama
                  </div>
                  <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6 text-foreground/80 sm:p-4">
                    {selectedRequest.description}
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-xs font-medium text-muted-foreground">
                    Zaman Çizelgesi
                  </div>
                  <div className="space-y-3 rounded-lg border border-border bg-card p-3 sm:p-4">
                    <TimelineItem
                      icon={<Send size={14} />}
                      iconClass="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                      label="Talep oluşturuldu"
                      date={selectedRequest.createdAt}
                    />
                    {selectedRequest.viewedAt && (
                      <TimelineItem
                        icon={<Eye size={14} />}
                        iconClass="bg-muted text-foreground/80"
                        label="Uzman tarafından görüldü"
                        date={selectedRequest.viewedAt}
                      />
                    )}
                    {selectedRequest.status === "IN_PROGRESS" && (
                      <TimelineItem
                        icon={<Clock3 size={14} />}
                        iconClass="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                        label="İşleme alındı"
                        date={selectedRequest.updatedAt}
                      />
                    )}
                    {selectedRequest.resolvedAt && (
                      <TimelineItem
                        icon={<CheckCircle2 size={14} />}
                        iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        label="Çözüldü"
                        date={selectedRequest.resolvedAt}
                        isLast
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            {(role === "OPERATION" || role === "ADMIN") && (
              <div className="flex flex-col gap-2 border-t border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-4">
                {selectedRequest.assignedToId === sessionUser?.id &&
                  selectedRequest.viewedAt && (
                    <button
                      type="button"
                      disabled={actionLoading === selectedRequest.id}
                      onClick={() => void markUnread(selectedRequest.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-60 sm:w-auto"
                    >
                      {actionLoading === selectedRequest.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <EyeOff size={16} />
                      )}
                      Okunmadı Olarak İşaretle
                    </button>
                  )}
                {selectedRequest.status !== "RESOLVED" && (
                  <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center sm:gap-3">
                    {selectedRequest.status === "SENT" && (
                      <button
                        type="button"
                        disabled={actionLoading === selectedRequest.id}
                        onClick={() => void markInProgress(selectedRequest.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 dark:shadow-none sm:w-auto"
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 dark:hover:bg-emerald-500 dark:shadow-none sm:w-auto"
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
      className={`rounded-lg border border-border border-l-[3px] bg-card px-3 py-3 sm:px-4 sm:py-3.5 ${accentClass}`}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="truncate text-xs sm:text-sm">{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:mt-2 sm:text-[28px]">
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
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {required && (
          <span className="text-rose-500 dark:text-rose-400">*</span>
        )}
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
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <p
        className={`mt-1 truncate text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}
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
        {!isLast && <div className="mt-1 h-4 w-px bg-border" />}
      </div>
      <div className="flex-1 pt-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(date)}
        </p>
      </div>
    </div>
  );
}
