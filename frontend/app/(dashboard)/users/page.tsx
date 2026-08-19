"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Search,
  UserPlus,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

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
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

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

const inputClass =
  "h-11 w-full rounded-xl border border-blue-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100";

const errorInputClass =
  "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-100";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

export default function UsersPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  useEffect(() => {
    const query = companySearch.trim();

    // Firma seçilmişse yeniden arama yapma
    if (selectedCompany && query === selectedCompany.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      return;
    }

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
      } catch (error) {
        setSearchResults([]);
        setCompaniesError(
          error instanceof Error ? error.message : "Firma araması yapılamadı.",
        );
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [companySearch, selectedCompany]);
  useEffect(() => {
    if (status.type !== "success" && status.type !== "error") return;

    window.requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    if (status.type === "success") {
      const timer = window.setTimeout(() => {
        setStatus({ type: "idle" });
      }, 4000);

      return () => window.clearTimeout(timer);
    }
  }, [status.type]);
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    const fieldName = name as keyof FormState;

    setForm((previous) => ({
      ...previous,
      [fieldName]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [fieldName]: undefined,
      ...(fieldName === "password" ? { passwordConfirm: undefined } : {}),
    }));

    if (status.type !== "idle") {
      setStatus({ type: "idle" });
    }
  }

  function handleCompanySearch(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;

    setCompanySearch(value);
    setCompaniesError(null);
    setStatus({ type: "idle" });

    if (selectedCompany) {
      setSelectedCompany(null);

      setForm((previous) => ({
        ...previous,
        companyId: "",
      }));
    }

    setErrors((previous) => ({
      ...previous,
      companyId: undefined,
    }));
  }

  function selectCompany(company: Company) {
    setSelectedCompany(company);
    setCompanySearch(company.name);
    setSearchResults([]);
    setCompaniesError(null);

    setForm((previous) => ({
      ...previous,
      companyId: String(company.id),
    }));

    setErrors((previous) => ({
      ...previous,
      companyId: undefined,
    }));

    setStatus({ type: "idle" });
  }

  function clearCompany() {
    setSelectedCompany(null);
    setCompanySearch("");
    setSearchResults([]);
    setCompaniesError(null);

    setForm((previous) => ({
      ...previous,
      companyId: "",
    }));

    setErrors((previous) => ({
      ...previous,
      companyId: "Lütfen bir firma seçin.",
    }));

    setStatus({ type: "idle" });
  }

  function validateForm(): FormErrors {
    const validationErrors: FormErrors = {};

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();

    const nameRegex = /^[A-Za-zÇĞİÖŞÜçğıöşü\s'-]+$/;
    const emailRegex =
      /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/;
    if (!form.companyId) {
      validationErrors.companyId = "Lütfen bir firma seçin.";
    }

    if (!firstName) {
      validationErrors.firstName = "Ad alanı zorunludur.";
    } else if (firstName.length < 2) {
      validationErrors.firstName = "Ad en az 2 karakter olmalıdır.";
    } else if (firstName.length > 50) {
      validationErrors.firstName = "Ad en fazla 50 karakter olabilir.";
    } else if (!nameRegex.test(firstName)) {
      validationErrors.firstName =
        "Ad alanında yalnızca harf kullanabilirsiniz.";
    }

    if (!lastName) {
      validationErrors.lastName = "Soyad alanı zorunludur.";
    } else if (lastName.length < 2) {
      validationErrors.lastName = "Soyad en az 2 karakter olmalıdır.";
    } else if (lastName.length > 50) {
      validationErrors.lastName = "Soyad en fazla 50 karakter olabilir.";
    } else if (!nameRegex.test(lastName)) {
      validationErrors.lastName =
        "Soyad alanında yalnızca harf kullanabilirsiniz.";
    }

    if (!email) {
      validationErrors.email = "E-posta alanı zorunludur.";
    } else if (
      !emailRegex.test(email) ||
      email.startsWith(".") ||
      email.includes("..")
    ) {
      validationErrors.email = "Geçerli bir e-posta adresi girin.";
    } else if (email.length > 254) {
      validationErrors.email = "E-posta adresi en fazla 254 karakter olabilir.";
    }

    if (!form.password) {
      validationErrors.password = "Şifre alanı zorunludur.";
    } else if (form.password.length < 8) {
      validationErrors.password = "Şifre en az 8 karakter olmalıdır.";
    } else if (form.password.length > 64) {
      validationErrors.password = "Şifre en fazla 64 karakter olabilir.";
    } else if (!/[a-zçğıöşü]/.test(form.password)) {
      validationErrors.password = "Şifre en az bir küçük harf içermelidir.";
    } else if (!/[A-ZÇĞİÖŞÜ]/.test(form.password)) {
      validationErrors.password = "Şifre en az bir büyük harf içermelidir.";
    } else if (!/\d/.test(form.password)) {
      validationErrors.password = "Şifre en az bir rakam içermelidir.";
    } else if (!/[^A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(form.password)) {
      validationErrors.password = "Şifre en az bir özel karakter içermelidir.";
    }

    if (!form.passwordConfirm) {
      validationErrors.passwordConfirm = "Şifre tekrar alanı zorunludur.";
    } else if (form.password !== form.passwordConfirm) {
      validationErrors.passwordConfirm = "Şifreler birbiriyle eşleşmiyor.";
    }

    return validationErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus({
        type: "error",
        message: "Lütfen işaretlenen alanları kontrol edin.",
      });
      return;
    }

    try {
      setErrors({});
      setStatus({ type: "loading" });

      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          companyId: Number(form.companyId),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLocaleLowerCase("tr-TR"),
          password: form.password,
          role: "COMPANY",
        }),
      });

      setStatus({
        type: "success",
        message: `${form.firstName.trim()} ${form.lastName.trim()} başarıyla eklendi.`,
      });

      // Firma seçimini koru, kullanıcı alanlarını temizle
      setForm({
        ...initialForm,
        companyId: form.companyId,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Kullanıcı oluşturulamadı.",
      });
    }
  }

  function clearUserFields() {
    setForm((previous) => ({
      ...initialForm,
      companyId: previous.companyId,
    }));

    setErrors({});
    setStatus({ type: "idle" });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5">
      {/* SAYFA BAŞLIĞI */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <span className="absolute inset-y-0 left-0 w-1 bg-red-600" />
        <div className="flex flex-col justify-between gap-4 pl-2 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                Yönetim Paneli
              </span>

              <span className="h-1 w-1 rounded-full bg-slate-300" />

              <span className="text-[11px] font-medium text-slate-500">
                Firma Kullanıcıları
              </span>
            </div>

            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
              Yeni Kullanıcı Oluştur
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Bir firma seçin ve firmaya giriş yapabilecek kullanıcı hesabını
              tanımlayın.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                selectedCompany
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {selectedCompany ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Firma Durumu
              </p>

              <p
                className={`text-xs font-bold ${
                  selectedCompany ? "text-emerald-700" : "text-slate-600"
                }`}
              >
                {selectedCompany ? "Firma seçildi" : "Firma bekleniyor"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {status.type === "error" && (
        <div
          ref={feedbackRef}
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{status.message}</span>
        </div>
      )}

      {status.type === "success" && (
        <div
          ref={feedbackRef}
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{status.message}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        {/* ADIMLAR */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  selectedCompany
                    ? "bg-emerald-600 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {selectedCompany ? <CheckCircle2 className="h-4 w-4" /> : "1"}
              </span>

              <div>
                <p className="text-xs font-bold text-slate-900">Firma seçimi</p>
                <p className="text-[10px] text-slate-500">
                  Kullanıcının bağlı olacağı firma
                </p>
              </div>
            </div>

            <div
              className={`mx-4 h-px flex-1 ${
                selectedCompany ? "bg-emerald-300" : "bg-slate-200"
              }`}
            />

            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  selectedCompany
                    ? "bg-blue-800 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                2
              </span>

              <div>
                <p
                  className={`text-xs font-bold ${
                    selectedCompany ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  Kullanıcı bilgileri
                </p>

                <p className="text-[10px] text-slate-500">
                  Giriş bilgilerinin oluşturulması
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FİRMA SEÇİMİ */}
        <section className="border-b border-slate-100 bg-white px-6 py-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Firma Seçimi
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Firma adı veya vergi numarası ile arama yapabilirsiniz.
              </p>
            </div>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
            {/* Firma arama */}
            <div className="relative z-20">
              <label htmlFor="companySearch" className={labelClass}>
                Firma Ara <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="companySearch"
                  type="text"
                  value={companySearch}
                  onChange={handleCompanySearch}
                  placeholder="Firma adı veya vergi numarası yazın..."
                  autoComplete="off"
                  aria-invalid={Boolean(errors.companyId)}
                  className={`${inputClass} pl-10 pr-10 ${
                    errors.companyId ? errorInputClass : ""
                  }`}
                />

                {searchLoading ? (
                  <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                ) : (
                  companySearch && (
                    <button
                      type="button"
                      onClick={clearCompany}
                      aria-label="Firma seçimini temizle"
                      className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>

              {errors.companyId && <FieldError message={errors.companyId} />}

              {companySearch.trim().length === 1 && !selectedCompany && (
                <p className="mt-2 text-xs text-slate-500">
                  Arama için en az 2 karakter girin.
                </p>
              )}

              {companiesError && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {companiesError}
                </p>
              )}

              {/* Arama sonuçları */}
              {!selectedCompany && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {searchResults.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => selectCompany(company)}
                      className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-blue-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {company.name}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>
                            {company.taxNumber
                              ? `VKN: ${company.taxNumber}`
                              : "VKN bulunmuyor"}
                          </span>

                          {!company.isActive && (
                            <span className="rounded-md bg-red-50 px-1.5 py-0.5 font-semibold text-red-600">
                              Pasif
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white">
                        Seç
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!selectedCompany &&
                companySearch.trim().length >= 2 &&
                !searchLoading &&
                searchResults.length === 0 &&
                !companiesError && (
                  <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-600">
                      Firma bulunamadı
                    </p>

                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Firma adını veya vergi numarasını kontrol edin.
                    </p>
                  </div>
                )}
            </div>

            {/* Seçili firma özeti */}
            {selectedCompany ? (
              <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5">
                <span className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />

                <div className="flex items-start justify-between gap-3 pl-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Seçili Firma
                      </p>
                    </div>

                    <p className="mt-1.5 truncate text-sm font-bold text-slate-900">
                      {selectedCompany.name}
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <span>
                        VKN:{" "}
                        <strong>
                          {selectedCompany.taxNumber ?? "Bulunmuyor"}
                        </strong>
                      </span>

                      <span>
                        Belge: <strong>{selectedCompany.documentCount}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearCompany}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    Değiştir
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-20 items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                  <Building2 className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Henüz firma seçilmedi
                  </p>

                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    Kullanıcı bilgilerini açmak için önce firma seçin.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* KULLANICI BİLGİLERİ */}
        <section
          className={`transition-all duration-300 ${
            selectedCompany
              ? "bg-white opacity-100"
              : "bg-slate-50/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  selectedCompany
                    ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                <UserPlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Kullanıcı Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Kullanıcının sisteme giriş yapacağı bilgileri girin.
                </p>
              </div>
            </div>

            {!selectedCompany && (
              <span className="hidden rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500 sm:inline">
                Önce firma seçilmelidir
              </span>
            )}
          </div>

          <fieldset
            disabled={!selectedCompany || status.type === "loading"}
            className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2"
          >
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
                placeholder="Kullanıcının adı"
                maxLength={50}
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstName)}
                className={`${inputClass} ${
                  errors.firstName ? errorInputClass : ""
                }`}
              />

              {errors.firstName && <FieldError message={errors.firstName} />}
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
                placeholder="Kullanıcının soyadı"
                maxLength={50}
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastName)}
                className={`${inputClass} ${
                  errors.lastName ? errorInputClass : ""
                }`}
              />

              {errors.lastName && <FieldError message={errors.lastName} />}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="email" className={labelClass}>
                E-posta Adresi <span className="text-red-500">*</span>
              </label>

              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="ornek@firma.com"
                maxLength={254}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                className={`${inputClass} ${
                  errors.email ? errorInputClass : ""
                }`}
              />

              {errors.email && <FieldError message={errors.email} />}
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Şifre <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="En az 8 karakter"
                  minLength={8}
                  maxLength={64}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  className={`${inputClass} pr-11 ${
                    errors.password ? errorInputClass : ""
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {errors.password ? (
                <FieldError message={errors.password} />
              ) : (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Büyük harf, küçük harf, rakam ve özel karakter kullanın.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="passwordConfirm" className={labelClass}>
                Şifre Tekrar <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  name="passwordConfirm"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  placeholder="Şifreyi yeniden yazın"
                  minLength={8}
                  maxLength={64}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.passwordConfirm)}
                  className={`${inputClass} pr-11 ${
                    errors.passwordConfirm ? errorInputClass : ""
                  }`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPasswordConfirm((previous) => !previous)
                  }
                  aria-label={
                    showPasswordConfirm
                      ? "Tekrar şifresini gizle"
                      : "Tekrar şifresini göster"
                  }
                  className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPasswordConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {errors.passwordConfirm && (
                <FieldError message={errors.passwordConfirm} />
              )}

              {!errors.passwordConfirm &&
                form.passwordConfirm &&
                form.password === form.passwordConfirm && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Şifreler eşleşiyor.
                  </p>
                )}
            </div>
          </fieldset>
        </section>

        {/* FORM ALT ALANI */}
        <footer className="flex flex-col-reverse gap-3 border-t border-blue-100 bg-gradient-to-r from-blue-50/70 via-white to-red-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-red-500">*</span> Zorunlu
            alanlar
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={clearUserFields}
              disabled={status.type === "loading"}
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Temizle
            </button>

            <button
              type="submit"
              disabled={status.type === "loading" || !selectedCompany}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {status.type === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ekleniyor...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Kullanıcı Oluştur
                </>
              )}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-600">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
