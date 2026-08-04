"use client";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  FileCheck2,
  Bell,
  Clock,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginWithMockData } from "@/lib/mock-auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const user = loginWithMockData(email, password);

    if (!user) {
      setError("E-posta adresi veya şifre hatalı.");
      setIsLoading(false);
      return;
    }

    if (user.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/company/dashboard");
    }
  }

  return (
    <main className="flex min-h-screen bg-white">
      {/* SOL PANEL — Marka + illüstrasyon */}
      <section className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-12 text-white">
        {/* Arka plan dekoratif ikonlar */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <FileCheck2
            className="absolute top-16 left-16"
            size={140}
            strokeWidth={1}
          />
          <ShieldCheck
            className="absolute bottom-24 right-16"
            size={180}
            strokeWidth={1}
          />
          <Clock
            className="absolute top-1/2 right-1/3"
            size={100}
            strokeWidth={1}
          />
        </div>

        {/* Yumuşak parıltı */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Proteşvik</span>
        </div>

        {/* Orta metin */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight">
            Belgeleriniz
            <br />
            kontrol altında.
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Firma belge durumlarını takip edin, süre bitişlerinden anında
            haberdar olun.
          </p>

          {/* Mini özellik listesi */}
          <ul className="mt-8 space-y-3 text-sm text-blue-50">
            <li className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <FileCheck2 size={16} />
              </div>
              Belge süre takibi
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <Bell size={16} />
              </div>
              Otomatik bildirim ve e-posta
            </li>
            <li className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <Clock size={16} />
              </div>
              Yetki süresi uyarıları
            </li>
          </ul>
        </div>

        {/* Alt bilgi */}
        <div className="relative z-10 text-xs text-blue-200">
          © {new Date().getFullYear()} Proteşvik. Tüm hakları saklıdır.
        </div>
      </section>

      {/* SAĞ PANEL — Giriş formu */}
      <section className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          {/* Mobilde küçük logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <ShieldCheck size={22} />
            </div>
            <span className="text-xl font-bold text-slate-900">Proteşvik</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Hoş geldiniz</h1>
            <p className="mt-2 text-sm text-slate-500">
              Hesabınıza giriş yapmak için bilgilerinizi girin.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                E-posta adresi
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="ornek@sirket.com"
                  required
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Şifre
                </span>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Şifremi unuttum
                </Link>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <LockKeyhole size={18} className="text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Şifrenizi girin"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((c) => !c)}
                  className="text-slate-400 transition hover:text-slate-700"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          {/* Demo bilgi kutusu */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Demo Hesaplar
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Yönetici</span>
                <code className="rounded bg-white px-2 py-0.5 text-slate-800 border border-slate-200">
                  admin@akkas.com
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Firma</span>
                <code className="rounded bg-white px-2 py-0.5 text-slate-800 border border-slate-200">
                  firma@ornek.com
                </code>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-medium text-slate-700">Şifre</span>
                <code className="rounded bg-white px-2 py-0.5 text-slate-800 border border-slate-200">
                  123456
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
