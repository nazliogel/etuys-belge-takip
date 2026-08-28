"use client";

import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";

type CompanyIdentitySectionProps = {
  companyId: string;
};

type ContactForm = {
  fullName: string;
  email: string;
  phone: string;
};

type CompanyContact = ContactForm & {
  id: number;
};

type ContactErrors = Partial<Record<keyof ContactForm, string>>;

type IdentityForm = {
  investorStatus: string;
  taxNumber: string;
  mersisNumber: string;
  nationalId: string;
  tradeRegistryNumber: string;
  registrationDate: string;
  city: string;
  district: string;
  consultant: string;
  investorType: string;
  investorAddress: string;
  mainActivity: string;
};

type CompanyIdentityResponse = {
  success: boolean;
  message: string;
  data: {
    companyId: number;
    externalCompanyId: number;
    investorStatus: string | null;
    taxNumber: string | null;
    mersisNumber: string | null;
    nationalId: string | null;
    tradeRegistryNumber: string | null;
    registrationDate: string | null;
    city: string | null;
    district: string | null;
    consultant: string | null;
    investorType: string | null;
    investorAddress: string | null;
    mainActivity: string | null;
  };
};

type CompanyNote = {
  id: number;
  text: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type IdentityErrors = Partial<Record<keyof IdentityForm, string>>;

const DANISMAN_OPTIONS = ["Beyza Başaran", "Emin Kutay İnangu", "Salih Şahin"];

const NAME_REGEX = /^[A-Za-zÇĞİÖŞÜçğıöşü\s'-]+$/;
const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/;
const PHONE_REGEX = /^0?5\d{9}$/;

const initialIdentityForm: IdentityForm = {
  investorStatus: "",
  taxNumber: "",
  mersisNumber: "",
  nationalId: "",
  tradeRegistryNumber: "",
  registrationDate: "",
  city: "",
  district: "",
  consultant: "",
  investorType: "",
  investorAddress: "",
  mainActivity: "",
};

const initialContactForm: ContactForm = {
  fullName: "",
  email: "",
  phone: "",
};

// Kullanıcı ne yazarsa yazsın numarayı "0" ile başlatıp hemen ardından "5"
// gelecek şekilde kurar ve "05xx xxx xx xx" biçiminde gruplar.
function formatPhoneInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, "");

  if (digits.length === 0) {
    return "";
  }

  let normalized = digits.startsWith("0") ? digits : `0${digits}`;

  if (normalized.length >= 2 && normalized[1] !== "5") {
    normalized = `05${normalized.slice(1)}`;
  }

  normalized = normalized.slice(0, 11);

  const block1 = normalized.slice(0, 4);
  const block2 = normalized.slice(4, 7);
  const block3 = normalized.slice(7, 9);
  const block4 = normalized.slice(9, 11);

  return [block1, block2, block3, block4].filter(Boolean).join(" ");
}

function validateContactForm(form: ContactForm): ContactErrors {
  const errors: ContactErrors = {};

  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const phoneDigits = form.phone.replace(/\s/g, "");

  if (!fullName) {
    errors.fullName = "Ad soyad zorunludur.";
  } else if (fullName.length < 2) {
    errors.fullName = "Ad soyad en az 2 karakter olmalıdır.";
  } else if (fullName.length > 80) {
    errors.fullName = "Ad soyad en fazla 80 karakter olabilir.";
  } else if (!NAME_REGEX.test(fullName)) {
    errors.fullName = "Ad soyad alanında yalnızca harf kullanabilirsiniz.";
  }

  if (!email) {
    errors.email = "E-posta zorunludur.";
  } else if (!EMAIL_REGEX.test(email) || email.includes("..")) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }

  if (!phoneDigits) {
    errors.phone = "Telefon numarası zorunludur.";
  } else if (!PHONE_REGEX.test(phoneDigits)) {
    errors.phone = "Geçerli bir cep telefonu numarası girin (05xx xxx xx xx).";
  }

  return errors;
}

