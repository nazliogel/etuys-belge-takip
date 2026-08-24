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
import { useState } from "react";

type CompanyIdentitySectionProps = {
  companyId: string;
};

type ContactForm = {
  fullName: string;
  email: string;
  phone: string;
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
  investorName: string;
  investorAddress: string;
  mainActivity: string;
};

type IdentityErrors = Partial<Record<keyof IdentityForm, string>>;

const FAALIYET_OPTIONS = [
  "İmalat",
  "İnşaat",
  "Bilişim / Yazılım",
  "Tarım ve Hayvancılık",
  "Gıda Üretimi",
  "Tekstil",
  "Enerji",
  "Toptan / Perakende Ticaret",
  "Lojistik ve Taşımacılık",
  "Turizm ve Konaklama",
  "Sağlık Hizmetleri",
  "Eğitim",
  "Otomotiv",
  "Kimya",
  "Hizmet",
];

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
  investorName: "",
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

// T.C. kimlik numarası resmi doğrulama algoritması
function isValidNationalId(value: string): boolean {
  if (!/^\d{11}$/.test(value) || value[0] === "0") {
    return false;
  }

  const digits = value.split("").map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = (((oddSum * 7 - evenSum) % 10) + 10) % 10;

  if (digit10 !== digits[9]) {
    return false;
  }

  const sumFirst10 = digits.slice(0, 10).reduce((total, digit) => total + digit, 0);
  const digit11 = sumFirst10 % 10;

  return digit11 === digits[10];
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

  const investorStatus = form.investorStatus.trim();
  const taxNumber = form.taxNumber.trim();
  const mersisNumber = form.mersisNumber.trim();
  const nationalId = form.nationalId.trim();
  const tradeRegistryNumber = form.tradeRegistryNumber.trim();
  const city = form.city.trim();
  const district = form.district.trim();
  const investorName = form.investorName.trim();
  const investorAddress = form.investorAddress.trim();

  if (!investorStatus) {
    errors.investorStatus = "Yatırımcı durumu zorunludur.";
  }

  if (!taxNumber) {
    errors.taxNumber = "Vergi numarası zorunludur.";
  } else if (!/^\d{10}$/.test(taxNumber)) {
    errors.taxNumber = "Vergi numarası 10 haneli olmalıdır.";
  }

  if (!mersisNumber) {
    errors.mersisNumber = "Mersis numarası zorunludur.";
  } else if (!/^\d{16}$/.test(mersisNumber)) {
    errors.mersisNumber = "Mersis numarası 16 haneli olmalıdır.";
  }

  if (!nationalId) {
    errors.nationalId = "Kimlik numarası zorunludur.";
  } else if (!isValidNationalId(nationalId)) {
    errors.nationalId = "Geçerli bir T.C. kimlik numarası girin.";
  }

  if (!tradeRegistryNumber) {
    errors.tradeRegistryNumber = "Ticaret sicil numarası zorunludur.";
  } else if (tradeRegistryNumber.length > 30) {
    errors.tradeRegistryNumber =
      "Ticaret sicil numarası en fazla 30 karakter olabilir.";
  }

  if (!form.registrationDate) {
    errors.registrationDate = "Tescil tarihi zorunludur.";
  } else {
    const selectedDate = new Date(form.registrationDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (Number.isNaN(selectedDate.getTime())) {
      errors.registrationDate = "Geçerli bir tarih girin.";
    } else if (selectedDate > today) {
      errors.registrationDate = "Tescil tarihi bugünden ileri bir tarih olamaz.";
    }
  }

  if (!city) {
    errors.city = "İl alanı zorunludur.";
  } else if (!NAME_REGEX.test(city)) {
    errors.city = "İl alanında yalnızca harf kullanabilirsiniz.";
  }

  if (!district) {
    errors.district = "İlçe alanı zorunludur.";
  } else if (!NAME_REGEX.test(district)) {
    errors.district = "İlçe alanında yalnızca harf kullanabilirsiniz.";
  }

  if (!form.consultant) {
    errors.consultant = "Danışman seçimi zorunludur.";
  }

  if (!investorName) {
    errors.investorName = "Yatırımcı adı zorunludur.";
  } else if (investorName.length < 2) {
    errors.investorName = "Yatırımcı adı en az 2 karakter olmalıdır.";
  }

  if (!investorAddress) {
    errors.investorAddress = "Yatırımcı adresi zorunludur.";
  } else if (investorAddress.length < 5) {
    errors.investorAddress = "Yatırımcı adresi en az 5 karakter olmalıdır.";
  }

  if (!form.mainActivity) {
    errors.mainActivity = "Ana faaliyet konusu seçimi zorunludur.";
  }

  return errors;
}

export function CompanyIdentitySection({
  companyId,
}: CompanyIdentitySectionProps) {
  // FİRMA KÜNYE BİLGİLERİ
  const [identityForm, setIdentityForm] = useState<IdentityForm>(
    initialIdentityForm,
  );
  const [identityErrors, setIdentityErrors] = useState<IdentityErrors>({});
  const [identitySaved, setIdentitySaved] = useState(false);

  // İLETİŞİM BİLGİLERİ
  const [contact, setContact] = useState<ContactForm>(initialContactForm);
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [contacts, setContacts] = useState<ContactForm[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ContactForm>(initialContactForm);
  const [editErrors, setEditErrors] = useState<ContactErrors>({});

  // NOTLAR
  type CompanyNote = {
    text: string;
    author: string;
    createdAt: string;
  };

  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [notes, setNotes] = useState<CompanyNote[]>([]);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(
    null,
  );
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingNoteError, setEditingNoteError] = useState<string | null>(
    null,
  );

  function handleIdentityFieldChange(field: keyof IdentityForm, value: string) {
    setIdentityForm((current) => ({ ...current, [field]: value }));
    setIdentityErrors((current) => ({ ...current, [field]: undefined }));
    setIdentitySaved(false);
  }

function handleSaveIdentity() {
  if (!identityForm.consultant) {
    setIdentityErrors({
      consultant: "Danışman seçimi zorunludur.",
    });

    setIdentitySaved(false);
    return;
  }

  setIdentityErrors({});
  setIdentitySaved(true);

  setTimeout(() => {
    setIdentitySaved(false);
  }, 3000);
}

  function handleAddContact() {
    const validationErrors = validateContactForm(contact);
    setContactErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setContacts((current) => [
      ...current,
      {
        fullName: contact.fullName.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
      },
    ]);

    setContact(initialContactForm);
    setContactErrors({});
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

  function handleSaveEdit() {
    if (editingIndex === null) return;

    const validationErrors = validateContactForm(editDraft);
    setEditErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setContacts((current) =>
      current.map((item, i) =>
        i === editingIndex
          ? {
              fullName: editDraft.fullName.trim(),
              email: editDraft.email.trim(),
              phone: editDraft.phone.trim(),
            }
          : item,
      ),
    );

    handleCancelEdit();
  }

  function handleAddNote() {
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

    const now = new Date();

    setNotes((current) => [
      {
        text,
        author: "Nazlı Ögel",
        createdAt: now.toLocaleString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...current,
    ]);

    setNoteText("");
    setNoteError(null);
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

  function handleSaveEditNote() {
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

    setNotes((current) =>
      current.map((note, index) =>
        index === editingNoteIndex
          ? {
              ...note,
              text,
            }
          : note,
      ),
    );

    handleCancelEditNote();
  }

  return (
    <div className="space-y-6">
      {/* FİRMA KÜNYE BİLGİLERİ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
            <Building2 size={17} />
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

        <div className="p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
              <TableField
                label="Yatırımcı Durumu"
                value={identityForm.investorStatus}
                onChange={(value) =>
                  handleIdentityFieldChange("investorStatus", value)
                }
                readOnly
                error={identityErrors.investorStatus}
              />
              <TableField
                label="Vergi No"
                value={identityForm.taxNumber}
                onChange={(value) =>
                  handleIdentityFieldChange(
                    "taxNumber",
                    value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                readOnly
                error={identityErrors.taxNumber}
                placeholder="10 haneli"
              />
              <TableField
                label="Mersis No"
                value={identityForm.mersisNumber}
                onChange={(value) =>
                  handleIdentityFieldChange(
                    "mersisNumber",
                    value.replace(/\D/g, "").slice(0, 16),
                  )
                }
                error={identityErrors.mersisNumber}
                placeholder="16 haneli"
                readOnly
              />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
              <TableField
                label="Kimlik No"
                value={identityForm.nationalId}
                onChange={(value) =>
                  handleIdentityFieldChange(
                    "nationalId",
                    value.replace(/\D/g, "").slice(0, 11),
                  )
                }
                error={identityErrors.nationalId}
                placeholder="11 haneli"
                readOnly
              />
              <TableField
                label="Ticaret Sicil No"
                value={identityForm.tradeRegistryNumber}
                onChange={(value) =>
                  handleIdentityFieldChange("tradeRegistryNumber", value)
                }
                error={identityErrors.tradeRegistryNumber}
                readOnly
              />
              <TableField
                label="Tescil Tarihi"
                type="date"
                value={identityForm.registrationDate}
                onChange={(value) =>
                  handleIdentityFieldChange("registrationDate", value)
                }
                error={identityErrors.registrationDate}
                readOnly
              />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
              <TableField
                label="İl"
                value={identityForm.city}
                onChange={(value) => handleIdentityFieldChange("city", value)}
                error={identityErrors.city}
                readOnly
              />
              <TableField
                label="İlçe"
                value={identityForm.district}
                onChange={(value) =>
                  handleIdentityFieldChange("district", value)
                }
                error={identityErrors.district}
                readOnly
              />
              <TableField
                label="Danışman"
                options={DANISMAN_OPTIONS}
                value={identityForm.consultant}
                onChange={(value) =>
                  handleIdentityFieldChange("consultant", value)
                }
                error={identityErrors.consultant}
                
              />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
              <TableField
                label="Yatırımcı Türü"
                value={identityForm.investorName}
                onChange={(value) =>
                  handleIdentityFieldChange("investorName", value)
                }
                error={identityErrors.investorName}
                readOnly
              />
              <TableField
                label="Yatırımcı Adresi"
                value={identityForm.investorAddress}
                onChange={(value) =>
                  handleIdentityFieldChange("investorAddress", value)
                }
                error={identityErrors.investorAddress}
                readOnly
              />
              <TableField
                label="Ana Faaliyet Konusu"
                options={FAALIYET_OPTIONS}
                value={identityForm.mainActivity}
                onChange={(value) =>
                  handleIdentityFieldChange("mainActivity", value)
                }
                error={identityErrors.mainActivity}
                readOnly
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-3">
            {identitySaved && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <Check size={13} />
                Kaydedildi
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveIdentity}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-red-600 px-4 text-[11px] font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700"
            >
              Kaydet
            </button>
          </div>
        </div>
      </section>

      {/* NOTLAR */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600">
            <Pencil size={17} />
          </div>

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Notlar</h2>

            <p className="text-[11px] font-medium text-slate-500">
              Firma ile ilgili yönetici notları
            </p>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
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
              className={`min-h-[64px] flex-1 resize-none rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-1 ${
                noteError
                  ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
              }`}
            />

            <button
              type="button"
              onClick={handleAddNote}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 text-[11px] font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700"
            >
              <Plus size={13} />
              Not Ekle
            </button>
          </div>

          {noteError && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-red-600">
              <AlertCircle size={10} />
              {noteError}
            </p>
          )}

          {notes.length > 0 && (
            <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {notes.map((note, index) => {
                const isEditing = editingNoteIndex === index;

                return (
                  <div
                    key={`${companyId}-note-${index}`}
                    className={`px-4 py-3 transition ${
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
                          className={`w-full resize-none rounded-md border bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-1 ${
                            editingNoteError
                              ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10"
                              : "border-slate-200 focus:border-red-500 focus:ring-red-500/10"
                          }`}
                        />

                        {editingNoteError && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-red-600">
                            <AlertCircle size={10} />
                            {editingNoteError}
                          </p>
                        )}

                        <div className="mt-2 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={handleSaveEditNote}
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-red-600 px-2.5 text-[10px] font-bold text-white hover:bg-red-700"
                          >
                            <Check size={11} />
                            Kaydet
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelEditNote}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
                          >
                            <X size={11} />
                            Vazgeç
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <p className="flex-1 text-xs leading-5 text-slate-800">
                            {note.text}
                          </p>

                          <button
                            type="button"
                            onClick={() => handleStartEditNote(index)}
                            title="Notu düzenle"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-red-600"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-500">
                            {note.author}
                          </span>

                          <span>•</span>

                          <span>{note.createdAt}</span>
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
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
            <UserRound size={17} />
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

        <div className="p-4">
          <div className="grid items-start gap-2.5 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
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
                className={`h-8 w-full rounded-md border bg-white px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-1 ${
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
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
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
                className={`h-8 w-full rounded-md border bg-white px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-1 ${
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
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
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
                className={`h-8 w-full rounded-md border bg-white px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-1 ${
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
                className="mb-1 hidden text-[11px] font-semibold text-transparent lg:block"
              >
                Ekle
              </label>
              <button
                type="button"
                onClick={handleAddContact}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 text-[11px] font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 lg:w-auto"
              >
                <Plus size={13} />
                Yetkili Ekle
              </button>
            </div>
          </div>

          {contacts.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[1fr_1fr_1fr_50px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                      key={`${companyId}-${index}`}
                      className={`px-3 py-1.5 text-xs transition ${
                        isEditing ? "bg-red-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="grid grid-cols-[1fr_1fr_1fr_50px] items-center gap-2">
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
                              className={`h-7 w-full rounded border bg-white px-1.5 text-xs text-slate-900 outline-none focus:ring-1 ${
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
                              className={`h-7 w-full rounded border bg-white px-1.5 text-xs text-slate-900 outline-none focus:ring-1 ${
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
                              className={`h-7 w-full rounded border bg-white px-1.5 text-xs text-slate-900 outline-none focus:ring-1 ${
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
                                className="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white transition hover:bg-red-700"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                title="Vazgeç"
                                className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                <X size={12} />
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
                                className="flex h-6 w-6 items-center justify-center rounded border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-red-600"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {isEditing && Object.keys(editErrors).length > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-red-600">
                          <AlertCircle size={10} />
                          {Object.values(editErrors).filter(Boolean).join(" • ")}
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
}: {
  label: string;
  type?: string;
  options?: string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-stretch">
      <div className="flex w-[140px] shrink-0 items-center border-r border-slate-200 bg-slate-50/60 px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-600">
          {label}
        </span>
      </div>

      <div className="relative flex-1">
        {options ? (
          <>
            <select
              value={value}
              onChange={(event) => onChange(event.target.value)}
              disabled={readOnly}
              aria-invalid={Boolean(error)}
              className={`h-9 w-full appearance-none border-0 pl-3 pr-8 text-xs outline-none ${
                readOnly
                  ? "cursor-not-allowed bg-slate-100 text-slate-600"
                  : "bg-white text-slate-900 focus:bg-red-50/20"
              } ${error ? "bg-red-50/30" : ""}`}
            >
              <option value="" disabled>
                Seçiniz
              </option>

              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            {!readOnly && (
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            )}
          </>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            aria-readonly={readOnly}
            aria-invalid={Boolean(error)}
            className={`h-9 w-full border-0 px-3 text-xs outline-none ${
              readOnly
                ? "cursor-not-allowed bg-slate-100 text-slate-600"
                : "bg-white text-slate-900 focus:bg-red-50/20"
            } ${error ? "bg-red-50/30" : ""}`}
          />
        )}

        {error && (
          <p className="flex items-center gap-1 bg-red-50/30 px-3 pb-1.5 text-[10px] font-medium text-red-600">
            <AlertCircle size={10} />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}