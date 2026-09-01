"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileUp,
  Inbox,
  RefreshCw,
  ListChecks,
  RotateCcw,
  Upload,
  X,
  Eye,
  BarChart3,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE / (1024 * 1024)} MB`;

type ImportStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type ExcelImportType =
  | "OPEN_DOCUMENTS"
  | "CLOSED_DOCUMENTS"
  | "COMPANY_IDENTITY"
  | "COMPANY_REQUEST";

type ImportBatchType =
  | "OPEN"
  | "CLOSED"
  | "COMPANY_IDENTITY"
  | "COMPANY_REQUEST";

type ImportRecord = {
  id: number;
  fileName: string;
  date: string;
  totalRows: number;
  newRows: number;
  changedRows: number;
  invalidRows: number;
  status: ImportStatus;
  unchangedRows: number;
  importType: ImportBatchType;
};

type ImportBatchApi = {
  id: number;
  fileName: string;
  status: ImportStatus;
  importType: ImportBatchType;
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
  data: {
    items: ImportBatchApi[];
    totalCount: number;
  };
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusBadge(status: ImportStatus) {
  switch (status) {
    case "UPLOADED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
          Yüklendi
        </span>
      );

    case "PROCESSING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          <RefreshCw size={12} className="animate-spin" />
          İşleniyor
        </span>
      );

    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Tamamlandı
        </span>
      );

    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          <AlertCircle size={12} />
          Hatalı
        </span>
      );

    case "CANCELLED":
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          İptal edildi
        </span>
      );
  }
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
  const [recentImports, setRecentImports] = useState<ImportRecord[]>([]);
  const [importType, setImportType] =
    useState<ExcelImportType>("OPEN_DOCUMENTS");
  async function loadImports() {
    try {
      const response = await apiFetch<ImportListResponse>(
        "/imports?page=1&limit=50",
      );

      const mappedImports: ImportRecord[] = response.data.items.map((item) => ({
        id: item.id,
        fileName: item.fileName,
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
        importType: item.importType,
      }));

      setRecentImports(mappedImports);
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Karşılaştırma geçmişi alınamadı.",
      );
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadImports();
  }, []);

  function validateAndSelectFile(file?: File) {
    setFileError("");
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    const isValidExtension = extension === "xlsx" || extension === "xls";

    if (!isValidExtension) {
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
  }

  function handleViewExcel(importId: number) {
    console.info("Excel görüntüleme tetiklendi.", importId);
  }

  function handleViewReport(importId: number) {
    router.push(`/excel-import/${importId}`);
  }

  async function handleUpload() {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadProgress(10);
    setFileError("");

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);

      setUploadProgress(30);

      if (importType === "COMPANY_IDENTITY") {
        await apiFetch("/companies/identity/import", {
          method: "POST",
          body: formData,
        });
      } else {
        const backendImportType =
          importType === "COMPANY_REQUEST"
            ? "COMPANY_REQUEST"
            : importType === "CLOSED_DOCUMENTS"
              ? "CLOSED"
              : "OPEN";

        formData.append(
          "isFullSnapshot",
          importType === "COMPANY_REQUEST" ? "false" : "true",
        );

        formData.append("importType", backendImportType);

        await apiFetch("/imports/upload", {
          method: "POST",
          body: formData,
        });
      }

      setUploadProgress(90);

      await loadImports();

      setUploadProgress(100);
      setSelectedFile(null);
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : importType === "COMPANY_IDENTITY"
            ? "Künye bilgileri aktarılırken beklenmeyen bir hata oluştu."
            : "Excel dosyası işlenirken beklenmeyen bir hata oluştu.",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* BAŞLIK & METRİK KARTLARI */}
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Excel Karşılaştırma
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Güncel Excel verilerinizi veritabanı kayıtları ile anlık olarak
              karşılaştırın.
            </p>
          </div>
        </div>
      </div>

      {/* DOSYA YÜKLEME ALANI */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Yeni Dosya Yükle
          </h2>
          <p className="text-xs text-slate-500">
            Yüklemek istediğiniz Excel dosyasını seçin veya ilgili alana
            sürükleyin.
          </p>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              setImportType("OPEN_DOCUMENTS");
              clearSelectedFile();
            }}
            className={`group rounded-2xl border p-4 text-left transition-all ${
              importType === "OPEN_DOCUMENTS"
                ? "border-emerald-300 bg-emerald-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  importType === "OPEN_DOCUMENTS"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                }`}
              >
                <FileSpreadsheet size={20} />
              </div>

              <div>
                <p
                  className={`text-sm font-bold ${
                    importType === "OPEN_DOCUMENTS"
                      ? "text-emerald-800"
                      : "text-slate-800"
                  }`}
                >
                  Açık Belgeler
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Aktif teşvik belgelerini veritabanıyla karşılaştırır ve
                  günceller.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              setImportType("CLOSED_DOCUMENTS");
              clearSelectedFile();
            }}
            className={`group rounded-2xl border p-4 text-left transition-all ${
              importType === "CLOSED_DOCUMENTS"
                ? "border-rose-300 bg-rose-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  importType === "CLOSED_DOCUMENTS"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-700"
                }`}
              >
                <X size={20} />
              </div>

              <div>
                <p
                  className={`text-sm font-bold ${
                    importType === "CLOSED_DOCUMENTS"
                      ? "text-rose-800"
                      : "text-slate-800"
                  }`}
                >
                  Kapalı / İptal Belgeler
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Kapalı veya iptal edilmiş teşvik belgelerini sisteme aktarır.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              setImportType("COMPANY_IDENTITY");
              clearSelectedFile();
            }}
            className={`group rounded-2xl border p-4 text-left transition-all ${
              importType === "COMPANY_IDENTITY"
                ? "border-sky-300 bg-sky-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  importType === "COMPANY_IDENTITY"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-700"
                }`}
              >
                <Inbox size={20} />
              </div>

              <div>
                <p
                  className={`text-sm font-bold ${
                    importType === "COMPANY_IDENTITY"
                      ? "text-sky-800"
                      : "text-slate-800"
                  }`}
                >
                  Firma Künye Bilgileri
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Firmaların künye ve tanımlayıcı bilgilerini Excel üzerinden
                  günceller.
                </p>
              </div>
            </div>
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              setImportType("COMPANY_REQUEST");
              clearSelectedFile();
            }}
            className={`group rounded-2xl border p-4 text-left transition-all ${
              importType === "COMPANY_REQUEST"
                ? "border-violet-300 bg-violet-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  importType === "COMPANY_REQUEST"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700"
                }`}
              >
                <ListChecks size={20} />
              </div>

              <div>
                <p
                  className={`text-sm font-bold ${
                    importType === "COMPANY_REQUEST"
                      ? "text-violet-800"
                      : "text-slate-800"
                  }`}
                >
                  Gönderilmiş Talepler
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Firmalara ait gönderilmiş talepleri Belge Id üzerinden
                  eşleştirerek sisteme aktarır.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* DRAG & DROP AREA */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
            isDragging
              ? "border-red-500 bg-red-50/50 scale-[1.005]"
              : fileError
                ? "border-rose-300 bg-rose-50/30 hover:bg-rose-50/50"
                : selectedFile
                  ? "border-red-200 bg-slate-50/30 cursor-default"
                  : "border-slate-200 bg-slate-50/50 hover:border-red-300 hover:bg-red-50/10"
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
            <div className="flex flex-col items-center pointer-events-none">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 ${
                  fileError
                    ? "bg-rose-100 text-rose-600"
                    : "bg-red-50 text-red-600 shadow-xs"
                }`}
              >
                <FileUp size={28} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                Excel dosyasını buraya sürükleyip bırakın
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                veya bilgisayarınızdan göz atmak için{" "}
                <span className="font-semibold text-red-600 underline">
                  tıklayın
                </span>
              </p>

              <span className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                XLSX, XLS · Maks. {MAX_FILE_SIZE_LABEL}
              </span>
            </div>
          ) : (
            /* SEÇİLEN DOSYA KARTI */
            <div
              className="w-full max-w-lg rounded-xl border border-red-100 bg-white p-4 shadow-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <FileSpreadsheet size={24} />
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {selectedFile.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedFile}
                  disabled={isUploading}
                  aria-label="Seçilen dosyayı kaldır"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* İŞLENİYOR PROGRESS BAR */}
              {isUploading && (
                <div className="mt-4 space-y-1.5 text-left">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-red-600 flex items-center gap-1.5">
                      <RefreshCw size={12} className="animate-spin" />
                      {importType === "COMPANY_IDENTITY"
                        ? "Künye Bilgileri Aktarılıyor..."
                        : importType === "COMPANY_REQUEST"
                          ? "Gönderilmiş Talepler Aktarılıyor..."
                          : "Satırlar Analiz Ediliyor..."}
                    </span>
                    <span className="font-bold text-slate-700">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={uploadProgress}
                    className="h-2 overflow-hidden rounded-full bg-red-50"
                  >
                    <div
                      className="h-full rounded-full bg-red-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HATA MESAJI */}
        {fileError && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs font-medium text-rose-700"
          >
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <p>{fileError}</p>
          </div>
        )}

        {/* AKSİYON BUTONLARI */}
        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={clearSelectedFile}
            disabled={!selectedFile || isUploading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw size={15} />
            Temizle
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 text-xs font-semibold text-white shadow-xs transition-all hover:from-red-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={15} />
            {isUploading
              ? importType === "COMPANY_IDENTITY"
                ? "Künye Bilgileri Aktarılıyor..."
                : importType === "COMPANY_REQUEST"
                  ? "Talepler Aktarılıyor..."
                  : "Karşılaştırılıyor..."
              : importType === "COMPANY_IDENTITY"
                ? "Künye Bilgilerini Yükle"
                : importType === "COMPANY_REQUEST"
                  ? "Gönderilmiş Talepleri Yükle"
                  : "Yükle ve Karşılaştır"}
          </button>
        </div>
      </section>

      {/* KARŞILAŞTIRMA GEÇMİŞİ TABLOSU */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Karşılaştırma Geçmişi
            </h2>
            <p className="text-xs text-slate-500">
              Daha önce gerçekleştirilmiş aktarımlar ve analiz detayları.
            </p>
          </div>
        </div>

        {recentImports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Henüz karşılaştırma yapılmadı
            </p>
            <p className="max-w-xs text-xs text-slate-500">
              Yukarıdaki alanı kullanarak ilk Excel dosyanızı yükleyebilirsiniz.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLO */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Dosya</th>
                    <th className="px-3 py-3.5 text-center">Toplam</th>
                    <th className="px-3 py-3.5 text-center">Yeni</th>
                    <th className="px-3 py-3.5 text-center">Değişen</th>
                    <th className="px-3 py-3.5 text-center">Değişmeyen</th>
                    <th className="px-3 py-3.5 text-center">Hatalı</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-6 py-3.5 text-right">İşlemler</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentImports.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <FileSpreadsheet size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-xs truncate font-bold text-slate-800">
                              {item.fileName}
                            </p>

                            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {item.importType === "COMPANY_IDENTITY"
                                ? "Firma Künye Bilgileri"
                                : item.importType === "COMPANY_REQUEST"
                                  ? "Gönderilmiş Talepler"
                                  : item.importType === "CLOSED"
                                    ? "Kapalı / İptal Belgeler"
                                    : "Açık Belgeler"}
                            </span>

                            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              <Clock3 size={12} />
                              {item.date}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-center font-semibold text-slate-700">
                        {item.totalRows}
                      </td>

                      <td className="px-3 py-4 text-center">
                        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                          +{item.newRows}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-center">
                        <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                          {item.changedRows}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-center font-medium text-slate-500">
                        {item.unchangedRows}
                      </td>

                      <td className="px-3 py-4 text-center">
                        {item.invalidRows > 0 ? (
                          <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 font-bold text-rose-700">
                            {item.invalidRows}
                          </span>
                        ) : (
                          <span className="font-medium text-slate-400">0</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {getStatusBadge(item.status)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewExcel(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Eye size={13} />
                            Excel
                          </button>

                          <button
                            type="button"
                            onClick={() => handleViewReport(item.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100"
                          >
                            <BarChart3 size={13} />
                            Rapor
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBİL LİSTE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {recentImports.map((item) => (
                <article key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">
                          {item.fileName}
                        </p>

                        <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.importType === "COMPANY_IDENTITY"
                            ? "Firma Künye Bilgileri"
                            : item.importType === "COMPANY_REQUEST"
                              ? "Gönderilmiş Talepler"
                              : item.importType === "CLOSED"
                                ? "Kapalı / İptal Belgeler"
                                : "Açık Belgeler"}
                        </span>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {item.date}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-[10px] text-slate-400">Toplam</p>
                      <p className="font-bold text-slate-700">
                        {item.totalRows}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/60 p-2">
                      <p className="text-[10px] text-emerald-600">Yeni</p>
                      <p className="font-bold text-emerald-700">
                        +{item.newRows}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50/60 p-2">
                      <p className="text-[10px] text-amber-600">Değişen</p>
                      <p className="font-bold text-amber-700">
                        {item.changedRows}
                      </p>
                    </div>
                    <div className="rounded-xl bg-rose-50/60 p-2">
                      <p className="text-[10px] text-rose-600">Hatalı</p>
                      <p className="font-bold text-rose-700">
                        {item.invalidRows}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleViewExcel(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      <Eye size={14} /> Görüntüle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewReport(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs"
                    >
                      <BarChart3 size={14} /> Raporu Aç
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* FOOTER BİLGİ NOTU */}
      <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-sky-600" />
        <p className="text-xs leading-5 text-sky-900 font-medium">
          <strong>Güvenli Aktarım Protokolü:</strong> Yüklenen Excel dosyası
          önce analiz edilir ve mevcut kayıtlarla karşılaştırılır. Geçerli
          değişiklikler otomatik olarak veritabanına uygulanır.
        </p>
      </div>
    </div>
  );
}
