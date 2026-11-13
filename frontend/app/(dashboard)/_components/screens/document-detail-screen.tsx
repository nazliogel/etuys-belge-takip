"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CalendarClock,
  Clock3,
  Download,
  FileText,
  Hash,
  Landmark,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { formatDate, getDocumentStatusInfo } from "./documents/lib";

interface DocumentDetailScreenProps {
  documentId: string;
  inline?: boolean;
  // Eski çağrılar bozulmasın diye duruyor; ekran artık sadece firma görünümü.
  // (Admin belge detayı AdminDocumentDetailScreen ile açılıyor.)
  variant?: "admin" | "company";
  isClosed?: boolean;
}

type ApiDocumentDetail = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentDate?: string | null;
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
  effectiveEndDate?: string | null;

  company: {
    id?: number;
    name: string;
    taxNumber: string;
    processStatus: string | null;
    authorizationEndDate: string | null;
  };

  // Belgenin künye bilgisi (yatırım yeri); firma bilgisinden bağımsızdır.
  city?: string | null;
  district?: string | null;
  address?: string | null;
  osbName?: string | null;
};

// Boş ya da eksik değerler için "-" gösterir.
function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
}

type DocumentDetailResponse = {
  success: boolean;
  message: string;
  data: ApiDocumentDetail;
};

