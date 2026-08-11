import { AlertCircle, AlertTriangle, FileText, History } from "lucide-react";
import Link from "next/link";

export interface DashboardData {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    action?: { href: string; label: string };
  };
  summary: {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
  }[];
  alertsSection: { title: string; description: string };
  alerts: {
    level: "warning" | "danger";
    title: string;
    description: string;
  }[];
  activitiesSection?: {
    title: string;
    description: string;
    link?: { href: string; label: string };
  };
  activities?: { title: string; description: string; date?: string }[];
  documentHistorySection?: {
    title: string;
    description: string;
  };
  documentHistory?: {
    id: string;
    action: string; // örn: "Belge oluşturuldu"
    documentNumber: string; // örn: "521456"
    date: string; // örn: "05.07.2026 14:32"
    performedBy: string; // örn: "Erkan Akkaş"
    status: "success" | "info" | "warning" | "danger";
  }[];
}

export default function DashboardPage({ data }: { data: DashboardData }) {
  const hasActivities = Boolean(data.activitiesSection && data.activities);

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="flex flex-col justify-between gap-6 rounded-2xl bg-gradient-to-r from-indigo-700 to-indigo-500 p-8 text-white lg:flex-row lg:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-indigo-100">
            {data.hero.eyebrow}
          </p>
          <h1 className="max-w-3xl text-2xl font-bold">{data.hero.title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-indigo-100">
            {data.hero.description}
          </p>
        </div>

        {data.hero.action && (
          <Link
            href={data.hero.action.href}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            <FileText size={18} />
            {data.hero.action.label}
          </Link>
        )}
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {data.summary.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              {item.icon}
            </div>
            <p className="text-sm font-medium text-slate-500">{item.title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{item.description}</p>
          </article>
        ))}
      </section>

      {/* ALT BÖLÜMLER */}
      <section
        className={`grid gap-6 ${hasActivities ? "xl:grid-cols-2" : ""}`}
      >
        {/* Hatırlatmalar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              {data.alertsSection.title}
            </h2>
            <p className="text-sm text-slate-500">
              {data.alertsSection.description}
            </p>
          </div>

          <div className="space-y-3">
            {data.alerts.map((a, i) => {
              const isDanger = a.level === "danger";
              const Icon = isDanger ? AlertCircle : AlertTriangle;
              const s = isDanger
                ? {
                    wrap: "border-red-200 bg-red-50",
                    icon: "text-red-600",
                    title: "text-red-900",
                    desc: "text-red-700",
                  }
                : {
                    wrap: "border-amber-200 bg-amber-50",
                    icon: "text-amber-600",
                    title: "text-amber-900",
                    desc: "text-amber-700",
                  };

              return (
                <div
                  key={i}
                  className={`flex gap-4 rounded-xl border p-4 ${s.wrap}`}
                >
                  <div className={`mt-0.5 ${s.icon}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${s.title}`}>{a.title}</h3>
                    <p className={`mt-1 text-sm ${s.desc}`}>{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bildirimler / işlemler — sadece varsa render edilir */}
        {data.activitiesSection && data.activities && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {data.activitiesSection.title}
                </h2>
                <p className="text-sm text-slate-500">
                  {data.activitiesSection.description}
                </p>
              </div>

              {data.activitiesSection.link && (
                <Link
                  href={data.activitiesSection.link.href}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {data.activitiesSection.link.label}
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {data.activities.map((a, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
                  <div>
                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {a.description}
                    </p>
                    {a.date && (
                      <p className="mt-2 text-xs text-slate-400">{a.date}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* BELGE İŞLEM GEÇMİŞİ — sadece varsa */}
      {data.documentHistorySection && data.documentHistory && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <History size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {data.documentHistorySection.title}
              </h2>
              <p className="text-sm text-slate-500">
                {data.documentHistorySection.description}
              </p>
            </div>
          </div>

          <ol className="relative space-y-4 border-l-2 border-slate-100 pl-6">
            {data.documentHistory.map((item) => {
              const dotColor = {
                success: "bg-emerald-500",
                info: "bg-indigo-500",
                warning: "bg-amber-500",
                danger: "bg-red-500",
              }[item.status];

              return (
                <li key={item.id} className="relative">
                  {/* Timeline noktası */}
                  <span
                    className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-4 border-white ${dotColor}`}
                  />

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {item.action}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Belge No:{" "}
                          <span className="font-medium text-slate-800">
                            {item.documentNumber}
                          </span>
                        </p>
                      </div>
                      <span className="text-xs font-medium text-slate-400">
                        {item.date}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      İşlemi yapan:{" "}
                      <span className="font-medium text-slate-700">
                        {item.performedBy}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
