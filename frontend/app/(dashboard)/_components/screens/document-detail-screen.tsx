"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Hash,
  Landmark,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

interface DocumentDetailScreenProps {
  documentId: string;
  inline?: boolean;
}

type ApiDocumentDetail = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
  documentStartDate: string | null;
  documentEndDate: string | null;
  extensionDate: string | null;
  supportClass: string | null;
  isActive: boolean;

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
  if (!document.isActive) {
    return {
      label: "Pasif",
      description: "Belge aktif durumda değildir.",
      dot: "bg-slate-500",
      className: "bg-slate-100 text-slate-700",
    };
  }

  /*
   * Kalan gün hesabı yalnızca Belge Bitiş Tarihi
   * üzerinden yapılır.
   *
   * Süre Uzatım Tarihi bu hesaplamada kullanılmaz.
   */
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
}: DocumentDetailScreenProps) {
  const [document, setDocument] = useState<ApiDocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadDocument() {
      setIsLoading(true);
      setLoadError("");
      setDocument(null);

      try {
        const response = await apiFetch<DocumentDetailResponse>(
          `/documents/${documentId}`,
        );

        setDocument(response.data);
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
  }, [documentId]);

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

  return (
    <div className="space-y-6">
      {/* ÜST ŞERİT */}
      {!inline ? (
        <section>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Belgelerime dön
          </Link>

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

          {StatusChip}
        </section>
      )}

      {/* ÖZET KARTLARI */}
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

      {/* ANTETLİ BELGE */}
      <section className="rounded-3xl bg-slate-50/70 p-3 sm:p-8">
        <div className="flex justify-center">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Landmark
              size={200}
              strokeWidth={1}
              className="pointer-events-none absolute -right-12 -top-12 text-slate-900/[0.03]"
            />

            <div className="relative px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
              <header className="flex flex-col items-center text-center">
                <Image
                  src="/logos/sanayi-bakanligi.png"
                  alt="T.C. Sanayi ve Teknoloji Bakanlığı"
                  width={320}
                  height={160}
                  priority
                  className="h-auto w-64 select-none object-contain sm:w-72"
                />
              </header>

              <div className="mt-8 border-t-2 border-slate-800" />
              <div className="mt-1 border-t border-slate-800" />

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
                  label="Vergi Numarası"
                  value={document.company.taxNumber}
                />

                <FormRow
                  label="İşlem Durumu"
                  value={document.company.processStatus ?? "-"}
                />

                <FormRow
                  label="Yetki Bitiş Tarihi"
                  value={formatDate(document.company.authorizationEndDate)}
                />

                <FormRow
                  label="Belge Durumu"
                  value={document.isActive ? "Aktif" : "Pasif"}
                />
              </dl>

              <p className="mt-8 text-sm leading-7 text-slate-700">
                Bilgilerinize sunulur.
              </p>

              <div className="mt-16" />

              <div className="border-t border-slate-300 pt-4 text-center">
                <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">
                  T.C. Sanayi ve Teknoloji Bakanlığı
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Teşvik Uygulama ve Yabancı Sermaye Genel Müdürlüğü
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ALT BİLEŞENLER */

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
