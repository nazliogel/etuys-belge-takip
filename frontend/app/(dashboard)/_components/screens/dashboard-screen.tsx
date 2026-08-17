"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionUser } from "@/lib/mock-auth";
import {
  Bell,
  Building2,
  CalendarClock,
  Clock3,
  FileCheck2,
  History,
  Pencil,
  Upload,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

type CompanyListResponse = {
  success: boolean;
  message: string;
  data: {
    items: unknown[];
    totalCount: number;
  };
};
type ApiDocument = {
  id: number;
  documentEndDate: string | null;
  isActive: boolean;
};

type DocumentListResponse = {
  success: boolean;
  message: string;
  data: {
    items: ApiDocument[];
    totalCount: number;
  };
};

const documentHistoryItems = [
  {
    id: 1,
    documentNumber: "521456",
    companyName: "1453 İstanbul Otomat",
    action: "Belge bilgisi güncellendi",
    description: "Belge bitiş tarihi ve işlem durumu güncellendi.",
    date: "Bugün, 10:25",
    type: "UPDATED",
  },
  {
    id: 2,
    documentNumber: "487215",
    companyName: "Örnek Sanayi Limited Şirketi",
    action: "Yeni belge oluşturuldu",
    description: "Firmaya ait yeni teşvik belgesi sisteme eklendi.",
    date: "Dün, 15:40",
    type: "CREATED",
  },
  {
    id: 3,
    documentNumber: "635921",
    companyName: "Akkaş Teknoloji Sanayi ve Ticaret A.Ş.",
    action: "Excel üzerinden aktarıldı",
    description: "Belge bilgileri Excel içe aktarma işlemiyle güncellendi.",
    date: "4 Ağustos 2026, 14:30",
    type: "IMPORTED",
  },
] as const;

function getHistoryIcon(type: (typeof documentHistoryItems)[number]["type"]) {
  if (type === "CREATED") {
    return FileCheck2;
  }

  if (type === "UPDATED") {
    return Pencil;
  }

  return Upload;
}

export function DashboardScreen() {
  const router = useRouter();
  const [totalCompanies, setTotalCompanies] = useState<number | null>(null);
  const [activeDocuments, setActiveDocuments] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const [companyResponse, documentResponse] = await Promise.all([
          apiFetch<CompanyListResponse>("/companies?page=1&limit=20"),
          apiFetch<DocumentListResponse>("/documents"),
        ]);

        setTotalCompanies(companyResponse.data.totalCount);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeCount = documentResponse.data.items.filter((document) => {
          if (!document.isActive) return false;

          if (!document.documentEndDate) return true;

          const endDate = new Date(document.documentEndDate);
          endDate.setHours(0, 0, 0, 0);

          return endDate >= today;
        }).length;

        setActiveDocuments(activeCount);
      } catch (error) {
        console.error("Dashboard istatistikleri alınamadı:", error);
        setTotalCompanies(0);
        setActiveDocuments(0);
      }
    }

    loadDashboardStats();
  }, []); // <-- Yönlendirme için eklendi
  const user = getSessionUser();
  const isCompany = user?.role === "COMPANY";

  const summaryItems = [
    {
      title: "Toplam Firma",
      value: totalCompanies === null ? "..." : String(totalCompanies),
      description: "Sistemde kayıtlı firma",
      icon: Building2,
      href: "/companies",
    },
    {
      title: "Aktif Belge",
      value: activeDocuments === null ? "..." : String(activeDocuments),
      description: "Aktif durumda bulunan belge",
      icon: FileCheck2,
      href: "/documents?status=ACTIVE",
    },
    {
      title: "Süresi Yaklaşan",
      value: "18",
      description: "Yakında sona erecek kayıt",
      icon: CalendarClock,
      href: "/documents?status=EXPIRING",
    },
    {
      title: "Yeni Bildirim",
      value: "7",
      description: "Okunmamış bildirim",
      icon: Bell,
      href: "/notifications",
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* BAŞLIK ALANI */}
      <section className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Genel Bakış
          </h1>
          <p className="text-sm font-normal text-slate-500">
            Firma, belge ve yetki süreçlerinizin güncel durum özeti.
          </p>
        </div>
      </section>

      {/* İSTATİSTİK KARTLARI */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              onClick={() => router.push(item.href)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(item.href);
                }
              }}
              role="link"
              tabIndex={0}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-500/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
                  <Icon size={22} />
                </div>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-red-600 flex items-center gap-0.5 transition">
                  <ArrowUpRight size={14} />
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {item.title}
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900 tracking-tight">
                  {item.value}
                </p>
                <p className="mt-1.5 text-xs text-slate-500 font-medium">
                  {item.description}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* YAKLAŞAN SÜRELER & SON İŞLEMLER GRID */}
      <section
        className={`grid gap-6 ${isCompany ? "grid-cols-1" : "xl:grid-cols-2"}`}
      >
        {/* YAKLAŞAN SÜRELER */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock size={19} className="text-red-600" />
                Yaklaşan Süreler
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Yakında süresi dolacak belge ve yetkiler.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              2 Kayıt
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {/* Kart 1 */}
            <div className="flex items-start justify-between gap-4 py-3.5 first:pt-1">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <div>
                  <p className="font-semibold text-sm text-slate-900">
                    1453 İstanbul Otomat
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Yetki süresinin dolmasına{" "}
                    <strong className="text-amber-600">154 gün</strong> kaldı.
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-lg bg-amber-50 border border-amber-200/60 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                Yaklaşıyor
              </span>
            </div>

            {/* Kart 2 */}
            <div className="flex items-start justify-between gap-4 py-3.5 last:pb-1">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                <div>
                  <p className="font-semibold text-sm text-slate-900">
                    Örnek Sanayi Limited Şirketi
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Belge süresi dolmuş durumda.
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-lg bg-red-50 border border-red-200/60 px-2.5 py-1 text-[11px] font-semibold text-red-700 flex items-center gap-1">
                <AlertTriangle size={12} />
                Süresi Doldu
              </span>
            </div>
          </div>
        </div>

        {/* SON İŞLEMLER */}
        {!isCompany && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock3 size={19} className="text-red-600" />
                  Son İşlemler
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Sistem üzerinde gerçekleştirilen son hareketler.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Güncel
              </span>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              <div className="flex items-start gap-3.5 py-3.5 first:pt-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Building2 size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-slate-900">
                    Yeni firma kaydı oluşturuldu
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    1453 İstanbul Otomat sisteme eklendi.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Bugün, 09:42
                </span>
              </div>

              <div className="flex items-start gap-3.5 py-3.5 last:pb-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <FileCheck2 size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-slate-900">
                    Belge bilgisi güncellendi
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    521456 numaralı belgenin durumu güncellendi.
                  </p>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Dün, 16:18
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BELGE İŞLEM GEÇMİŞİ */}
        {!isCompany && (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:col-span-2">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <History size={19} className="text-red-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Belge İşlem Geçmişi
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Belgeler üzerinde gerçekleştirilen detaylı işlem dökümü.
                </p>
              </div>

              <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
                Son {documentHistoryItems.length} İşlem
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {documentHistoryItems.map((item) => {
                const HistoryIcon = getHistoryIcon(item.type);

                return (
                  <article
                    key={item.id}
                    className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center justify-between"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                        <HistoryIcon size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm text-slate-900">
                            {item.action}
                          </h3>

                          <span className="rounded-md bg-slate-100 border border-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Belge No: {item.documentNumber}
                          </span>
                        </div>

                        <p className="mt-1 text-xs font-semibold text-slate-800">
                          {item.companyName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-400 self-end sm:self-center">
                      <Clock3 size={13} />
                      {item.date}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
