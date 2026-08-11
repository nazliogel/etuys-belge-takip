import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from "lucide-react";

const summaryCards = [
  {
    title: "Toplam Firma",
    value: "1.296",
    description: "Tüm zamanlar",
    icon: Building2,
    iconClass: "bg-blue-100 text-blue-600",
    cardClass: "from-blue-50 to-white",
  },
  {
    title: "Aktif Belgeler",
    value: "1.187",
    description: "%91,6",
    icon: CheckCircle2,
    iconClass: "bg-emerald-100 text-emerald-600",
    cardClass: "from-emerald-50 to-white",
  },
  {
    title: "Süresi Dolan Belgeler",
    value: "18",
    description: "%1,4",
    icon: FileText,
    iconClass: "bg-red-100 text-red-500",
    cardClass: "from-red-50 to-white",
  },
  {
    title: "30 Gün İçinde Bitecek",
    value: "42",
    description: "%3,2",
    icon: CalendarDays,
    iconClass: "bg-orange-100 text-orange-500",
    cardClass: "from-orange-50 to-white",
  },
  {
    title: "90 Gün İçinde Yetki Bitecek",
    value: "71",
    description: "%5,5",
    icon: ShieldCheck,
    iconClass: "bg-violet-100 text-violet-600",
    cardClass: "from-violet-50 to-white",
  },
];

const expiringDocuments = [
  {
    company: "ABC Makina Sanayi A.Ş.",
    documentNo: "55128",
    supportClass: "Bölgesel",
    expiryDate: "15.06.2024",
    remaining: "15 gün",
  },
  {
    company: "XYZ Elektronik Ltd. Şti.",
    documentNo: "22118",
    supportClass: "Genel",
    expiryDate: "20.06.2024",
    remaining: "20 gün",
  },
  {
    company: "DEF Otomotiv A.Ş.",
    documentNo: "66100",
    supportClass: "Büyük Ölçekli",
    expiryDate: "28.06.2024",
    remaining: "28 gün",
  },
  {
    company: "GHI Tekstil San. Ltd. Şti.",
    documentNo: "33122",
    supportClass: "Genel",
    expiryDate: "05.07.2024",
    remaining: "35 gün",
  },
];

const recentOperations = [
  {
    text: "Yeni Excel dosyası içe aktarıldı",
    date: "24.05.2024 10:45",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-600",
  },
  {
    text: "ABC Makina belgesi güncellendi",
    date: "24.05.2024 09:32",
    icon: FileText,
    className: "bg-blue-100 text-blue-600",
  },
  {
    text: "Yeni kullanıcı eklendi",
    date: "24.05.2024 09:15",
    icon: Building2,
    className: "bg-violet-100 text-violet-600",
  },
  {
    text: "Yetki tarihi güncellendi",
    date: "24.05.2024 08:50",
    icon: CalendarDays,
    className: "bg-orange-100 text-orange-600",
  },
];

export function DashboardScreen() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Firma, belge ve süre durumlarının genel özeti
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className={`rounded-xl border border-slate-200 bg-gradient-to-br ${item.cardClass} p-4 shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    {item.title}
                  </p>

                  <p className="mt-4 text-2xl font-bold text-slate-900">
                    {item.value}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {item.description}
                  </p>
                </div>

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            Belgelerin Durumu
          </h2>

          <div className="mt-6 flex items-center justify-center gap-8">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(#22c55e_0deg_330deg,#f59e0b_330deg_350deg,#ef4444_350deg_360deg)]">
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-bold text-slate-900">1.296</span>
                <span className="text-xs text-slate-500">Toplam</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-slate-500">Aktif</span>
                <strong className="ml-auto text-slate-800">1.187</strong>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-slate-500">Süresi yaklaşan</span>
                <strong className="ml-auto text-slate-800">91</strong>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-slate-500">Süresi dolmuş</span>
                <strong className="ml-auto text-slate-800">18</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            Destekleme Sınıfı Dağılımı
          </h2>

          <div className="mt-7 space-y-5">
            {[
              ["Genel Destekleme", "48,1%", "w-[78%]", "bg-blue-500"],
              ["Bölgesel Destekleme", "39,5%", "w-[65%]", "bg-emerald-500"],
              ["Büyük Ölçekli", "7,6%", "w-[32%]", "bg-orange-500"],
              ["Stratejik", "4,8%", "w-[20%]", "bg-violet-500"],
            ].map(([label, percentage, width, color]) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-800">
                    {percentage}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${width} ${color}`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            Yaklaşan Süreler
          </h2>

          <div className="mt-5 space-y-3">
            {[
              [
                "30 gün içinde belge bitecek",
                "42",
                "bg-orange-50 text-orange-600",
              ],
              [
                "90 gün içinde belge bitecek",
                "91",
                "bg-yellow-50 text-yellow-600",
              ],
              ["30 gün içinde yetki bitecek", "28", "bg-red-50 text-red-600"],
              [
                "90 gün içinde yetki bitecek",
                "71",
                "bg-violet-50 text-violet-600",
              ],
            ].map(([label, value, color]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium text-slate-600">
                    {label}
                  </span>
                </div>

                <span
                  className={`rounded-md px-2 py-1 text-xs font-bold ${color}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Yaklaşan Belge Bitişleri
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Firma Adı</th>
                  <th className="px-5 py-3 font-semibold">Belge No</th>
                  <th className="px-5 py-3 font-semibold">Destekleme Sınıfı</th>
                  <th className="px-5 py-3 font-semibold">Bitiş Tarihi</th>
                  <th className="px-5 py-3 font-semibold">Kalan Gün</th>
                  <th className="px-5 py-3 font-semibold">Durum</th>
                </tr>
              </thead>

              <tbody>
                {expiringDocuments.map((item) => (
                  <tr
                    key={item.documentNo}
                    className="border-t border-slate-100 text-slate-600"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {item.company}
                    </td>
                    <td className="px-5 py-3">{item.documentNo}</td>
                    <td className="px-5 py-3 text-emerald-600">
                      {item.supportClass}
                    </td>
                    <td className="px-5 py-3">{item.expiryDate}</td>
                    <td className="px-5 py-3">{item.remaining}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-600">
                        Süresi yaklaşıyor
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="w-full border-t border-slate-100 py-3 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            Tümünü Görüntüle →
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Son İşlemler</h2>

          <div className="mt-5 space-y-4">
            {recentOperations.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.text} className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-700">
                      {item.text}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {item.date}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