const STATUS_STYLES = {
  green: {
    dot: "bg-emerald-500",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  amber: {
    dot: "bg-amber-500",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  red: {
    dot: "bg-red-500",
    className: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  },
  blue: {
    dot: "bg-blue-500",
    className:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  violet: {
    dot: "bg-violet-500",
    className:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  },
  orange: {
    dot: "bg-orange-500",
    className:
      "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  },
};

// "YYYY-MM-DD" tarihine bugünden kaç gün kaldığını hesaplar
function daysUntil(dateOnly: string | null | undefined): number | null {
  if (!dateOnly) return null;

  const [year, month, day] = dateOnly.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;

  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// Durum etiketi ve rengi ortak fonksiyondan (documents/lib.ts) gelir;
// burada sadece altındaki açıklama cümlesi eklenir.
function getDocumentStatus(document: ApiDocumentDetail) {
  const { key, label, tone } = getDocumentStatusInfo(document);

  const remainingDays = daysUntil(document.effectiveEndDate);

  const descriptions: Record<typeof key, string> = {
    CANCELLED: "Belge iptal edilmiştir.",
    CLOSED: "Belge kapatılmıştır.",
    AUTHORIZATION_EXPIRED: "Firmanın yetki süresi dolmuştur.",
    CLOSURE_ELIGIBLE: "Uzatılan süre sona ermiştir.",
    EXTENSION_ELIGIBLE: "Süre uzatma müracaatı yapılabilir.",
    CLOSURE_APPLIED: "Belge için kapatma müracaatı yapılmıştır.",
    EXPIRED: "Belge bitiş tarihi geçmiştir.",
    ACTIVE:
      remainingDays !== null && remainingDays >= 0
        ? `Belgenin bitmesine ${remainingDays} gün kaldı.`
        : "Belge aktif durumda.",
  };

  return { label, description: descriptions[key], ...STATUS_STYLES[tone] };
}

export function DocumentDetailScreen({
  documentId,
  inline = false,
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
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground/70" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Belge bilgileri yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <FileText size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Belge yüklenemedi
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {loadError}
        </p>
        {!inline && (
          <Link
            href="/documents"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-foreground/80 shadow-sm ring-1 ring-border transition hover:ring-foreground/30"
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FileText size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Belge bulunamadı
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Aradığınız belge sistemde kayıtlı değil.
        </p>
      </div>
    );
  }

  const status = getDocumentStatus(document);

  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const StatusChip = (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 sm:px-4 sm:py-3 ${status.className}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
      <div className="min-w-0">
        <p className="text-xs font-semibold sm:text-sm">{status.label}</p>
        <p className="mt-0.5 truncate text-xs font-medium opacity-90 sm:text-[15px]">
          {status.description}
        </p>
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
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-700 to-blue-800 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-800/25 transition hover:from-blue-800 hover:to-blue-900 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
    >
      {isGeneratingPdf ? (
        <>
          <Loader2 size={14} className="animate-spin sm:h-4 sm:w-4" />
          PDF hazırlanıyor...
        </>
      ) : (
        <>
          <Download size={14} className="sm:h-4 sm:w-4" />
          PDF indir
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Üst kısım: açık ve kapalı belgelerde birebir aynı düzen.
          PDF butonu durum kutusunun yanında durur. */}
      <section className="flex flex-col justify-between gap-3 sm:gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Belge detayı
          </p>
          {inline ? (
            <h2 className="mt-1 break-words text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
              {document.documentNumber ?? "-"} Numaralı Belge
            </h2>
          ) : (
            <h1 className="mt-1 break-words text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
              {document.documentNumber ?? "-"} Numaralı Belge
            </h1>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
            Belgenizin tarih ve güncel durum bilgilerini görüntüleyin.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
          {StatusChip}
          {DownloadPdfButton}
        </div>
      </section>

      {/* Bilgi kartları — mobilde 2 sütun, tablette 3, xl'de 6 */}
      <div>
        <section className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          <InfoCard
            shade={0}
            label="Belge Numarası"
            value={document.documentNumber ?? "-"}
            note={
              document.documentDate
                ? `Belge Tarihi: ${formatDate(document.documentDate)}`
                : undefined
            }
            icon={<Hash size={16} className="sm:h-[18px] sm:w-[18px]" />}
          />
          <InfoCard
            shade={1}
            label="Belge Başlangıç"
            value={formatDate(document.documentStartDate)}
            icon={
              <CalendarDays size={16} className="sm:h-[18px] sm:w-[18px]" />
            }
          />
          <InfoCard
            shade={2}
            label="Belge Bitiş"
            value={formatDate(document.documentEndDate)}
            icon={<Clock3 size={16} className="sm:h-[18px] sm:w-[18px]" />}
          />
          <InfoCard
            shade={3}
            label="Süre Uzatım"
            value={formatDate(document.extensionDate)}
            icon={
              <CalendarClock size={16} className="sm:h-[18px] sm:w-[18px]" />
            }
          />
          <InfoCard
            shade={4}
            label="Destekleme Sınıfı"
            value={document.supportClass ?? "-"}
            icon={<Landmark size={16} className="sm:h-[18px] sm:w-[18px]" />}
          />
          <InfoCard
            shade={5}
            label="Yetki Bitiş"
            value={formatDate(document.company.authorizationEndDate)}
            icon={
              <ShieldCheck size={16} className="sm:h-[18px] sm:w-[18px]" />
            }
          />
        </section>

        {/*
          PDF çıktısına dahil edilecek alan buradan başlıyor.
          İç kısım (data-pdf-document) DAİMA beyaz zeminde ve siyah metinle basılır —
          "gerçek bir belge" olduğu için dark mode olsa bile karanlıklaşmıyor. Sadece
          etrafındaki sarmalayıcı (bg-muted/30) tema ile değişiyor.
        */}
        <section className="mt-4 overflow-hidden rounded-2xl bg-slate-50/70 p-2 dark:bg-muted/30 sm:mt-6 sm:rounded-3xl sm:p-8">
          <div className="flex justify-center">
            <div
              ref={printRef}
              data-pdf-document
              className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 sm:rounded-2xl"
            >
              <Landmark
                size={200}
                strokeWidth={1}
                className="pointer-events-none absolute -right-12 -top-12 text-slate-900/[0.03]"
              />

              <div
                data-pdf-content
                className="relative px-3 py-6 sm:px-10 sm:py-12 lg:px-14 lg:py-14"
              >
                {/* BELGE BAŞLIĞI */}
                <header className="text-center">
                  <h1 className="text-sm font-extrabold uppercase tracking-[0.15em] text-slate-900 sm:text-2xl sm:tracking-[0.25em]">
                    Yatırım Teşvik Belgesi
                  </h1>
                  <div className="mt-4 border-t-2 border-slate-800 sm:mt-8" />
                </header>

                {/* SAYI / KONU / TARİH */}
                <div className="mt-4 flex flex-col items-start justify-between gap-2 text-xs text-slate-700 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-4 sm:text-sm">
                  <div className="min-w-0">
                    <p className="break-words font-medium">
                      Sayı:{" "}
                      <span className="font-bold text-slate-900">
                        {document.documentNumber ?? "-"}
                      </span>
                    </p>

                    <p className="mt-1 break-words font-medium">
                      Konu:{" "}
                      <span className="font-normal text-slate-700">
                        Yatırım Teşvik Belgesi Bilgileri
                      </span>
                    </p>
                  </div>

                  <p className="font-medium text-slate-600">{today}</p>
                </div>

                {/* BELGE BİLGİLERİ */}
                <div className="mt-6 text-center sm:mt-10">
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-900 sm:text-lg sm:tracking-[0.2em]">
                    Belge Bilgileri
                  </h2>
                  <div className="mx-auto mt-2 h-px w-16 bg-slate-300" />
                </div>

                <p className="mt-4 break-words text-xs leading-6 text-slate-700 sm:mt-8 sm:text-sm sm:leading-7">
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

                <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200 sm:mt-8">
                  <FormRow label="Firma Ünvanı" value={document.company.name} />

                  <FormRow
                    label="Belge ID"
                    value={String(document.externalDocumentId)}
                  />

                  <FormRow
                    label="Belge No"
                    value={document.documentNumber ?? "-"}
                  />

                  <FormRow
                    label="Belge Tarihi"
                    value={formatDate(document.documentDate ?? null)}
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
                    label="Yetki Bitiş Tarihi"
                    value={formatDate(document.company.authorizationEndDate)}
                  />

                  <FormRow label="Belge Durumu" value={status.label} />
                  <FormRow
                    label="Destekleme Sınıfı"
                    value={document.supportClass ?? "-"}
                  />


                  <FormRow
                    label="İl"
                    value={displayValue(document.city)}
                  />

                  <FormRow
                    label="İlçe"
                    value={displayValue(document.district)}
                  />

                  <FormRow
                    label="Adres"
                    value={displayValue(document.address)}
                  />

                  <FormRow
                    label="OSB Adı"
                    value={displayValue(document.osbName)}
                  />


                </dl>

                <p className="mt-5 text-xs leading-6 text-slate-700 sm:mt-8 sm:text-sm sm:leading-7">
                  Bilgilerinize sunulur.
                </p>
                <p
                  data-pdf-footer
                  className="mt-6 border-t border-slate-300 pt-3 text-center text-[11px] font-medium leading-tight text-black sm:mt-10 sm:text-[13px]"
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

// Kartlar soldan sağa koyu laciverttten açık maviye doğru gider (panelin mavi teması).
// Tailwind sınıfları tam yazılmalı (birleştirilmiş metin çalışmaz).
const INFO_CARD_SHADES = [
  "from-blue-700 to-blue-800 shadow-blue-800/25",
  "from-blue-600 to-blue-700 shadow-blue-700/25",
  "from-blue-500 to-blue-600 shadow-blue-600/25",
  "from-blue-500 to-sky-600 shadow-sky-700/25",
  "from-sky-500 to-sky-600 shadow-sky-600/25",
  "from-sky-400 to-sky-500 shadow-sky-500/25",
] as const;

interface InfoCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  // 0 = en koyu, 5 = en açık
  shade: number;
  // Değerin altında küçük yazılan ek bilgi (ör. Belge Tarihi)
  note?: string;
}

function InfoCard({ label, value, icon, shade, note }: InfoCardProps) {
  const shadeClass =
    INFO_CARD_SHADES[Math.min(Math.max(shade, 0), INFO_CARD_SHADES.length - 1)];

  return (
    <article
      className={`group relative overflow-hidden rounded-xl bg-gradient-to-br p-3 text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:rounded-2xl sm:p-4 ${shadeClass}`}
    >
      {/* Dekoratif yarı saydam daireler */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-125 sm:h-20 sm:w-20"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -left-4 h-12 w-12 rounded-full bg-white/5 sm:h-16 sm:w-16"
      />

      <div className="relative">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20 sm:mb-3 sm:h-9 sm:w-9">
          {icon}
        </div>
        <p className="text-xs font-semibold text-white/90 sm:text-[15px]">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-bold leading-snug text-white sm:text-xl">
          {value}
        </p>
        {note && (
          <p className="mt-0.5 text-[11px] font-medium text-white/80 sm:text-xs">
            {note}
          </p>
        )}
      </div>
    </article>
  );
}

interface FormRowProps {
  label: string;
  value: string;
}

function FormRow({ label, value }: FormRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:gap-6 sm:py-3">
      <dt className="w-full text-[11px] font-medium text-slate-600 sm:w-56 sm:shrink-0 sm:text-sm">
        {label}
      </dt>
      <dd className="flex-1 break-words text-xs font-semibold text-slate-900 sm:text-sm">
        <span className="hidden sm:inline">: </span>
        {value}
      </dd>
    </div>
  );
}