"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Hash,
  Landmark,
  Loader2,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

interface DocumentDetailScreenProps {
  documentId: string;
  inline?: boolean;
  variant?: "admin" | "company";
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
    id?: number;
    name: string;
    taxNumber: string;
    processStatus: string | null;
    authorizationEndDate: string | null;
  };
};

type DocumentDetailResponse = {
  success: boolean;
  message: string;
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

function getDocumentStatus(document: ApiDocumentDetail) {
  if (document.status === "CANCELLED") {
    return {
      label: "İptal",
      description: "Belge iptal edilmiştir.",
      dot: "bg-red-500",
      className: "bg-red-50 text-red-700",
    };
  }

  if (document.status === "CLOSED" || document.isActive === false) {
    return {
      label: "Kapalı",
      description: "Belge kapatılmıştır.",
      dot: "bg-blue-500",
      className: "bg-blue-50 text-blue-700 border border-blue-200",
    };
  }

  const documentEndDate = document.documentEndDate;

  if (!documentEndDate) {
    return {
      label: "Aktif",
      description: "Belge aktif durumda.",
      dot: "bg-emerald-500",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  const end = new Date(documentEndDate);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const remainingDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (remainingDays < 0) {
    return {
      label: "Süresi Dolmuş",
      description: "Belge bitiş tarihi geçmiştir.",
      dot: "bg-red-500",
      className: "bg-red-50 text-red-700",
    };
  }

  if (remainingDays <= 180) {
    return {
      label: "Süresi Yaklaşıyor",
      description: `Belgenin bitmesine ${remainingDays} gün kaldı.`,
      dot: "bg-amber-500",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Aktif",
    description: `Belgenin bitmesine ${remainingDays} gün kaldı.`,
    dot: "bg-emerald-500",
    className: "bg-emerald-50 text-emerald-700",
  };
}
export function DocumentDetailScreen({
  documentId,
  inline = false,
  variant = "company",
  isClosed = false,
}: DocumentDetailScreenProps) {
  const [document, setDocument] = useState<ApiDocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // PDF çıktısı için: yakalanacak alanın referansı ve üretim durumu
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    async function loadDocument() {
      setIsLoading(true);
      setLoadError("");
      setDocument(null);

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

    loadDocument();
  }, [documentId, isClosed]);

  async function handleDownloadPdf() {
    if (!printRef.current || !document || isGeneratingPdf) {
      return;
    }

    setIsGeneratingPdf(true);

    try {
      // Bu iki paket projeye eklenmeli: npm install html2canvas-pro jspdf
      // (html2canvas-pro kullanıyoruz çünkü orijinal html2canvas paketi
      // Tailwind v4'ün ürettiği lab()/oklch() gibi modern CSS renk
      // fonksiyonlarını tanımıyor ve "Attempting to parse an unsupported
      // color function" hatası veriyor.)
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,

        // PDF her ekran genişliğinde aynı oluşturulsun
        width: 794,
        height: 1123,
        windowWidth: 1280,
        windowHeight: 1600,

        ignoreElements: (el) => el.hasAttribute("data-pdf-ignore"),

        onclone: (clonedDocument) => {
          const pdfDocument = clonedDocument.querySelector<HTMLElement>(
            "[data-pdf-document]",
          );

          const pdfContent =
            clonedDocument.querySelector<HTMLElement>("[data-pdf-content]");

          const pdfFooter =
            clonedDocument.querySelector<HTMLElement>("[data-pdf-footer]");

          if (pdfDocument) {
            pdfDocument.style.width = "794px";
            pdfDocument.style.height = "1123px";
            pdfDocument.style.maxWidth = "none";
            pdfDocument.style.borderRadius = "0";
            pdfDocument.style.boxShadow = "none";
            pdfDocument.style.overflow = "hidden";
          }

          if (pdfContent) {
            pdfContent.style.height = "100%";
            pdfContent.style.display = "flex";
            pdfContent.style.flexDirection = "column";
            pdfContent.style.boxSizing = "border-box";
          }

          if (pdfFooter) {
            pdfFooter.style.marginTop = "auto";
            pdfFooter.style.color = "#000000";
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
      const safeDocNumber = (document.documentNumber ?? "belge").replace(
        /[^\p{L}\p{N}_-]+/gu,
        "_",
      );
      const safeCompanyName = document.company.name.replace(
        /[^\p{L}\p{N}_-]+/gu,
        "_",
      );

      pdf.save(`${safeDocNumber}-${safeCompanyName}.pdf`);
    } catch (error) {
      console.error("PDF oluşturulamadı:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Belge bilgileri yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <FileText size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Belge yüklenemedi
        </h3>
        <p className="mt-2 max-w-md text-sm text-slate-500">{loadError}</p>
        {!inline && (
          <Link
            href="/documents"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300"
          >
            <ArrowLeft size={16} />
            Belgelere dön
          </Link>
        )}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FileText size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Belge bulunamadı
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Aradığınız belge sistemde kayıtlı değil.
        </p>
      </div>
    );
  }

  const status = getDocumentStatus(document);

  // ============================================
  // ADMIN VARIANT
  // ============================================
  if (variant === "admin") {
    return (
      <div className="space-y-5">
        {/* ÜST ŞERİT */}
        <section className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Belge Detayı
              </p>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                {document.documentNumber ?? "-"}
                <span className="ml-2 text-xs font-medium text-slate-400">
                  Numaralı Belge
                </span>
              </h2>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 ${status.className}`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {status.label}
            </span>
          </div>
        </section>

        {/* KPI ŞERİDİ */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
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
                  value2={status.label}
                />
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // ============================================
  // COMPANY VARIANT (mevcut görünüm)
  // ============================================

  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const StatusChip = (
    <div
      className={`flex items-center gap-2 rounded-xl px-4 py-3 ${status.className}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
      <div>
        <p className="text-sm font-semibold">{status.label}</p>
        <p className="mt-0.5 text-xs opacity-80">{status.description}</p>
      </div>
    </div>
  );

  // "PDF indir" butonu — data-pdf-ignore sayesinde çıktının kendisine dahil olmaz
  const DownloadPdfButton = (
    <button
      type="button"
      onClick={handleDownloadPdf}
      disabled={isGeneratingPdf}
      data-pdf-ignore="true"
      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isGeneratingPdf ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          PDF hazırlanıyor...
        </>
      ) : (
        <>
          <Download size={16} />
          PDF indir
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {!inline ? (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft size={17} />
              Belgelerime dön
            </Link>

            {DownloadPdfButton}
          </div>

          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Belge detayı
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {document.documentNumber ?? "-"} Numaralı Belge
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Belgenizin tarih ve güncel durum bilgilerini görüntüleyin.
              </p>
            </div>
            {StatusChip}
          </div>
        </section>
      ) : (
        <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Belge detayı
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              {document.documentNumber ?? "-"} Numaralı Belge
            </h2>
          </div>
          <div className="flex flex-col items-end gap-3">
            {StatusChip}
            {DownloadPdfButton}
          </div>
        </section>
      )}

      {/* PDF çıktısına dahil edilecek alan buradan başlıyor */}
      <div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Belge Numarası"
            value={document.documentNumber ?? "-"}
            icon={<Hash size={19} />}
          />
          <InfoCard
            label="Belge Başlangıç"
            value={formatDate(document.documentStartDate)}
            icon={<CalendarDays size={19} />}
          />
          <InfoCard
            label="Belge Bitiş"
            value={formatDate(document.documentEndDate)}
            icon={<Clock3 size={19} />}
          />
          <InfoCard
            label="Destekleme Sınıfı"
            value={document.supportClass ?? "-"}
            icon={<Landmark size={19} />}
          />
        </section>

        <section className="mt-6 rounded-3xl bg-slate-50/70 p-3 sm:p-8">
          <div className="flex justify-center">
            <div
              ref={printRef}
              data-pdf-document
              className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >
              <Landmark
                size={200}
                strokeWidth={1}
                className="pointer-events-none absolute -right-12 -top-12 text-slate-900/[0.03]"
              />

              <div
                data-pdf-content
                className="relative px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14"
              >
                {/* BELGE BAŞLIĞI */}
                <header className="text-center">
                  <h1 className="text-xl font-extrabold uppercase tracking-[0.25em] text-slate-900 sm:text-2xl">
                    Yatırım Teşvik Belgesi
                  </h1>
                  <div className="mt-8 border-t-2 border-slate-800" />
                </header>

                {/* SAYI / KONU / TARİH */}
                <div className="mt-8 flex flex-wrap items-start justify-between gap-4 text-sm text-slate-700">
                  <div>
                    <p className="font-medium">
                      Sayı:{" "}
                      <span className="font-bold text-slate-900">
                        {document.documentNumber ?? "-"}
                      </span>
                    </p>

                    <p className="mt-1 font-medium">
                      Konu:{" "}
                      <span className="font-normal text-slate-700">
                        Yatırım Teşvik Belgesi Bilgileri
                      </span>
                    </p>
                  </div>

                  <p className="font-medium text-slate-600">{today}</p>
                </div>

                {/* BELGE BİLGİLERİ */}
                <div className="mt-10 text-center">
                  <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-slate-900">
                    Belge Bilgileri
                  </h2>
                  <div className="mx-auto mt-2 h-px w-16 bg-slate-300" />
                </div>

                <p className="mt-8 text-sm leading-7 text-slate-700">
                  Aşağıda,{" "}
                  <span className="font-semibold text-slate-900">
                    {document.company.name}
                  </span>{" "}
                  unvanlı firmaya ait{" "}
                  <span className="font-semibold text-slate-900">
                    {document.documentNumber ?? "-"}
                  </span>{" "}
                  sayılı Yatırım Teşvik Belgesi&apos;ne ilişkin bilgiler resmi
                  kayıtlardan alınarak sunulmuştur.
                </p>

                <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
                  <FormRow
                    label="Belge ID"
                    value={String(document.externalDocumentId)}
                  />

                  <FormRow
                    label="Belge No"
                    value={document.documentNumber ?? "-"}
                  />

                  <FormRow
                    label="Belge Başlangıç Tarihi"
                    value={formatDate(document.documentStartDate)}
                  />

                  <FormRow
                    label="Belge Bitiş Tarihi"
                    value={formatDate(document.documentEndDate)}
                  />

                  <FormRow
                    label="Süre Uzatım Tarihi"
                    value={formatDate(document.extensionDate)}
                  />

                  <FormRow
                    label="Destekleme Sınıfı"
                    value={document.supportClass ?? "-"}
                  />

                  <FormRow label="Firma Ünvanı" value={document.company.name} />

                  <FormRow
                    label="İşlem Durumu"
                    value={document.company.processStatus ?? "-"}
                  />

                  <FormRow
                    label="Yetki Bitiş Tarihi"
                    value={formatDate(document.company.authorizationEndDate)}
                  />

                  <FormRow label="Belge Durumu" value={status.label} />
                </dl>

                <p className="mt-8 text-sm leading-7 text-slate-700">
                  Bilgilerinize sunulur.
                </p>
                <p
                  data-pdf-footer
                  className="mt-10 border-t border-slate-300 pt-3 text-center text-[13px] font-medium leading-tight text-black"
                >
                  Bu doküman bilgilendirme amacıyla oluşturulmuştur, resmi belge
                  değildir.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================
   ALT BİLEŞENLER
   ============================================ */

interface InfoCardProps {
  label: string;
  value: string;
  icon: ReactNode;
}

function InfoCard({ label, value, icon }: InfoCardProps) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 break-words text-lg font-semibold text-slate-900">
        {value}
      </p>
    </article>
  );
}

interface FormRowProps {
  label: string;
  value: string;
}

function FormRow({ label, value }: FormRowProps) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-6">
      <dt className="w-full text-sm font-medium text-slate-600 sm:w-56 sm:shrink-0">
        {label}
      </dt>
      <dd className="flex-1 break-words text-sm font-semibold text-slate-900">
        : {value}
      </dd>
    </div>
  );
}

/* ---- ADMIN VARIANT ALT BİLEŞENLERİ ---- */

function KpiTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm ${
        accent ? "border-red-100 bg-red-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          accent ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function FieldGrid({
  items,
}: {
  groupLabel?: string;
  items: {
    label: string;
    value?: string | null;
    mono?: boolean;
  }[];
}) {
  return (
    <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
      {items.map((item) => {
        const displayValue = item.value?.toString().trim() || "-";
        const isEmpty = displayValue === "-";

        return (
          <div key={item.label} className="flex flex-col gap-1 px-5 py-3.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {item.label}
            </span>

            <span
              className={`text-sm ${item.mono ? "font-mono" : ""} ${
                isEmpty ? "text-slate-300" : "font-semibold text-slate-800"
              }`}
            >
              {displayValue}
            </span>
          </div>
        );
      })}
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
      <th className="w-[16%] bg-slate-50/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label1}
      </th>

      <td className="w-[34%] px-4 py-3 text-sm font-semibold text-slate-900">
        {value1}
      </td>

      <th className="w-[16%] border-l border-slate-100 bg-slate-50/60 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label2}
      </th>

      <td className="w-[34%] px-4 py-3 text-sm font-semibold text-slate-900">
        {value2}
      </td>
    </tr>
  );
}
