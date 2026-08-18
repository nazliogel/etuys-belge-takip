/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileSpreadsheet,
  FileUp,
  Inbox,
  Info,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE / (1024 * 1024)} MB`;

const EXPECTED_COLUMNS = [
  "Firma ID",
  "Firma Adı",
  "VKN",
  "Yetki Bitiş",
  "Belge ID",
  "Belge No",
  "Belge Başlangıç",
  "Belge Bitiş",
  "Süre Uzatım",
  "Destekleme Sınıfı",
  "İşlem Durumu",
];

type ImportStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type ImportRecord = {
  id: number;
  fileName: string;
  date: string;
  uploadedAtIso: string;
  totalRows: number;
  newRows: number;
  changedRows: number;
  invalidRows: number;
  unchangedRows: number;
  status: ImportStatus;
};

type ImportBatchApi = {
  id: number;
  fileName: string;
  status: ImportStatus;
  totalRowCount: number;
  invalidRowCount: number;
  newRowCount: number;
  changedRowCount: number;
  unchangedRowCount: number;
  uploadedAt: string;
};

type ImportListResponse = {
  success: boolean;
  message: string;
  data: { items: ImportBatchApi[]; totalCount: number };
};

type ImportActionResponse = {
  success: boolean;
  message: string;
  data: { id: number; status?: ImportStatus };
};

type StepKey = "upload" | "process" | "compare" | "done";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "upload", label: "Yükleniyor" },
  { key: "process", label: "İşleniyor" },
  { key: "compare", label: "Karşılaştırılıyor" },
  { key: "done", label: "Tamamlandı" },
];

const STATUS_META: Record<
  ImportStatus,
  { label: string; text: string; dot: string }
> = {
  UPLOADED: {
    label: "Yüklendi",
    text: "text-slate-700",
    dot: "bg-slate-400",
  },
  PROCESSING: {
    label: "İşleniyor",
    text: "text-red-700",
    dot: "bg-red-500 animate-pulse",
  },
  WAITING_APPROVAL: {
    label: "Onay Bekliyor",
    text: "text-amber-800",
    dot: "bg-amber-500 animate-pulse",
  },
  COMPLETED: {
    label: "Tamamlandı",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  FAILED: {
    label: "Hatalı",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
  CANCELLED: {
    label: "İptal Edildi",
    text: "text-slate-500",
    dot: "bg-slate-300",
  },
};

const STATUS_FILTERS: { key: "ALL" | ImportStatus; label: string }[] = [
  { key: "ALL", label: "Tümü" },
  { key: "WAITING_APPROVAL", label: "Onay Bekliyor" },
  { key: "PROCESSING", label: "İşleniyor" },
  { key: "COMPLETED", label: "Tamamlandı" },
  { key: "FAILED", label: "Hatalı" },
];

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: ImportStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function ExcelImportScreen() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<StepKey>("upload");
  const [recentImports, setRecentImports] = useState<ImportRecord[]>([]);
  const [isLoadingImports, setIsLoadingImports] = useState(true);
  const [showColumns, setShowColumns] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ImportStatus>("ALL");

  async function loadImports() {
    try {
      setIsLoadingImports(true);
      const response = await apiFetch<ImportListResponse>(
        "/imports?page=1&limit=50",
      );
      const mapped: ImportRecord[] = response.data.items.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        uploadedAtIso: item.uploadedAt,
        date: new Date(item.uploadedAt).toLocaleString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        totalRows: item.totalRowCount,
        newRows: item.newRowCount,
        changedRows: item.changedRowCount,
        invalidRows: item.invalidRowCount,
        unchangedRows: item.unchangedRowCount,
        status: item.status,
      }));
      setRecentImports(mapped);
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Karşılaştırma geçmişi alınamadı.",
      );
    } finally {
      setIsLoadingImports(false);
    }
  }

  useEffect(() => {
    void loadImports();
  }, []);

  const stats = useMemo(() => {
    const total = recentImports.length;
    const waitingApproval = recentImports.filter(
      (i) => i.status === "WAITING_APPROVAL",
    ).length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const rowsThisMonth = recentImports
      .filter((i) => new Date(i.uploadedAtIso) >= monthStart)
      .reduce((sum, i) => sum + i.totalRows, 0);
    const completed = recentImports.filter(
      (i) => i.status === "COMPLETED",
    ).length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, waitingApproval, rowsThisMonth, successRate };
  }, [recentImports]);

  const filteredImports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recentImports.filter((i) => {
      if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
      if (q && !i.fileName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recentImports, search, statusFilter]);

  function validateAndSelectFile(file?: File) {
    setFileError("");
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") {
      setSelectedFile(null);
      setFileError("Yalnızca .xlsx veya .xls uzantılı dosyalar yüklenebilir.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setFileError(`Dosya boyutu en fazla ${MAX_FILE_SIZE_LABEL} olabilir.`);
      return;
    }
    setSelectedFile(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    validateAndSelectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  }
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }
  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    validateAndSelectFile(event.dataTransfer.files?.[0]);
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setFileError("");
    setUploadProgress(0);
    setCurrentStep("upload");
  }

  function handleDownloadTemplate() {
    console.info("Örnek Excel şablonu indirme tetiklendi.");
  }
  function handleViewReport(importId: number) {
    router.push(`/excel-import/${importId}`);
  }

  async function handleUpload() {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setCurrentStep("upload");
    setUploadProgress(10);
    setFileError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("isFullSnapshot", "true");

      const uploadResponse = await apiFetch<ImportActionResponse>(
        "/imports/upload",
        { method: "POST", body: formData },
      );
      const importId = uploadResponse.data.id;
      setUploadProgress(35);

      setCurrentStep("process");
      await apiFetch(`/imports/${importId}/process`, { method: "POST" });
      setUploadProgress(65);

      setCurrentStep("compare");
      await apiFetch(`/imports/${importId}/compare`, { method: "POST" });
      setUploadProgress(90);

      setCurrentStep("done");
      await loadImports();
      setUploadProgress(100);

      setSelectedFile(null);
      setUploadProgress(0);
      setCurrentStep("upload");
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Excel dosyası işlenirken beklenmeyen bir hata oluştu.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-[1400px] px-3 pt-3 pb-3 space-y-3 sm:px-4">
        {/* HEADER — sade, beyaz kart, kırmızı accent stripe */}
        <header className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
          <span className="absolute left-0 top-0 h-full w-1 bg-red-600" />

          <div className="flex flex-col justify-between gap-3 pl-2 md:flex-row md:items-center">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>Veri Yönetimi</span>
                <ChevronRight size={11} />
                <span className="font-semibold text-slate-700">
                  Excel Karşılaştırma
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Excel Karşılaştırma
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Güncel Excel verilerinizi veritabanı kayıtları ile karşılaştırın
                ve farkları tek ekranda görün.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              
              <button
                type="button"
                onClick={() => loadImports()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <RefreshCw
                  size={13}
                  className={isLoadingImports ? "animate-spin" : ""}
                />
                Yenile
              </button>
            </div>
          </div>
        </header>

        {/* SPLIT PANEL — SOL: Upload  /  SAĞ: Geçmiş */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          {/* SOL — Upload sidebar */}
          <aside className="lg:sticky lg:top-3 lg:h-fit space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Header — beyaz, sade, sol kırmızı stripe */}
              <div className="relative border-b border-slate-100 px-4 py-3">
                <span className="absolute left-0 top-0 h-full w-1 bg-red-600" />
                <div className="flex items-center justify-between pl-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
                      Hızlı Aksiyon
                    </p>
                    <h2 className="mt-0.5 text-sm font-bold text-slate-900">
                      Yeni Karşılaştırma
                    </h2>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <Upload size={16} />
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Drop zone */}
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() =>
                    !selectedFile && fileInputRef.current?.click()
                  }
                  className={`relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                    isDragging
                      ? "border-red-500 bg-red-50/60"
                      : fileError
                        ? "border-rose-300 bg-rose-50/40"
                        : selectedFile
                          ? "cursor-default border-slate-200 bg-slate-50/50"
                          : "border-slate-300 bg-slate-50/40 hover:border-red-400 hover:bg-red-50/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <div className="pointer-events-none flex flex-col items-center">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          fileError
                            ? "bg-rose-100 text-rose-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        <FileUp size={20} />
                      </div>
                      <h3 className="mt-2.5 text-sm font-bold text-slate-900">
                        Exceli Sürükleyin
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        veya{" "}
                        <span className="font-semibold text-red-600 underline decoration-red-300 underline-offset-2">
                          göz atmak için tıklayın
                        </span>
                      </p>
                      <span className="mt-2 text-[10px] font-medium text-slate-400">
                        XLSX · XLS · Maks. {MAX_FILE_SIZE_LABEL}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="w-full text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <FileSpreadsheet size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {selectedFile.name}
                          </p>
                          <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-500">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedFile}
                          disabled={isUploading}
                          aria-label="Kaldır"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 disabled:opacity-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stepper */}
                {isUploading && (
                  <div className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <RefreshCw
                          size={12}
                          className="animate-spin text-red-600"
                        />
                        {STEPS.find((s) => s.key === currentStep)?.label}...
                      </span>
                      <span className="text-xs font-bold tabular-nums text-slate-800">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                      <div
                        className="h-full rounded-full bg-red-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {STEPS.map((step, idx) => {
                        const currentIdx = STEPS.findIndex(
                          (s) => s.key === currentStep,
                        );
                        const isDone = idx < currentIdx;
                        const isActive = idx === currentIdx;
                        return (
                          <div
                            key={step.key}
                            className="flex flex-col items-center gap-1"
                          >
                            <div
                              className={`h-1 w-full rounded-full ${
                                isDone
                                  ? "bg-emerald-500"
                                  : isActive
                                    ? "bg-red-500 animate-pulse"
                                    : "bg-slate-200"
                              }`}
                            />
                            <span
                              className={`text-[10px] font-semibold ${
                                isActive
                                  ? "text-slate-800"
                                  : isDone
                                    ? "text-emerald-700"
                                    : "text-slate-400"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hata */}
                {fileError && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 text-xs font-medium text-rose-800"
                  >
                    <AlertCircle
                      size={14}
                      className="mt-px shrink-0 text-rose-600"
                    />
                    <p>{fileError}</p>
                  </div>
                )}

                {/* CTA */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    disabled={!selectedFile || isUploading}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  >
                    <RotateCcw size={13} />
                    Temizle
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="inline-flex h-9 flex-[2] items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={13} />
                    {isUploading ? "İşleniyor..." : "Karşılaştır"}
                  </button>
                </div>

                {/* Meta */}
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowColumns((v) => !v)}
                    className="group flex w-full items-center justify-between rounded-md py-0.5 transition-colors hover:text-red-700"
                    aria-expanded={showColumns}
                  >
                    <span className="font-medium text-slate-500 group-hover:text-slate-700">
                      Beklenen kolon
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-red-600">
                      {EXPECTED_COLUMNS.length} kolon
                      <ChevronRight
                        size={12}
                        className={`transition-transform duration-200 ${
                          showColumns ? "rotate-90" : ""
                        }`}
                      />
                    </span>
                  </button>

                  {/* Genişleyen mini şema önizlemesi */}
                  {showColumns && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                        <div className="mb-1.5 flex items-center justify-between px-1">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                            Beklenen sıra
                          </span>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                            Excel
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-x-2 gap-y-0.5">
                          {EXPECTED_COLUMNS.map((col, i) => (
                            <div
                              key={col}
                              className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-white"
                            >
                              <span className="w-4 shrink-0 font-mono text-[10px] font-semibold tabular-nums text-red-500">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700">
                                {col}
                              </span>
                              <span className="shrink-0 rounded bg-slate-200/70 px-1 font-mono text-[9px] font-semibold text-slate-500">
                                {String.fromCharCode(65 + i)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <MetaRow label="Format" value="XLSX, XLS" />
                  <MetaRow label="Maks. boyut" value={MAX_FILE_SIZE_LABEL} />
                </div>
              </div>
            </div>

            {/* Güvenlik notu — sade */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <ShieldCheck
                size={15}
                className="mt-0.5 shrink-0 text-emerald-600"
              />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  İzole Analiz
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-600">
                  Yüklenen dosya önce ayrı alanda analiz edilir. Veritabanı
                  yalnızca onayınızla güncellenir.
                </p>
              </div>
            </div>
          </aside>

          {/* SAĞ — Geçmiş */}
          <main className="min-w-0 space-y-3">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900">
                    Karşılaştırma Geçmişi
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Geçmiş aktarımlar ve satır bazlı analiz sonuçları
                  </p>
                </div>

                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Dosya adında ara..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 sm:w-56"
                  />
                </div>
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUS_FILTERS.map((f) => {
                  const count =
                    f.key === "ALL"
                      ? recentImports.length
                      : recentImports.filter((i) => i.status === f.key).length;
                  const active = statusFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setStatusFilter(f.key)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-red-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {f.label}
                      <span
                        className={`rounded px-1 text-[10px] font-bold tabular-nums ${
                          active
                            ? "bg-white/25 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tablo */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {isLoadingImports ? (
                <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm font-medium text-slate-500">
                  <RefreshCw size={15} className="animate-spin text-red-500" />
                  Yükleniyor...
                </div>
              ) : filteredImports.length === 0 ? (
                <EmptyState
                  onUpload={() => fileInputRef.current?.click()}
                  onTemplate={handleDownloadTemplate}
                  hasAny={recentImports.length > 0}
                />
              ) : (
                <>
                  {/* Desktop tablo — full width, scroll yok */}
                  <div className="hidden md:block">
                    <table className="w-full table-fixed border-collapse text-left">
                      <colgroup>
                        <col />
                        <col className="w-[9%]" />
                        <col className="w-[8%]" />
                        <col className="w-[9%]" />
                        <col className="w-[10%]" />
                        <col className="w-[8%]" />
                        <col className="w-[14%]" />
                        <col className="w-[36px]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2.5">Dosya</th>
                          <th className="px-1.5 py-2.5 text-right">Toplam</th>
                          <th className="px-1.5 py-2.5 text-right">Yeni</th>
                          <th className="px-1.5 py-2.5 text-right">Değişen</th>
                          <th className="px-1.5 py-2.5 text-right">
                            Değişmeyen
                          </th>
                          <th className="px-1.5 py-2.5 text-right">Hatalı</th>
                          <th className="px-2 py-2.5">Durum</th>
                          <th className="px-1.5 py-2.5"></th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredImports.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => handleViewReport(item.id)}
                            className="group relative cursor-pointer transition-colors hover:bg-red-50/40"
                          >
                            <td className="relative px-3 py-2.5">
                              <span className="absolute left-0 top-0 h-full w-0.5 bg-red-600 opacity-0 transition-opacity group-hover:opacity-100" />
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-red-100 group-hover:text-red-600">
                                  <FileSpreadsheet size={15} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-red-700">
                                    {item.fileName}
                                  </p>
                                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                                    <Clock3 size={9} />
                                    <span className="truncate">
                                      {item.date}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-1.5 py-2.5 text-right text-xs font-semibold tabular-nums text-slate-800">
                              {item.totalRows.toLocaleString("tr-TR")}
                            </td>

                            <td className="px-1.5 py-2.5 text-right tabular-nums">
                              {item.newRows > 0 ? (
                                <span className="text-xs font-semibold text-emerald-700">
                                  +{item.newRows.toLocaleString("tr-TR")}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            <td className="px-1.5 py-2.5 text-right tabular-nums">
                              {item.changedRows > 0 ? (
                                <span className="text-xs font-semibold text-amber-700">
                                  {item.changedRows.toLocaleString("tr-TR")}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            <td className="px-1.5 py-2.5 text-right text-xs font-medium tabular-nums text-slate-500">
                              {item.unchangedRows.toLocaleString("tr-TR")}
                            </td>

                            <td className="px-1.5 py-2.5 text-right tabular-nums">
                              {item.invalidRows > 0 ? (
                                <span className="text-xs font-semibold text-rose-700">
                                  {item.invalidRows.toLocaleString("tr-TR")}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            <td className="px-2 py-2.5">
                              <StatusBadge status={item.status} />
                            </td>

                            <td className="px-1.5 py-2.5 text-slate-300 group-hover:text-red-600">
                              <ArrowRight size={13} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobil */}
                  <div className="divide-y divide-slate-100 md:hidden">
                    {filteredImports.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleViewReport(item.id)}
                        className="block w-full space-y-3 p-4 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <FileSpreadsheet size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {item.fileName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.date}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>

                        <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-2">
                          <MobileStat label="Toplam" value={item.totalRows} />
                          <MobileStat
                            label="Yeni"
                            value={item.newRows}
                            tone="emerald"
                            prefix="+"
                          />
                          <MobileStat
                            label="Değişen"
                            value={item.changedRows}
                            tone="amber"
                          />
                          <MobileStat
                            label="Hatalı"
                            value={item.invalidRows}
                            tone="rose"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Tablo footer */}
            {filteredImports.length > 0 && (
              <div className="flex flex-col items-start justify-between gap-2 px-1 text-[11px] text-slate-500 sm:flex-row sm:items-center">
                <span className="font-semibold tabular-nums">
                  {filteredImports.length} / {recentImports.length} kayıt
                  gösteriliyor
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  Onaysız hiçbir değişiklik veritabanına yazılmaz
                </span>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------- Alt bileşenler ---------- */

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent?: "amber";
}) {
  const showAccent = accent === "amber";
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            {hint}
          </p>
        </div>

        <div
          className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
            showAccent
              ? "bg-amber-50 text-amber-600"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
          {showAccent && (
            <span className="absolute -right-1 -top-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function MobileStat({
  label,
  value,
  tone = "slate",
  prefix = "",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "rose";
  prefix?: string;
}) {
  const textTone = {
    slate: "text-slate-800",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  } as const;

  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${
          value > 0 ? textTone[tone] : "text-slate-300"
        }`}
      >
        {value > 0 ? `${prefix}${value}` : "—"}
      </p>
    </div>
  );
}

function EmptyState({
  onUpload,
  onTemplate,
  hasAny,
}: {
  onUpload: () => void;
  onTemplate: () => void;
  hasAny: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox size={26} />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-800">
          {hasAny ? "Filtreye uyan kayıt yok" : "Henüz karşılaştırma yapılmadı"}
        </p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          {hasAny
            ? "Filtreleri temizleyip tekrar deneyin."
            : "Soldaki panelden ilk Excel dosyanızı yükleyerek başlayın."}
        </p>
      </div>
      {!hasAny && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onUpload}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Upload size={14} />
            Excel Yükle
          </button>
          <button
            type="button"
            onClick={onTemplate}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={14} />
            Şablon
          </button>
        </div>
      )}
    </div>
  );
}