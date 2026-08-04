import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { companyMockData } from "@/lib/company-mock-data";

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
      className: "bg-red-50 text-red-700 ring-red-200",
    };
  }

  if (remainingDays <= 180) {
    return {
      label: "Süresi Yaklaşıyor",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  }

  return {
    label: "Aktif",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
}

export default function CompanyDocumentsPage() {
  const documents = companyMockData.documents;
  const activeDocumentCount = documents.filter((document) => {
    const status = getDocumentStatus(document.endDate);
    return status.label === "Aktif";
  }).length;

  const expiredDocumentCount = documents.filter((document) => {
    const status = getDocumentStatus(document.endDate);
    return status.label === "Süresi Dolmuş";
  }).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">Firma Portalı</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">Belgelerim</h1>

          <p className="mt-1 text-sm text-slate-500">
            Firmanıza ait tüm teşvik belgelerini ve güncel durumlarını
            görüntüleyin.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <BuildingInfo />
          <span className="max-w-[280px] truncate font-medium text-slate-800">
            {companyMockData.company.name}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Toplam Belge"
          value={String(documents.length)}
          description="Firmanıza kayıtlı belge"
          icon={<FileText size={21} />}
        />

        <SummaryCard
          title="Aktif Belge"
          value={String(activeDocumentCount)}
          description="Süresi devam eden belge"
          icon={<FileCheck2 size={21} />}
        />

        <SummaryCard
          title="Süresi Dolmuş"
          value={String(expiredDocumentCount)}
          description="İşlem gerektiren belge"
          icon={<CalendarDays size={21} />}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Belge Listesi
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Belge numarası, tarih ve durum bilgileri
            </p>
          </div>

          <div className="flex w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 sm:max-w-xs">
            <Search size={18} className="shrink-0 text-slate-400" />

            <input
              type="search"
              placeholder="Belge ara..."
              className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText size={27} />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Kayıtlı belge bulunamadı
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              Firmanıza ait belge sisteme eklendiğinde bu ekranda
              görüntülenecektir.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Belge No</th>
                    <th className="px-6 py-4">Belge Başlangıç</th>
                    <th className="px-6 py-4">Belge Bitiş</th>
                    <th className="px-6 py-4">Süre Uzatım</th>
                    <th className="px-6 py-4">Destekleme Sınıfı</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">Detay</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document) => {
                    const status = getDocumentStatus(document.endDate);

                    return (
                      <tr
                        key={document.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <FileText size={20} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {document.number}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                Belge ID: {document.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600">
                          {document.startDate ?? "-"}
                        </td>

                        <td className="px-6 py-5 text-sm font-medium text-slate-800">
                          {document.endDate}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600">
                          {document.extensionDate ?? "-"}
                        </td>

                        <td className="px-6 py-5">
                          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {document.supportClass ?? "Belirtilmedi"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/company/documents/${document.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            Görüntüle
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-200 lg:hidden">
              {documents.map((document) => {
                const status = getDocumentStatus(document.endDate);

                return (
                  <article key={document.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <FileText size={21} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            Belge No: {document.number}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Belge ID: {document.id}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-slate-500">Başlangıç</dt>
                        <dd className="mt-1 font-medium text-slate-900">
                          {document.startDate ?? "-"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Bitiş</dt>
                        <dd className="mt-1 font-medium text-slate-900">
                          {document.endDate}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Süre uzatım</dt>
                        <dd className="mt-1 font-medium text-slate-900">
                          {document.extensionDate ?? "-"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Destekleme sınıfı</dt>
                        <dd className="mt-1 font-medium text-slate-900">
                          {document.supportClass ?? "Belirtilmedi"}
                        </dd>
                      </div>
                    </dl>

                    <Link
                      href={`/company/documents/${document.id}`}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Belge detayını görüntüle
                      <ChevronRight size={17} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="flex gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <ShieldCheck size={22} className="mt-0.5 shrink-0 text-indigo-600" />

        <div>
          <h2 className="font-semibold text-indigo-900">
            Belge bilgileriniz hakkında
          </h2>

          <p className="mt-1 text-sm leading-6 text-indigo-700">
            Belgelerinizde eksik veya hatalı bilgi olduğunu düşünüyorsanız
            sistem yöneticinizle iletişime geçin. Firma kullanıcıları belge
            bilgilerini yalnızca görüntüleyebilir.
          </p>
        </div>
      </section>
    </div>
  );
}

function BuildingInfo() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
      <FileCheck2 size={17} />
    </span>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function SummaryCard({ title, value, description, icon }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>

          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </article>
  );
}
