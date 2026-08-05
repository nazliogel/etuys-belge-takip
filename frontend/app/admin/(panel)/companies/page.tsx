import { Building2, Plus, Search, Filter, Pencil } from "lucide-react";

type Firma = {
  id: string;
  firmaAdi: string;
  tcNo: string;
  vergiNo: string;
};

const firmalar: Firma[] = [
  {
    id: "1",
    firmaAdi: "1453 İstanbul Otomat",
    tcNo: "12345678901",
    vergiNo: "1234567890",
  },
  {
    id: "2",
    firmaAdi: "Örnek Sanayi Limited Şirketi",
    tcNo: "23456789012",
    vergiNo: "2345678901",
  },
  {
    id: "3",
    firmaAdi: "Yıldız Makine A.Ş.",
    tcNo: "34567890123",
    vergiNo: "3456789012",
  },
  {
    id: "4",
    firmaAdi: "Anadolu Tekstil Ltd. Şti.",
    tcNo: "45678901234",
    vergiNo: "4567890123",
  },
];

export default function FirmalarPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Firmalar</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sistemde kayıtlı tüm firmaları görüntüleyin ve yönetin.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Firma adı, TC veya vergi no ile ara..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            <Filter size={16} />
            Filtrele
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
     

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Firma Adı</th>
                <th className="px-6 py-3 font-medium">TC No</th>
                <th className="px-6 py-3 font-medium">Vergi No</th>
                <th className="px-6 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {firmalar.map((firma) => (
                <tr
                  key={firma.id}
                  className="transition hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{firma.firmaAdi}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-300">
                    {firma.tcNo}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-300">
                    {firma.vergiNo}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-500/50 hover:text-indigo-300"
                      >
                        <Pencil size={14} />
                        Düzenle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-300">1-{firmalar.length}</span> arası, toplam{" "}
            <span className="font-medium text-slate-300">{firmalar.length}</span> kayıt
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white disabled:opacity-50"
              disabled
            >
              Önceki
            </button>
            <button
              type="button"
              className="rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300"
            >
              1
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
            >
              Sonraki
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}