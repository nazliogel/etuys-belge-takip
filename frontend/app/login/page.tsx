"use client";

import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { login } from "@/lib/mock-auth";


export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const user = await login(email, password);

      if (user.role === "ADMIN") {
        router.push("/dashboard");
        return;
      }

      if (user.role === "COMPANY") {
        router.push("/documents");
        return;
      }

      setError("Kullanıcı rolü tanımlı değil.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Giriş sırasında bir hata oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <main className="flex min-h-screen bg-[#F1F5F9]">
      {/* SOL PANEL - Derin Lacivert / Cam Efektli Vurgulu Logo */}
      <section className="relative hidden lg:flex lg:w-1/2 items-center justify-center overflow-hidden border-b border-blue-900 bg-blue-800 p-12 text-white">
        {/* Arka Plan Modern Degrade & Parıltılar */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-md text-center">
          <div className="relative rounded-[2.5rem] bg-white/10 p-10 backdrop-blur-xl border border-white/10 shadow-[0_8px_40px_0_rgba(0,0,0,0.3)] transition hover:bg-white/[0.12]">
            <Image
              src="/logos/360teşvikk.png"
              alt="E-TUYS Belge Takip"
              width={300}
              height={85}
              className="h-49 w-auto object-contain drop-shadow-md"
              priority
            />
            <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] shadow-[inset_0_0_40px_20px_rgba(15,23,42,0.35)]" />
          </div>

          <p className="mt-8 text-sm font-medium tracking-wide text-slate-400">
            Yatırım Teşvik Belge ve Vize Takip Sistemi
          </p>
        </div>

        {/* Alt Telif */}
        <div className="absolute bottom-8 text-center text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} E-TUYS Takip
        </div>
      </section>

      {/* SAĞ PANEL - Modern Beyaz Form Kartı */}
      <section className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-100">
          {/* Mobil Logo */}
          <div className="mb-8 lg:hidden flex justify-center">
            <div className="rounded-xl bg-slate-900 p-4 shadow-md">
              <Image
                src="/logos/360teşvikk.png"
                alt="E-TUYS Belge Takip"
                width={180}
                height={50}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
          </div>

          {/* Form Başlığı */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Oturum Açın
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              E-TUYS yönetim paneline erişmek için bilgilerinizi girin.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                E-posta Adresi
              </label>
              <div className="relative flex items-center">
                <Mail
                  size={18}
                  className="absolute left-3.5 text-slate-400 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  placeholder="ornek@sirket.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Şifre
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-red-600 transition hover:text-red-700 hover:underline"
                >
                  Şifremi unuttum
                </Link>
              </div>
              <div className="relative flex items-center">
                <LockKeyhole
                  size={18}
                  className="absolute left-3.5 text-slate-400 pointer-events-none"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((c) => !c)}
                  className="absolute right-3.5 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Hata Mesajı */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Giriş Yap Butonu */}
            <button
              type="submit"
              disabled={isLoading}
             className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-b border-blue-900 bg-blue-800 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                "Giriş yapılıyor..."
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight
                    size={17}
                    className="transition group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
