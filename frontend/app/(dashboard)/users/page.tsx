"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

// Backend'in CompanyListItem tipiyle eşleşiyor
type Company = {
  id: number;
  externalCompanyId: string | null;
  name: string;
  taxNumber: string | null;
  processStatus: string | null;
  isActive: boolean;
  authorizationEndDate: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

type CompanyListResponse = {
  success: boolean;
  message: string;
  data: {
    items: Company[];
    totalCount: number;
  };
};

type FormState = {
  companyId: string; // select value string tutar, submit'te Number'a çeviririz
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const initialForm: FormState = {
  companyId: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

export default function UsersPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  useEffect(() => {
    const query = companySearch.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setCompaniesError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setCompaniesError(null);

        const params = new URLSearchParams({
          page: "1",
          limit: "20",
          search: query,
        });

        const response = await apiFetch<CompanyListResponse>(
          `/companies?${params.toString()}`,
        );

        setSearchResults(response.data.items);
      } catch (err) {
        setCompaniesError(
          err instanceof Error ? err.message : "Firma araması yapılamadı.",
        );
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [companySearch]);

  const selectedCompany = companies.find(
    (c) => c.id === Number(form.companyId),
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate(): string | null {
    if (!form.companyId) return "Lütfen bir firma seçin.";
    if (!form.firstName.trim() || !form.lastName.trim())
      return "Ad ve soyad zorunludur.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Geçerli bir e-posta girin.";
    if (form.password.length < 8) return "Şifre en az 8 karakter olmalıdır.";
    if (form.password !== form.passwordConfirm) return "Şifreler eşleşmiyor.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const error = validate();

    if (error) {
      setStatus({
        type: "error",
        message: error,
      });
      return;
    }

    try {
      setStatus({ type: "loading" });

      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          companyId: Number(form.companyId),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: "COMPANY",
        }),
      });

      setStatus({
        type: "success",
        message: `${form.firstName} ${form.lastName} başarıyla eklendi.`,
      });

      setForm({
        ...initialForm,
        companyId: form.companyId,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Kullanıcı oluşturulamadı.",
      });
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Kullanıcı Yönetimi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Seçili firmaya giriş yapabilecek yeni bir kullanıcı oluşturun.
        </p>
      </div>

      {/* Firma Seçimi */}
      {/* Firma Seçimi */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Building2 className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">
            Firma Seçimi
          </h2>
        </header>

        <div className="p-5">
          <label htmlFor="companySearch" className={labelClass}>
            Firma Ara <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <input
              id="companySearch"
              type="text"
              value={companySearch}
              onChange={(e) => {
                setCompanySearch(e.target.value);

                if (form.companyId) {
                  setForm((prev) => ({
                    ...prev,
                    companyId: "",
                  }));

                  setCompanies([]);
                }
              }}
              placeholder="Firma adı veya vergi no ile ara..."
              className={inputClass + " pr-10"}
            />

            {searchLoading && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          {companySearch.trim().length === 1 && (
            <p className="mt-2 text-xs text-slate-500">
              Arama için en az 2 karakter girin.
            </p>
          )}

          {companiesError && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {companiesError}
            </p>
          )}

          {!selectedCompany &&
            companySearch.trim().length >= 2 &&
            !searchLoading &&
            searchResults.length === 0 &&
            !companiesError && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-500">Firma bulunamadı.</p>
              </div>
            )}

          {!selectedCompany && searchResults.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {searchResults.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => {
                    setCompanies([company]);

                    setForm((prev) => ({
                      ...prev,
                      companyId: String(company.id),
                    }));

                    setCompanySearch(company.name);
                    setSearchResults([]);
                    setCompaniesError(null);
                  }}
                  className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {company.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {company.taxNumber
                        ? `VKN: ${company.taxNumber}`
                        : "Vergi numarası bulunmuyor"}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Seç
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedCompany && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Seçili Firma
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedCompany.name}
                  </p>

                  {selectedCompany.taxNumber && (
                    <p className="mt-1 text-xs text-slate-600">
                      VKN: {selectedCompany.taxNumber}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      companyId: "",
                    }));

                    setCompanies([]);
                    setCompanySearch("");
                    setSearchResults([]);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Değiştir
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Kullanıcı Bilgileri */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <UserPlus className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">
            Kullanıcı Bilgileri
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              Ad <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Ad"
              autoComplete="given-name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="lastName" className={labelClass}>
              Soyad <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Soyad"
              autoComplete="family-name"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="email" className={labelClass}>
              E-posta <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ornek@firma.com"
              autoComplete="email"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Şifre <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="En az 8 karakter"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="passwordConfirm" className={labelClass}>
              Şifre Tekrar <span className="text-red-500">*</span>
            </label>
            <input
              id="passwordConfirm"
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="Şifreyi tekrar girin"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>

        {status.type === "error" && (
          <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        {status.type === "success" && (
          <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <p className="text-xs text-slate-500">
            <span className="text-red-500">*</span> Zorunlu alanlar
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setForm({ ...initialForm, companyId: form.companyId });
                setStatus({ type: "idle" });
              }}
              disabled={status.type === "loading"}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Temizle
            </button>

            <button
              type="submit"
              disabled={status.type === "loading" || !form.companyId}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.type === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ekleniyor...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Kullanıcı Ekle
                </>
              )}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
