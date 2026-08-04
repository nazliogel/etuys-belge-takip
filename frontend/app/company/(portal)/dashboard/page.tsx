import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CalendarDays,
  FileCheck2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { companyMockData } from "@/lib/company-mock-data";

export default function CompanyDashboardPage() {
  const document = companyMockData.documents[0];
  const unreadCount = companyMockData.notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-6 rounded-2xl bg-gradient-to-r from-indigo-700 to-indigo-500 p-8 text-white lg:flex-row lg:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-indigo-100">
            Hoş geldiniz
          </p>

          <h1 className="max-w-3xl text-2xl font-bold">
            {companyMockData.company.name}
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-indigo-100">
            Belge durumlarınızı, yetki sürenizi ve önemli bildirimlerinizi
            buradan takip edebilirsiniz.
          </p>
        </div>

        <Link
          href="/company/documents"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
        >
          <FileText size={18} />
          Belgelerimi Görüntüle
        </Link>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Aktif Belge"
          value={String(companyMockData.documents.length)}
          description="Firmanıza ait belge"
          icon={<FileCheck2 size={22} />}
        />

        <SummaryCard
          title="Belge Bitiş Tarihi"
          value={document.endDate}
          description={`Belge No: ${document.number}`}
          icon={<CalendarDays size={22} />}
        />

        <SummaryCard
          title="Yetki Bitiş Tarihi"
          value={companyMockData.authorization.endDate}
          description={`${companyMockData.authorization.remainingDays} gün kaldı`}
          icon={<ShieldCheck size={22} />}
        />

        <SummaryCard
          title="Yeni Bildirim"
          value={String(unreadCount)}
          description="Okunmamış bildirim"
          icon={<Bell size={22} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Önemli Hatırlatmalar
            </h2>
            <p className="text-sm text-slate-500">
              İşlem yapmanız gerekebilecek durumlar
            </p>
          </div>

          <div className="space-y-4">
            {companyMockData.urgencies.map((urgency) => {
              const isDanger = urgency.type === "danger";
              const Icon = isDanger ? AlertCircle : AlertTriangle;

              return (
                <div
                  key={urgency.id}
                  className={`flex gap-4 rounded-xl border p-4 ${
                    isDanger
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 ${
                      isDanger ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    <Icon size={22} />
                  </div>

                  <div>
                    <h3
                      className={`font-semibold ${
                        isDanger ? "text-red-900" : "text-amber-900"
                      }`}
                    >
                      {urgency.title}
                    </h3>

                    <p
                      className={`mt-1 text-sm ${
                        isDanger ? "text-red-700" : "text-amber-700"
                      }`}
                    >
                      {urgency.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Son Bildirimler
              </h2>
              <p className="text-sm text-slate-500">
                Belgenizle ilgili son gelişmeler
              </p>
            </div>

            <Link
              href="/company/notifications"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Tümünü Gör
            </Link>
          </div>

          <div className="space-y-3">
            {companyMockData.notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div className="mt-2 h-2.5 w-2.5 rounded-full bg-indigo-500" />

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {notification.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    {notification.description}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    {notification.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Belgeyle İlgili Son İşlemler
            </h2>
            <p className="text-sm text-slate-500">
              {document.number} numaralı belge
            </p>
          </div>

          <Link
            href={`/company/documents/${document.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Belgeyi Görüntüle
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="px-4 py-3 font-medium">Yapılan İşlem</th>
                <th className="px-4 py-3 font-medium">İşlem Tarihi</th>
                <th className="px-4 py-3 font-medium">Durum</th>
              </tr>
            </thead>

            <tbody>
              {document.transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {transaction.title}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {transaction.date}
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>

      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </article>
  );
}
