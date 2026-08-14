"use client";

import {
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

export function CompanyIdentitySection({
  companyId,
}: CompanyIdentitySectionProps) {
  const [contact, setContact] = useState<ContactForm>({
    fullName: "",
    email: "",
    phone: "",
  });

  const [contacts, setContacts] = useState<ContactForm[]>([]);
  type CompanyNote = {
    text: string;
    author: string;
    createdAt: string;
  };

  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<CompanyNote[]>([]);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ContactForm>({
    fullName: "",
    email: "",
    phone: "",
  });

  function handleAddContact() {
    const fullName = contact.fullName.trim();
    const email = contact.email.trim();
    const phone = contact.phone.trim();

    if (!fullName && !email && !phone) {
      return;
    }

    setContacts((current) => [...current, { fullName, email, phone }]);

    setContact({ fullName: "", email: "", phone: "" });
  }

  function handleStartEdit(index: number) {
    setEditingIndex(index);
    setEditDraft(contacts[index]);
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setEditDraft({ fullName: "", email: "", phone: "" });
  }

  function handleSaveEdit() {
    if (editingIndex === null) return;

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
  }
  function handleStartEditNote(index: number) {
    setEditingNoteIndex(index);
    setEditingNoteText(notes[index].text);
  }

  function handleCancelEditNote() {
    setEditingNoteIndex(null);
    setEditingNoteText("");
  }

  function handleSaveEditNote() {
    if (editingNoteIndex === null) return;

    const text = editingNoteText.trim();

    if (!text) return;

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
              <TableField label="Yatırımcı Durumu" />
              <TableField label="Vergi No" />
              <TableField label="Mersis No" />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
              <TableField label="Kimlik No" />
              <TableField label="Ticaret Sicil No" />
              <TableField label="Tescil Tarihi" type="date" />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
              <TableField label="İl" />
              <TableField label="İlçe" />
              <TableField label="Danışman" options={DANISMAN_OPTIONS} />
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
              <TableField label="Yatırımcı Adı" />
              <TableField label="Yatırımcı Adresi" />
              <TableField
                label="Ana Faaliyet Konusu"
                options={FAALIYET_OPTIONS}
              />
            </div>
          </div>
        </div>
      </section>

      {/* NOTLAR */}
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
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              rows={2}
              placeholder="Firma hakkında not yazın..."
              className="min-h-[64px] flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
            />

            <button
              type="button"
              onClick={handleAddNote}
              className="self-end rounded-md bg-red-600 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-red-700"
            >
              Not Ekle
            </button>
          </div>

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
                          onChange={(event) =>
                            setEditingNoteText(event.target.value)
                          }
                          rows={2}
                          className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
                        />

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
          <div className="grid items-end gap-2.5 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Ad Soyad
              </label>
              <input
                type="text"
                value={contact.fullName}
                onChange={(event) =>
                  setContact((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Ad Soyad"
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                E-posta
              </label>
              <input
                type="email"
                value={contact.email}
                onChange={(event) =>
                  setContact((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="ornek@firma.com"
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Telefon
              </label>
              <input
                type="tel"
                value={contact.phone}
                onChange={(event) =>
                  setContact((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="05xx xxx xx xx"
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
              />
            </div>

            <button
              type="button"
              onClick={handleAddContact}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 text-[11px] font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700"
            >
              <Plus size={13} />
              Yetkili Ekle
            </button>
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
                      className={`grid grid-cols-[1fr_1fr_1fr_50px] items-center gap-2 px-3 py-1.5 text-xs transition ${
                        isEditing ? "bg-red-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editDraft.fullName}
                            onChange={(e) =>
                              setEditDraft((c) => ({
                                ...c,
                                fullName: e.target.value,
                              }))
                            }
                            className="h-7 w-full rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
                          />
                          <input
                            type="email"
                            value={editDraft.email}
                            onChange={(e) =>
                              setEditDraft((c) => ({
                                ...c,
                                email: e.target.value,
                              }))
                            }
                            className="h-7 w-full rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
                          />
                          <input
                            type="tel"
                            value={editDraft.phone}
                            onChange={(e) =>
                              setEditDraft((c) => ({
                                ...c,
                                phone: e.target.value,
                              }))
                            }
                            className="h-7 w-full rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/10"
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
}: {
  label: string;
  type?: string;
  options?: string[];
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
              defaultValue=""
              className="h-9 w-full appearance-none border-0 bg-white pl-3 pr-8 text-xs text-slate-900 outline-none focus:bg-red-50/20"
            >
              <option value="" disabled>
                Seçiniz
              </option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </>
        ) : (
          <input
            type={type}
            defaultValue=""
            className="h-9 w-full border-0 bg-white px-3 text-xs text-slate-900 outline-none focus:bg-red-50/20"
          />
        )}
      </div>
    </div>
  );
}
