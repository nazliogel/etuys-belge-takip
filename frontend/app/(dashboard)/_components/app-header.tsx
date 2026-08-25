import type { UserRole } from "../_lib/permissions";

interface AppHeaderProps {
  userName: string;
  role: UserRole;
  consultantName?: string | null;
  consultantPhone?: string | null;
}

export function AppHeader({
  userName,
  role,
  consultantName,
  consultantPhone,
}: AppHeaderProps) {
  const isAdmin = role === "ADMIN";

  const displayedConsultantName = consultantName?.trim() || "—";
  const displayedConsultantPhone = consultantPhone?.trim() || null;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-blue-900 bg-blue-800 px-6 text-blue-100 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold tracking-tight text-white">
          {isAdmin ? "Yönetim Paneli" : "Firma Paneli"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {!isAdmin && (
          <div className="hidden items-center gap-6 lg:flex">
            {/* DANIŞMAN BİLGİSİ */}
            <div className="border-r border-blue-600 pr-6 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-200">
                Danışmanınız
              </p>

              <p className="text-sm font-semibold text-white">
                {displayedConsultantName}
              </p>

              {displayedConsultantPhone ? (
                <a
                  href={`tel:${displayedConsultantPhone.replace(/\s/g, "")}`}
                  className="mt-0.5 block text-sm font-medium text-blue-100 transition hover:text-white hover:underline"
                >
                  {displayedConsultantPhone}
                </a>
              ) : (
                <p className="mt-0.5 text-sm font-medium text-blue-300">
                  Telefon bilgisi yok
                </p>
              )}
            </div>

            {/* GENEL İLETİŞİM */}
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-200">
                Genel İletişim
              </p>

              <a
                href="tel:+902164506007"
                className="block text-sm font-medium text-white hover:underline"
              >
                +90 216 450 60 07 (Pbx)
              </a>

              <a
                href="mailto:info@akkasgroup.com"
                className="block text-sm text-blue-200 hover:text-white"
              >
                info@akkasgroup.com
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-blue-700/80 bg-blue-700/50 px-3.5 py-1.5 transition hover:bg-blue-700/70">
          <div className="text-right">
            <p className="text-sm font-semibold leading-tight text-white">
              {userName}
            </p>

            <span className="inline-block text-sm font-medium text-blue-200">
              {isAdmin ? "Sistem Yöneticisi" : "Firma Temsilcisi"}
            </span>
          </div>

          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-[11px] font-bold text-white shadow-sm shadow-red-600/20">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
