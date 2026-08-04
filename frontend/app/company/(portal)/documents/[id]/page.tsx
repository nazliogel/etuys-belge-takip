import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Hash,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { companyMockData } from "@/lib/company-mock-data";

interface DocumentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function getDocumentStatus(endDate: string) {
  const [day, month, year] = endDate.split(".").map(Number);
  const end = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const remainingDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (remainingDays < 0) {
    return {
      label: "Süresi Dolmuş",
      description: "Belgenin normal bitiş tarihi geçmiştir.",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (remainingDays <= 180) {
    return {
      label: "Süresi Yaklaşıyor",
      description: `Belgenin bitmesine ${remainingDays} gün kaldı.`,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Aktif",
    description: `Belgenin bitmesine ${remainingDays} gün kaldı.`,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { id } = await params;

  const document = companyMockData.documents.find(
    (item) => String(item.id) === id,
  );

  if (!document) {
    notFound();
  }

  const status = getDocumentStatus(document.endDate);
  const today = new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Üst şerit */}
      <section>
        <Link
          href="/company/documents"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
        >
          <ArrowLeft size={17} />
          Belgelerime dön
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-medium text-indigo-600">Belge detayı</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {document.number} Numaralı Belge
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Belgenizin tarih, durum ve işlem geçmişini görüntüleyin.
            </p>
          </div>

          <div className={`rounded-xl border px-4 py-3 ${status.className}`}>
            <p className="text-sm font-semibold">{status.label}</p>
            <p className="mt-1 text-xs">{status.description}</p>
          </div>
        </div>
      </section>

      {/* Özet kartları */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Belge Numarası"
          value={String(document.number)}
          icon={<Hash size={21} />}
        />
        <InfoCard
          label="Belge Başlangıç"
          value={document.startDate}
          icon={<CalendarDays size={21} />}
        />
        <InfoCard
          label="Belge Bitiş"
          value={document.endDate}
          icon={<Clock3 size={21} />}
        />
        <InfoCard
          label="Destekleme Sınıfı"
          value={document.supportClass}
          icon={<Landmark size={21} />}
        />
      </section>

      {/* Antetli kağıt + yan panel */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* ═══════════ ANTETLİ KAĞIT ═══════════ */}
        <div className="relative rounded-sm bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-slate-200">
          <div className="px-10 py-12 sm:px-14 sm:py-14">
            {/* ANTET */}
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

            {/* Çift çizgi ayırıcı */}
            <div className="mt-8 border-t-2 border-slate-800" />
            <div className="mt-1 border-t border-slate-800" />

            {/* Sağ üst — Belge no ve tarih */}
            <div className="mt-8 flex flex-wrap items-start justify-between gap-4 text-sm text-slate-700">
              <div>
                <p className="font-medium">
                  Sayı:{" "}
                  <span className="font-bold text-slate-900">
                    {document.number}
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

            {/* Başlık */}
            <div className="mt-10 text-center">
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-slate-900">
                Belge Bilgileri
              </h2>
              <div className="mx-auto mt-2 h-px w-16 bg-slate-400" />
            </div>

            {/* Giriş metni */}
            <p className="mt-8 text-sm leading-7 text-slate-700">
              Aşağıda,{" "}
              <span className="font-semibold text-slate-900">
                {companyMockData.company.name}
              </span>{" "}
              unvanlı firmaya ait{" "}
              <span className="font-semibold text-slate-900">
                {document.number}
              </span>{" "}
              sayılı Yatırım Teşvik Belgesi'ne ilişkin bilgiler, resmi
              kayıtlardan alınarak sunulmuştur.
            </p>

            {/* Bilgi tablosu — resmi form gibi */}
            <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              <FormRow label="Belge ID" value={String(document.id)} />
              <FormRow label="Belge No" value={String(document.number)} />
              <FormRow
                label="Belge Başlangıç Tarihi"
                value={document.startDate}
              />
              <FormRow label="Belge Bitiş Tarihi" value={document.endDate} />
              <FormRow
                label="Süre Uzatım Tarihi"
                value={document.extensionDate ?? "-"}
              />
              <FormRow
                label="Destekleme Sınıfı"
                value={document.supportClass}
              />
              <FormRow
                label="Firma Ünvanı"
                value={companyMockData.company.name}
              />
              <FormRow
                label="Vergi Numarası"
                value={companyMockData.company.taxNumber}
              />
            </dl>

            {/* Kapanış */}
            <p className="mt-8 text-sm leading-7 text-slate-700">
              Bilgilerinize sunulur.
            </p>

            {/* Alt boşluk */}
            <div className="mt-16" />

            {/* Alt çizgi + kurum ibaresi */}
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

        {/* Yan panel */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Belge Durumu</h2>
                <p className="text-sm text-slate-500">Güncel belge bilgisi</p>
              </div>
            </div>

            <div className={`mt-5 rounded-xl border p-4 ${status.className}`}>
              <p className="font-semibold">{status.label}</p>
              <p className="mt-1 text-sm">{status.description}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
            <h2 className="font-semibold text-indigo-900">Bilgilendirme</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-700">
              Firma kullanıcıları belge bilgilerini yalnızca görüntüleyebilir.
              Eksik veya hatalı bir bilgi bulunuyorsa sistem yöneticinizle
              iletişime geçin.
            </p>
          </div>
        </div>
      </section>

      {/* İşlem geçmişi */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Belge İşlem Geçmişi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Belgeyle ilgili gerçekleştirilen başvuru ve işlemler
          </p>
        </div>

        {document.transactions.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText size={26} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              İşlem geçmişi bulunamadı
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Bu belgeyle ilgili kayıtlı bir işlem bulunmuyor.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Yapılan İşlem</th>
                    <th className="px-6 py-4">İşlem Tarihi</th>
                    <th className="px-6 py-4">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {document.transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <CheckCircle2 size={18} />
                          </div>
                          <span className="font-medium text-slate-900">
                            {transaction.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">
                        {transaction.date}
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-200 md:hidden">
              {document.transactions.map((transaction) => (
                <article key={transaction.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={19} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {transaction.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {transaction.date}
                      </p>
                      <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-bold text-slate-900">
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
