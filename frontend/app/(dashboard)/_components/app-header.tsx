import type { UserRole } from "../_lib/permissions";
import { FaWhatsapp } from "react-icons/fa";
import { Mail, Phone } from "lucide-react";

function createWhatsAppUrl(phone: string): string {
  const normalizedPhone = phone.replace(/\D/g, "").replace(/^0/, "90");

  return `https://wa.me/${normalizedPhone}`;
}

interface AppHeaderProps {
  userName: string;
  role: UserRole;
  consultantName?: string | null;
  consultantPhone?: string | null;
  consultantEmail?: string | null;
}

export function AppHeader({
  userName,
  role,
  consultantName,
  consultantPhone,
  consultantEmail,
}: AppHeaderProps) {
  const isAdmin = role === "ADMIN";

  const displayedConsultantName = consultantName?.trim() || "—";
  const displayedConsultantPhone = consultantPhone?.trim() || null;
  const displayedConsultantEmail = consultantEmail?.trim() || null;

  const consultantWhatsAppUrl = displayedConsultantPhone
    ? createWhatsAppUrl(displayedConsultantPhone)
    : null;

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
            <div className="flex min-w-[350px] items-center gap-6 border-r border-blue-600 pr-6">
              {/* BAŞLIK VE İSİM */}
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-blue-200">
                  Uzmanınız
                </p>

                <p className="mt-0.5 whitespace-nowrap text-sm font-semibold text-white">
                  {displayedConsultantName}
                </p>
              </div>

              {/* TELEFON VE E-POSTA */}
              <div className="border-l border-blue-600/70 pl-5">
                {displayedConsultantPhone && consultantWhatsAppUrl ? (
                  <a
                    href={consultantWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-blue-100 transition hover:text-white hover:underline"
                    title="WhatsApp üzerinden iletişime geç"
                  >
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-green-400">
                      <FaWhatsapp
                        size={17}
                        color="currentColor"
                        aria-hidden="true"
                      />
                    </span>

                    <span>{displayedConsultantPhone}</span>
                  </a>
                ) : (
                  <p className="text-xs text-blue-300">Telefon bilgisi yok</p>
                )}

                {displayedConsultantEmail ? (
                  <a
                    href={`mailto:${displayedConsultantEmail}`}
                    className="mt-0.5 flex items-center gap-2 whitespace-nowrap text-sm font-medium text-blue-100 transition hover:text-white hover:underline"
                    title="E-posta gönder"
                  >
                    <Mail
                      size={16}
                      strokeWidth={2}
                      className="shrink-0 text-blue-100"
                      aria-hidden="true"
                    />

                    <span>{displayedConsultantEmail}</span>
                  </a>
                ) : (
                  <p className="mt-0.5 text-xs text-blue-300">
                    E-posta bilgisi yok
                  </p>
                )}
              </div>
            </div>

            {/* GENEL İLETİŞİM */}
            <div className="min-w-[210px] text-left">
              <p className="text-[10px] font-medium uppercase tracking-wide text-blue-200">
                Genel İletişim
              </p>

              <a
                href="tel:+902164506007"
                className="mt-1 flex items-center justify-start gap-2 whitespace-nowrap text-[13px] font-medium text-white transition hover:underline"
                title="Telefonla ara"
              >
                <Phone
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 text-blue-100"
                  aria-hidden="true"
                />

                <span>+90 216 450 60 07 (Pbx)</span>
              </a>

              <a
                href="mailto:info@akkasgroup.com"
                className="mt-1 flex items-center justify-start gap-2 whitespace-nowrap text-[13px] font-medium text-blue-100 transition hover:text-white hover:underline"
                title="E-posta gönder"
              >
                <Mail
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 text-blue-100"
                  aria-hidden="true"
                />

                <span>info@akkasgroup.com</span>
              </a>
            </div>
          </div>
        )}

        {/* KULLANICI BİLGİSİ */}
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
