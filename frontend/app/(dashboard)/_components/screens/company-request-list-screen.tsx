"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListChecks } from "lucide-react";

import { apiFetch } from "@/lib/api";

interface CompanyRequestListProps {
  companyId: string;
}

type ApiCompanyRequest = {
  id: number;
  requestNumber: number;
  note: string | null;
  documentNumber: string | null;
  externalDocumentId: number | null;
  requestType: string | null;
  requestStatus: string | null;
  department: string | null;
  assignedPersonnel: string | null;
  informationPerson: string | null;
  applicationDate: string | null;
  completionDate: string | null;
  company: {
    id: number;
    externalCompanyId: number;
    name: string;
    taxNumber: string | null;
  };
};

type CompanyRequestListResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiCompanyRequest[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type ColumnKey =
  | "requestNumber"
  | "note"
  | "documentNumber"
  | "companyName"
  | "externalDocumentId"
  | "requestType"
  | "requestStatus"
  | "department"
  | "assignedPersonnel"
  | "informationPerson"
  | "applicationDate"
  | "completionDate";

const MIN_COLUMN_WIDTH = 44;

const COLUMNS: { key: ColumnKey; label: string; defaultWidth: number }[] = [
  { key: "requestNumber", label: "Talep No", defaultWidth: 75 },
  { key: "note", label: "Not", defaultWidth: 130 },
  { key: "documentNumber", label: "Belge No", defaultWidth: 85 },
  { key: "companyName", label: "Firma Adı", defaultWidth: 190 },
  { key: "externalDocumentId", label: "Belge Id", defaultWidth: 80 },
  { key: "requestType", label: "Talep Tipi", defaultWidth: 160 },
  { key: "requestStatus", label: "Durum", defaultWidth: 120 },
  { key: "department", label: "Daire", defaultWidth: 100 },
  { key: "assignedPersonnel", label: "İlgilenen Personel", defaultWidth: 120 },
  { key: "informationPerson", label: "Bilgi İçin", defaultWidth: 110 },
  { key: "applicationDate", label: "Başvuru Tarihi", defaultWidth: 95 },
  { key: "completionDate", label: "Sonuçlandırma Tarihi", defaultWidth: 110 },
];

const DEFAULT_WIDTHS: Record<ColumnKey, number> = COLUMNS.reduce(
  (acc, column) => {
    acc[column.key] = column.defaultWidth;
    return acc;
  },
  {} as Record<ColumnKey, number>,
);

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

  if (normalized.includes("SONUÇLAND")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
  }

  if (normalized.includes("İPTAL") || normalized.includes("REDDEDİL")) {
    return "bg-red-50 text-red-700 ring-red-600/10";
  }

  return "bg-amber-50 text-amber-700 ring-amber-600/10";
}

function getCellValue(
  request: ApiCompanyRequest,
  key: ColumnKey,
): string | number | null {
  switch (key) {
    case "companyName":
      return request.company?.name ?? null;
    case "applicationDate":
      return formatDate(request.applicationDate);
    case "completionDate":
      return formatDate(request.completionDate);
    default:
      return request[key];
  }
}