function validateIdentityForm(form: IdentityForm): IdentityErrors {
  const errors: IdentityErrors = {};

  if (!form.consultant) {
    errors.consultant = "Danışman seçimi zorunludur.";
  }

  return errors;
}

export function CompanyIdentitySection({
  companyId,
}: CompanyIdentitySectionProps) {
  // FİRMA KÜNYE BİLGİLERİ
  const [identityForm, setIdentityForm] =
    useState<IdentityForm>(initialIdentityForm);
  const [identityErrors, setIdentityErrors] = useState<IdentityErrors>({});
  const [identitySaved, setIdentitySaved] = useState(false);

  useEffect(() => {
    async function fetchCompanyData() {
      try {
        const [identityResult, contactsResult, notesResult] = await Promise.all(
          [
            apiFetch<CompanyIdentityResponse>(
              `/companies/${companyId}/identity`,
            ),

            apiFetch<{
              success: boolean;
              data: CompanyContact[];
            }>(`/companies/${companyId}/contacts`),

            apiFetch<{
              success: boolean;
              data: CompanyNote[];
            }>(`/companies/${companyId}/notes`),
          ],
        );

        const data = identityResult.data;

        setIdentityForm({
          investorStatus: data.investorStatus ?? "",
          taxNumber: data.taxNumber ?? "",
          mersisNumber: data.mersisNumber ?? "",
          nationalId: data.nationalId ?? "",
          tradeRegistryNumber: data.tradeRegistryNumber ?? "",
          registrationDate: data.registrationDate
            ? data.registrationDate.slice(0, 10)
            : "",
          city: data.city ?? "",
          district: data.district ?? "",
          consultant: data.consultant ?? "",
          investorType: data.investorType ?? "",
          investorAddress: data.investorAddress ?? "",
          mainActivity: data.mainActivity ?? "",
        });

        // eslint-disable-next-line react-hooks/immutability
        setContacts(contactsResult.data);
        // eslint-disable-next-line react-hooks/immutability
        setNotes(notesResult.data);
      } catch (error) {
        console.error("Firma bilgileri alınamadı:", error);
      }
    }

    void fetchCompanyData();
  }, [companyId]);

  // İLETİŞİM BİLGİLERİ
  const [contact, setContact] = useState<ContactForm>(initialContactForm);
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [contacts, setContacts] = useState<CompanyContact[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ContactForm>(initialContactForm);
  const [editErrors, setEditErrors] = useState<ContactErrors>({});

  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [notes, setNotes] = useState<CompanyNote[]>([]);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingNoteError, setEditingNoteError] = useState<string | null>(null);

  function handleIdentityFieldChange(field: keyof IdentityForm, value: string) {
    setIdentityForm((current) => ({ ...current, [field]: value }));
    setIdentityErrors((current) => ({ ...current, [field]: undefined }));
    setIdentitySaved(false);
  }

  async function handleSaveIdentity() {
    const validationErrors = validateIdentityForm(identityForm);
    setIdentityErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setIdentitySaved(false);
      return;
    }

    try {
      await apiFetch(`/companies/${companyId}/consultant`, {
        method: "PATCH",
        body: JSON.stringify({
          consultant: identityForm.consultant,
        }),
      });

      setIdentitySaved(true);

      setTimeout(() => {
        setIdentitySaved(false);
      }, 2000);
    } catch (error) {
      console.error("Danışman kaydedilemedi:", error);
      setIdentitySaved(false);
    }
  }

  async function handleAddContact() {
    const validationErrors = validateContactForm(contact);
    setContactErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      const result = await apiFetch<{
        success: boolean;
        data: CompanyContact;
      }>(`/companies/${companyId}/contacts`, {
        method: "POST",
        body: JSON.stringify({
          fullName: contact.fullName.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
        }),
      });

      setContacts((current) => [...current, result.data]);

      setContact(initialContactForm);
      setContactErrors({});
    } catch (error) {
      console.error("Yetkili eklenemedi:", error);
    }
  }

  function handleContactFieldChange(field: keyof ContactForm, value: string) {
    setContact((current) => ({ ...current, [field]: value }));
    setContactErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleStartEdit(index: number) {
    setEditingIndex(index);
    setEditDraft(contacts[index]);
    setEditErrors({});
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setEditDraft(initialContactForm);
    setEditErrors({});
  }

  function handleEditFieldChange(field: keyof ContactForm, value: string) {
    setEditDraft((current) => ({ ...current, [field]: value }));
    setEditErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSaveEdit() {
    if (editingIndex === null) return;

    const validationErrors = validateContactForm(editDraft);
    setEditErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const contactToUpdate = contacts[editingIndex];

    try {
      const result = await apiFetch<{
        success: boolean;
        data: CompanyContact;
      }>(`/companies/${companyId}/contacts/${contactToUpdate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: editDraft.fullName.trim(),
          email: editDraft.email.trim(),
          phone: editDraft.phone.trim(),
        }),
      });

      setContacts((current) =>
        current.map((item) =>
          item.id === contactToUpdate.id ? result.data : item,
        ),
      );

      handleCancelEdit();
    } catch (error) {
      console.error("Yetkili güncellenemedi:", error);
    }
  }

  async function handleAddNote() {
    const text = noteText.trim();

    if (!text) {
      setNoteError("Not alanı boş bırakılamaz.");
      return;
    }

    if (text.length < 3) {
      setNoteError("Not en az 3 karakter olmalıdır.");
      return;
    }

    if (text.length > 1000) {
      setNoteError("Not en fazla 1000 karakter olabilir.");
      return;
    }

    try {
      const result = await apiFetch<{
        success: boolean;
        data: CompanyNote;
      }>(`/companies/${companyId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          text,
        }),
      });

      setNotes((current) => [result.data, ...current]);

      setNoteText("");
      setNoteError(null);
    } catch (error) {
      console.error("Not eklenemedi:", error);
    }
  }

  function handleStartEditNote(index: number) {
    setEditingNoteIndex(index);
    setEditingNoteText(notes[index].text);
    setEditingNoteError(null);
  }

  function handleCancelEditNote() {
    setEditingNoteIndex(null);
    setEditingNoteText("");
    setEditingNoteError(null);
  }

  async function handleSaveEditNote() {
    if (editingNoteIndex === null) return;

    const text = editingNoteText.trim();

    if (!text) {
      setEditingNoteError("Not alanı boş bırakılamaz.");
      return;
    }

    if (text.length < 3) {
      setEditingNoteError("Not en az 3 karakter olmalıdır.");
      return;
    }

    if (text.length > 1000) {
      setEditingNoteError("Not en fazla 1000 karakter olabilir.");
      return;
    }

    const noteToUpdate = notes[editingNoteIndex];

    try {
      const result = await apiFetch<{
        success: boolean;
        data: CompanyNote;
      }>(`/companies/${companyId}/notes/${noteToUpdate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          text,
        }),
      });

      setNotes((current) =>
        current.map((note) =>
          note.id === noteToUpdate.id ? result.data : note,
        ),
      );

      handleCancelEditNote();
    } catch (error) {
      console.error("Not güncellenemedi:", error);
    }
  }

  return (
    <div className="space-y-3">
      {/* FİRMA KÜNYE BİLGİLERİ */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 rounded-t-2xl border-b border-slate-100 bg-slate-50/50 px-3 py-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
            <Building2 size={12} />
          </div>

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Firma Künye Bilgileri
            </h2>
            <p className="text-[11px] font-medium text-slate-500">
              Firmaya ait yatırımcı ve ticari bilgiler
            </p>
          </div>
        </div>

        <div className="rounded-b-2xl p-2">
          <div className="rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-t-lg md:grid-cols-4 md:divide-x md:divide-y-0">
              <TableField
                label="Yatırımcı Durumu"
                value={identityForm.investorStatus}
                readOnly
              />

              <TableField
                label="Vergi No"
                value={identityForm.taxNumber}
                readOnly
              />

              <TableField
                label="Mersis No"
                value={identityForm.mersisNumber}
                readOnly
              />

              <TableField
                label="Kimlik No"
                value={identityForm.nationalId}
                readOnly
              />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0">
              <TableField
                label="Ticaret Sicil No"
                value={identityForm.tradeRegistryNumber}
                readOnly
              />

              <TableField
                label="Tescil Tarihi"
                value={identityForm.registrationDate}
                readOnly
              />

              <TableField label="İl" value={identityForm.city} readOnly />

              <TableField label="İlçe" value={identityForm.district} readOnly />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0">
              <TableField
                label="Danışman"
                options={DANISMAN_OPTIONS}
                value={identityForm.consultant}
                onChange={(value) =>
                  handleIdentityFieldChange("consultant", value)
                }
                error={identityErrors.consultant}
              />

              <TableField
                label="Yatırımcı Türü"
                value={identityForm.investorType}
                readOnly
              />

              <TableField
                label="Yatırımcı Adresi"
                value={identityForm.investorAddress}
                readOnly
                multiline
              />

              <TableField
                label="Ana Faaliyet Konusu"
                value={identityForm.mainActivity}
                readOnly
                multiline
              />
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            {identitySaved && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <Check size={12} />
                Kaydedildi
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveIdentity}
              className="inline-flex h-5 items-center justify-center gap-1 rounded-md bg-red-600 px-3 text-[11px] font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700"
            >
              Kaydet
            </button>
          </div>
        </div>
      </section>

      {/* NOTLAR */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-3 py-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600">
            <Pencil size={12} />
          </div>

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Notlar</h2>

            <p className="text-[11px] font-medium text-slate-500">
              Firma ile ilgili yönetici notları
            </p>
          </div>
        </div>

        <div className="p-2">
          <div className="flex items-center gap-1">
            <textarea
              value={noteText}
              onChange={(event) => {
                setNoteText(event.target.value);
                if (noteError) setNoteError(null);
              }}
              rows={2}
              maxLength={1000}
              placeholder="Firma hakkında not yazın..."
              aria-invalid={Boolean(noteError)}
              className={`min-h-[38px] flex-1 resize-none rounded-lg border bg-white px-2 py-1 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-1 ${
                noteError
                  ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
              }`}
            />

            <button
              type="button"
              onClick={handleAddNote}
              className="inline-flex h-5 shrink-0 items-center justify-center gap-1 rounded-md bg-red-600 px-2 text-[11px] font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700"
            >
              <Plus size={12} />
              Not Ekle
            </button>
          </div>

          {noteError && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-red-600">
              <AlertCircle size={9} />
              {noteError}
            </p>
          )}

          {notes.length > 0 && (
            <div className="mt-1.5 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {notes.map((note, index) => {
                const isEditing = editingNoteIndex === index;

                return (
                  <div
                    key={note.id}
                    className={`px-2 py-1 transition ${
                      isEditing ? "bg-amber-50/40" : "hover:bg-slate-50/60"
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <textarea
                          value={editingNoteText}
                          onChange={(event) => {
                            setEditingNoteText(event.target.value);
                            if (editingNoteError) setEditingNoteError(null);
                          }}
                          rows={2}
                          maxLength={1000}
                          aria-invalid={Boolean(editingNoteError)}
                          className={`w-full resize-none rounded-md border bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:ring-1 ${
                            editingNoteError
                              ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
                              : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
                          }`}
                        />

                        {editingNoteError && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-red-600">
                            <AlertCircle size={9} />
                            {editingNoteError}
                          </p>
                        )}

                        <div className="mt-1 flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={handleSaveEditNote}
                            className="inline-flex h-5 items-center gap-1 rounded-md bg-red-600 px-1.5 text-[10px] font-bold text-white hover:bg-red-700"
                          >
                            <Check size={10} />
                            Kaydet
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelEditNote}
                            className="inline-flex h-5 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
                          >
                            <X size={10} />
                            Vazgeç
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex-1 text-xs leading-5 text-slate-800">
                            {note.text}
                          </p>

                          <button
                            type="button"
                            onClick={() => handleStartEditNote(index)}
                            title="Notu düzenle"
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-red-600"
                          >
                            <Pencil size={10} />
                          </button>
                        </div>

                        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-500">
                            {note.author
                              ? `${note.author.firstName} ${note.author.lastName}`
                              : "Bilinmeyen Kullanıcı"}
                          </span>

                          <span>•</span>

                          <span>
                            {new Date(note.createdAt).toLocaleString("tr-TR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* İLETİŞİM BİLGİLERİ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-3 py-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
            <UserRound size={12} />
          </div>

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              İletişim Bilgileri
            </h2>
            <p className="text-[11px] font-medium text-slate-500">
              Firmaya ait yetkili kişilerin iletişim bilgileri
            </p>
          </div>
        </div>

        <div className="p-2">
          <div className="grid items-start gap-1.5 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                Ad Soyad
              </label>
              <input
                type="text"
                value={contact.fullName}
                onChange={(event) =>
                  handleContactFieldChange("fullName", event.target.value)
                }
                placeholder="Ad Soyad"
                maxLength={80}
                aria-invalid={Boolean(contactErrors.fullName)}
                className={`h-6 w-full rounded-md border bg-white px-1.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-1 ${
                  contactErrors.fullName
                    ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
                }`}
              />
              {contactErrors.fullName && (
                <p className="mt-1 text-[10px] font-medium text-red-600">
                  {contactErrors.fullName}
                </p>
              )}
            </div>

            <div>
              <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                E-posta
              </label>
              <input
                type="email"
                value={contact.email}
                onChange={(event) =>
                  handleContactFieldChange("email", event.target.value)
                }
                placeholder="ornek@firma.com"
                maxLength={254}
                aria-invalid={Boolean(contactErrors.email)}
                className={`h-6 w-full rounded-md border bg-white px-1.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-1 ${
                  contactErrors.email
                    ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
                }`}
              />
              {contactErrors.email && (
                <p className="mt-1 text-[10px] font-medium text-red-600">
                  {contactErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                Telefon
              </label>
              <input
                type="tel"
                value={contact.phone}
                onChange={(event) =>
                  handleContactFieldChange(
                    "phone",
                    formatPhoneInput(event.target.value),
                  )
                }
                placeholder="05xx xxx xx xx"
                maxLength={14}
                aria-invalid={Boolean(contactErrors.phone)}
                className={`h-6 w-full rounded-md border bg-white px-1.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-1 ${
                  contactErrors.phone
                    ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
                    : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
                }`}
              />
              {contactErrors.phone && (
                <p className="mt-1 text-[10px] font-medium text-red-600">
                  {contactErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label
                aria-hidden="true"
                className="mb-0.5 hidden text-[11px] font-semibold text-transparent lg:block"
              >
                Ekle
              </label>
              <button
                type="button"
                onClick={handleAddContact}
                className="inline-flex h-6 w-full items-center justify-center gap-1 rounded-md bg-red-600 px-2 text-[11px] font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 lg:w-auto"
              >
                <Plus size={12} />
                Yetkili Ekle
              </button>
            </div>
          </div>

          {contacts.length > 0 && (
            <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[1fr_1fr_1fr_50px] border-b border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Ad Soyad</span>
                <span>E-posta</span>
                <span>Telefon</span>
                <span className="text-right">İşlem</span>
              </div>

              <div className="divide-y divide-slate-100">
                {contacts.map((item, index) => {
                  const isEditing = editingIndex === index;

                  return (
                    <div
                      key={item.id}
                      className={`px-2 py-1 text-xs transition ${
                        isEditing ? "bg-red-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="grid grid-cols-[1fr_1fr_1fr_50px] items-center gap-1">
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={editDraft.fullName}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  "fullName",
                                  e.target.value,
                                )
                              }
                              aria-invalid={Boolean(editErrors.fullName)}
                              className={`h-5 w-full rounded border bg-white px-1 text-xs text-slate-900 outline-none focus:ring-1 ${
                                editErrors.fullName
                                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                  : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
                              }`}
                            />
                            <input
                              type="email"
                              value={editDraft.email}
                              onChange={(e) =>
                                handleEditFieldChange("email", e.target.value)
                              }
                              aria-invalid={Boolean(editErrors.email)}
                              className={`h-5 w-full rounded border bg-white px-1 text-xs text-slate-900 outline-none focus:ring-1 ${
                                editErrors.email
                                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                  : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
                              }`}
                            />
                            <input
                              type="tel"
                              value={editDraft.phone}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  "phone",
                                  formatPhoneInput(e.target.value),
                                )
                              }
                              aria-invalid={Boolean(editErrors.phone)}
                              className={`h-5 w-full rounded border bg-white px-1 text-xs text-slate-900 outline-none focus:ring-1 ${
                                editErrors.phone
                                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                  : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
                              }`}
                            />

                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                title="Kaydet"
                                className="flex h-4 w-4 items-center justify-center rounded bg-red-600 text-white transition hover:bg-red-700"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                title="Vazgeç"
                                className="flex h-4 w-4 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="truncate font-semibold text-slate-800">
                              {item.fullName || "-"}
                            </span>
                            <span className="truncate text-slate-600">
                              {item.email || "-"}
                            </span>
                            <span className="truncate text-slate-600">
                              {item.phone || "-"}
                            </span>

                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(index)}
                                title="Düzenle"
                                className="flex h-4 w-4 items-center justify-center rounded border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-red-600"
                              >
                                <Pencil size={10} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {isEditing && Object.keys(editErrors).length > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-red-600">
                          <AlertCircle size={9} />
                          {Object.values(editErrors)
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TableField({
  label,
  type = "text",
  options,
  value,
  onChange,
  error,
  placeholder,
  readOnly = false,
  multiline = false,
}: {
  label: string;
  type?: string;
  options?: string[];
  value: string;
  onChange?: (value: string) => void;
  error?: string;
  placeholder?: string;
  readOnly?: boolean;
  multiline?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="flex items-stretch">
      <div className="flex w-[100px] shrink-0 items-center border-r border-slate-200 bg-slate-50/60 px-2 py-0.5">
        <span className="text-[11px] font-semibold text-slate-600">
          {label}
        </span>
      </div>

      <div className="relative flex flex-1" ref={dropdownRef}>
        {options && !readOnly ? (
          <>
            <button
              type="button"
              onClick={() => setIsOpen((current) => !current)}
              aria-invalid={Boolean(error)}
              aria-expanded={isOpen}
              className={`flex h-full min-h-6 w-full items-center justify-between gap-1 border-0 bg-white pl-2 pr-2 text-left text-xs outline-none transition hover:bg-red-50/10 focus:bg-red-50/20 ${
                value ? "text-slate-900" : "text-slate-400"
              } ${error ? "bg-red-50/30" : ""}`}
            >
              <span className="truncate">{value || "Seçiniz"}</span>
              <ChevronDown
                size={12}
                className={`shrink-0 text-slate-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {options.map((opt) => {
                  const isSelected = opt === value;

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChange?.(opt);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium transition ${
                        isSelected
                          ? "bg-red-50 text-red-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt}
                      {isSelected && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : multiline ? (
          <textarea
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            aria-invalid={Boolean(error)}
            rows={2}
            className={`h-full min-h-[40px] w-full resize-none border-0 px-2 py-0.5 text-xs leading-5 text-slate-900 outline-none ${
              readOnly
                ? "cursor-not-allowed bg-slate-100 text-slate-500"
                : "bg-white focus:bg-red-50/20"
            } ${error ? "bg-red-50/30" : ""}`}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            aria-invalid={Boolean(error)}
            className={`h-full min-h-6 w-full border-0 px-2 text-xs text-slate-900 outline-none ${
              readOnly
                ? "cursor-not-allowed bg-slate-100 text-slate-500"
                : "bg-white focus:bg-red-50/20"
            } ${error ? "bg-red-50/30" : ""}`}
          />
        )}

        {error && (
          <p className="flex items-center gap-1 bg-red-50/30 px-2 pb-1 text-[10px] font-medium text-red-600">
            <AlertCircle size={9} />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}