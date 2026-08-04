import { Bell, Building2, CalendarClock, FileCheck2 } from "lucide-react";

const summaryItems = [
  {
    title: "Toplam Firma",
    value: "128",
    description: "Sistemde kayıtlı firma",
    icon: Building2,
  },
  {
    title: "Aktif Belge",
    value: "214",
    description: "Aktif durumda bulunan belge",
    icon: FileCheck2,
  },
  {
    title: "Süresi Yaklaşan",
    value: "18",
    description: "Yakında sona erecek kayıt",
    icon: CalendarClock,
  },
  {
    title: "Yeni Bildirim",
    value: "7",
    description: "Okunmamış bildirim",
    icon: Bell,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-white">Genel Bakış</h1>

        <p className="mt-1 text-sm text-slate-400">
          Firma, belge ve yetki süreçlerinin güncel özeti.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Icon size={22} />
              </div>

              <p className="text-sm font-medium text-slate-400">{item.title}</p>

              <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>

              <p className="mt-1 text-xs text-slate-500">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">Yaklaşan Süreler</h2>

          <p className="mt-1 text-sm text-slate-400">
            Yakında süresi dolacak belge ve yetkiler.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-semibold text-amber-300">
                1453 İstanbul Otomat
              </p>

              <p className="mt-1 text-sm text-amber-200">
                Yetki süresinin dolmasına 154 gün kaldı.
              </p>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="font-semibold text-red-300">
                Örnek Sanayi Limited Şirketi
              </p>

              <p className="mt-1 text-sm text-red-200">
                Belge süresi dolmuş durumda.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">Son İşlemler</h2>

          <p className="mt-1 text-sm text-slate-400">
            Sistem üzerinde gerçekleştirilen son işlemler.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="font-semibold text-white">
                Yeni firma kaydı oluşturuldu
              </p>

              <p className="mt-1 text-sm text-slate-400">
                1453 İstanbul Otomat sisteme eklendi.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="font-semibold text-white">
                Belge bilgisi güncellendi
              </p>

              <p className="mt-1 text-sm text-slate-400">
                521456 numaralı belgenin durumu güncellendi.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