export function CompanyRequestList({ companyId }: CompanyRequestListProps) {
  const [requests, setRequests] = useState<ApiCompanyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [columnWidths, setColumnWidths] =
    useState<Record<ColumnKey, number>>(DEFAULT_WIDTHS);
  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);

  const resizeStateRef = useRef<{
    key: ColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    async function loadRequests() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch<CompanyRequestListResponse>(
          `/company-requests?companyId=${encodeURIComponent(companyId)}&limit=100`,
        );

        setRequests(response.data.items);
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

  const handleResizeMove = useCallback((event: MouseEvent) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    const delta = event.clientX - resizeState.startX;
    const nextWidth = Math.max(
      MIN_COLUMN_WIDTH,
      Math.round(resizeState.startWidth + delta),
    );

    setColumnWidths((prev) => ({ ...prev, [resizeState.key]: nextWidth }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizeStateRef.current = null;
    setResizingColumn(null);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    window.removeEventListener("mousemove", handleResizeMove);
    // eslint-disable-next-line react-hooks/immutability
    window.removeEventListener("mouseup", handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback(
    (key: ColumnKey) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      resizeStateRef.current = {
        key,
        startX: event.clientX,
        startWidth: columnWidths[key],
      };
      setResizingColumn(key);

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
    },
    [columnWidths, handleResizeMove, handleResizeEnd],
  );

  const handleResizeReset = useCallback(
    (key: ColumnKey) => () => {
      setColumnWidths((prev) => ({ ...prev, [key]: DEFAULT_WIDTHS[key] }));
    },
    [],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  const tableMinWidth = useMemo(
    () => COLUMNS.reduce((sum, column) => sum + columnWidths[column.key], 0),
    [columnWidths],
  );

  const query = search.trim().toLocaleLowerCase("tr-TR");

  const filteredRequests = requests.filter((request) => {
    if (!query) return true;

    const searchableValues = [
      request.requestNumber,
      request.note,
      request.documentNumber,
      request.externalDocumentId,
      request.company?.name,
      request.requestType,
      request.requestStatus,
      request.department,
      request.assignedPersonnel,
      request.informationPerson,
    ];

    return searchableValues.some((value) =>
      String(value ?? "")
        .toLocaleLowerCase("tr-TR")
        .includes(query),
    );
  });

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/60 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
            <ListChecks size={15} />
          </div>

          <div>
            <h2 className="text-xs font-bold text-slate-900">
              Gönderilmiş Talep Listesi
            </h2>

            <p className="text-[10px] font-medium text-slate-500">
              Firmaya ait talepler ve işlem durumları
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-[10px] font-semibold text-slate-500">
            {filteredRequests.length} kayıt
          </span>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Talep, belge veya personel ara..."
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-500/10 lg:w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-xs font-medium text-slate-500">
            Talepler yükleniyor...
          </p>
        ) : loadError ? (
          <p className="px-4 py-8 text-center text-xs font-semibold text-red-700">
            {loadError}
          </p>
        ) : filteredRequests.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs font-medium text-slate-500">
            Bu firma için gönderilmiş talep bulunamadı.
          </p>
        ) : (
          <table
            className="table-fixed border-collapse text-left"
            style={{ width: tableMinWidth, minWidth: "100%" }}
          >
            <colgroup>
              {COLUMNS.map((column) => (
                <col key={column.key} style={{ width: columnWidths[column.key] }} />
              ))}
            </colgroup>

            <thead className="border-b border-slate-200 bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                {COLUMNS.map((column, index) => (
                  <th
                    key={column.key}
                    className={`relative select-none overflow-hidden px-2 py-1 ${
                      index < COLUMNS.length - 1
                        ? "border-r border-slate-200"
                        : ""
                    } ${resizingColumn === column.key ? "bg-red-50" : ""}`}
                  >
                    <span className="block truncate pr-1" title={column.label}>
                      {column.label}
                    </span>

                    <div
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={handleResizeStart(column.key)}
                      onDoubleClick={handleResizeReset(column.key)}
                      title="Sürükleyerek genişliği ayarlayın, çift tıklayarak sıfırlayın"
                      className={`absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-red-400/60 ${
                        resizingColumn === column.key ? "bg-red-500" : ""
                      }`}
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-[10px]">
              {filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  className="transition-colors hover:bg-slate-50"
                >
                  {COLUMNS.map((column, index) => {
                    const value = getCellValue(request, column.key);

                    const cellClassName = `overflow-hidden px-2 py-1 leading-tight ${
                      index < COLUMNS.length - 1
                        ? "border-r border-slate-100"
                        : ""
                    }`;

                    if (column.key === "requestStatus") {
                      const status = request.requestStatus ?? "";
                      return (
                        <td key={column.key} className={cellClassName}>
                          <span
                            className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${getStatusStyle(
                              status,
                            )}`}
                            title={status || undefined}
                          >
                            {status || "-"}
                          </span>
                        </td>
                      );
                    }

                    if (column.key === "requestNumber") {
                      return (
                        <td
                          key={column.key}
                          className={`${cellClassName} truncate font-bold text-slate-900`}
                          title={String(value ?? "-")}
                        >
                          {value ?? "-"}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={column.key}
                        className={`${cellClassName} truncate text-slate-600`}
                        title={value !== null ? String(value) : undefined}
                      >
                        {value ?? "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}