"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Hash,
  Landmark,
  History,
} from "lucide-react";
import { companyMockData } from "@/lib/company-mock-data";

interface DocumentDetailScreenProps {
  documentId: string;
  inline?: boolean;
}

function getDocumentStatus(endDate: string) {
  const [day, month, year] = endDate.split(".").map(Number);
  const end = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const remainingDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (remainingDays < 0) {
    return {
      label: "Süresi Dolmuş",
      description: "Belgenin normal bitiş tarihi geçmiştir.",
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
  const document = companyMockData.documents.find(
    (item) => String(item.id) === documentId
  );

  if (!document) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FileText size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Belge bulunamadı
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Aradığınız belge sistemde kayıtlı değil.
        </p>
        <Link
          href="/documents"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300"
        >
          <ArrowLeft size={16} />
          Belgelere dön
        </Link>
      </div>
    );
  }

  const status = getDocumentStatus(document.endDate);
  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const StatusChip = (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${status.className}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
      <div>
        <p className="text-sm font-semibold">{status.label}</p>
        <p className="mt-0.5 text-xs opacity-80">{status.description}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Üst şerit */}
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
                {document.number} Numaralı Belge
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Belgenizin tarih, durum ve işlem geçmişini görüntüleyin.
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
              {document.number} Numaralı Belge
            </h2>
          </div>
          {StatusChip}
        </section>
      )}

      {/* Özet kartları */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Belge Numarası" value={String(document.number)} icon={<Hash size={19} />} />
        <InfoCard label="Belge Başlangıç" value={document.startDate} icon={<CalendarDays size={19} />} />
        <InfoCard label="Belge Bitiş" value={document.endDate} icon={<Clock3 size={19} />} />
        <InfoCard label="Destekleme Sınıfı" value={document.supportClass} icon={<Landmark size={19} />} />
      </section>

      {/* Antetli belge */}
      <section className="rounded-3xl bg-slate-50/70 p-3 sm:p-8">
        <div className="flex justify-center">
          {/* ANTETLİ KAĞIT */}
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
          >
            {/* Çok düşük opasiteli mühür deseni — kağıda resmiyet katar, dikkat çekmez */}
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
                    Sayı: <span className="font-bold text-slate-900">{document.number}</span>
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
                  {companyMockData.company.name}
                </span>{" "}
                unvanlı firmaya ait{" "}
                <span className="font-semibold text-slate-900">{document.number}</span>{" "}
                sayılı Yatırım Teşvik Belgesi&apos;ne ilişkin bilgiler, resmi
                kayıtlardan alınarak sunulmuştur.
              </p>

              <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
                <FormRow label="Belge ID" value={String(document.id)} />
                <FormRow label="Belge No" value={String(document.number)} />
                <FormRow label="Belge Başlangıç Tarihi" value={document.startDate} />
                <FormRow label="Belge Bitiş Tarihi" value={document.endDate} />
                <FormRow label="Süre Uzatım Tarihi" value={document.extensionDate ?? "-"} />
                <FormRow label="Destekleme Sınıfı" value={document.supportClass} />
                <FormRow label="Firma Ünvanı" value={companyMockData.company.name} />
                <FormRow label="Vergi Numarası" value={companyMockData.company.taxNumber} />
              </dl>

              <p className="mt-8 text-sm leading-7 text-slate-700">Bilgilerinize sunulur.</p>

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

/* ————— Alt bileşenler ————— */

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
      <p className="mt-1.5 break-words text-lg font-semibold text-slate-900">{value}</p>
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
      <dt className="w-full text-sm font-medium text-slate-600 sm:w-56 sm:shrink-0">{label}</dt>
      <dd className="flex-1 break-words text-sm font-semibold text-slate-900">: {value}</dd>
    </div>
  );
}