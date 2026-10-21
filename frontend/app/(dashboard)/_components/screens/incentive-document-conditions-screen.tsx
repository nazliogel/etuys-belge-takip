"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { getSessionUser } from "@/lib/mock-auth";
import {
  createIncentiveDocumentCondition,
  deactivateIncentiveDocumentCondition,
  getIncentiveDocumentConditions,
  setIncentiveDocumentConditionStatus,
  updateIncentiveDocumentCondition,
  type IncentiveDocumentCondition,
  type IncentiveDocumentConditionStatus,
} from "@/lib/incentive-document-conditions";

function sortByOrder(list: IncentiveDocumentCondition[]) {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

function hasOrderGaps(list: IncentiveDocumentCondition[]) {
  return sortByOrder(list).some((item, index) => item.sortOrder !== index + 1);
}

// Bir maddeyi güncelledikten sonra durumunu (Yayında/Taslak) eski haline getirir.
// Güncelleme API'si durum gönderilmeyince maddeyi taslağa düşürebiliyor.
async function updateKeepingStatus(
  current: IncentiveDocumentCondition,
  input: { title: string; description: string; sortOrder: number },
) {
  await updateIncentiveDocumentCondition(current.id, input);
  await setIncentiveDocumentConditionStatus(current.id, current.status);
}

// Verilen sırayı 1, 2, 3… olarak veritabanına yazar.
// Yalnızca numarası değişen maddeler güncellenir; durumları korunur.
async function writeOrder(ordered: IncentiveDocumentCondition[]) {
  for (const [index, current] of ordered.entries()) {
    const nextOrder = index + 1;

    if (current.sortOrder !== nextOrder) {
      await updateKeepingStatus(current, {
        title: current.title,
        description: current.description,
        sortOrder: nextOrder,
      });
    }
  }
}

// Sıra numaralarındaki boşlukları kapatır.
async function renumber(list: IncentiveDocumentCondition[]) {
  await writeOrder(sortByOrder(list));
}

// `id`'li maddeyi istenen sıraya (1'den başlar) yerleştirir, diğerlerini kaydırır.
// 0 veya liste uzunluğundan büyük bir sıra "en sona" demektir.
async function placeAt(
  list: IncentiveDocumentCondition[],
  id: number,
  position: number,
) {
  const target = list.find((item) => item.id === id);

  if (!target) {
    await renumber(list);
    return;
  }

  const others = sortByOrder(list.filter((item) => item.id !== id));
  const index =
    position >= 1 && position <= others.length ? position - 1 : others.length;

  await writeOrder([...others.slice(0, index), target, ...others.slice(index)]);
}

export function IncentiveDocumentConditionsScreen() {
  const [items, setItems] = useState<IncentiveDocumentCondition[]>([]);
  const [canManage, setCanManage] = useState(false);
  // Rol okunmadan hiçbir görünüm çizilmez; aksi halde admin bir an firma görünümünü görür.
  const [roleChecked, setRoleChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  // "Düzenle"ye basınca sayfayı forma kaydırmak ve başlık alanına odaklanmak için.
  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // fixGaps: admin/danışman için, numaralarda boşluk varsa (ör. eski bir silme
  // işleminden kalan 2, 3, 4…) bunları 1, 2, 3… olarak düzeltip listeyi tazeler.
  const loadConditions = useCallback(async (fixGaps = false) => {
    try {
      setError("");
      let result = await getIncentiveDocumentConditions();

      if (fixGaps && hasOrderGaps(result)) {
        await renumber(result);
        result = await getIncentiveDocumentConditions();
      }

      setItems(sortByOrder(result));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Şart maddeleri yüklenirken bir hata oluştu.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getSessionUser();
    const isStaff = user?.role === "ADMIN" || user?.role === "OPERATION";
    // Oturum bilgisi localStorage'dan okunduğu için effect içinde set edilir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanManage(isStaff);
    setRoleChecked(true);
    // Numara boşluklarını yalnızca yönetme yetkisi olanlar düzeltebilir.
    void loadConditions(isStaff);
  }, [loadConditions]);

  // Yeşil bilgi mesajı 4 saniye sonra kendiliğinden kaybolur.
  // Yeni bir mesaj gelirse süre baştan başlar.
  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSortOrder("0");
  }

  function startEditing(item: IncentiveDocumentCondition) {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setSortOrder(String(item.sortOrder));
    setMessage("");
    setError("");

    // Form sayfanın üstünde; kullanıcıyı oraya götür ve başlık alanına odaklan.
    // Form başlığı ("Şart maddesini düzenle") yeni render'da güncellendiği için
    // kaydırma bir sonraki karede yapılır.
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus({ preventScroll: true });
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const position = Number(sortOrder);
      const input = {
        title: title.trim(),
        description: description.trim(),
        sortOrder: position,
      };

      // Yeni eklenen maddeyi kayıttan sonra bulabilmek için mevcut kimlikler.
      const previousIds = new Set(items.map((item) => item.id));
      const editedItem =
        editingId === null
          ? undefined
          : items.find((item) => item.id === editingId);

      if (editingId === null) {
        await createIncentiveDocumentCondition(input);
      } else if (editedItem) {
        // Düzenlenen maddenin Yayında/Taslak durumu değişmesin.
        await updateKeepingStatus(editedItem, input);
      } else {
        await updateIncentiveDocumentCondition(editingId, input);
      }

      // Maddeyi istenen sıraya oturt, o sırada ve sonrasında olanları bir kaydır.
      const fresh = await getIncentiveDocumentConditions();
      const savedId =
        editingId ?? fresh.find((item) => !previousIds.has(item.id))?.id;

      if (savedId !== undefined) {
        await placeAt(fresh, savedId, position);
      } else {
        await renumber(fresh);
      }

      setMessage(
        editingId === null
          ? "Şart maddesi eklendi."
          : "Şart maddesi güncellendi.",
      );
      resetForm();
      await loadConditions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "İşlem sırasında hata oluştu.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(
    item: IncentiveDocumentCondition,
    status: IncentiveDocumentConditionStatus,
  ) {
    setError("");
    setMessage("");

    try {
      await setIncentiveDocumentConditionStatus(item.id, status);
      setMessage("Şart maddesinin durumu güncellendi.");
      await loadConditions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Durum güncellenemedi.",
      );
    }
  }

  async function handleDeactivate(item: IncentiveDocumentCondition) {
    if (
      !window.confirm(
        `"${item.title}" şart maddesi silinsin mi?\nSonraki maddelerin sıra numaraları bir kayacak.`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deactivateIncentiveDocumentCondition(item.id);

      if (editingId === item.id) {
        resetForm();
      }

      // Silinen maddenin bıraktığı boşluğu kapat: 2 → 1, 3 → 2 …
      await renumber(items.filter((current) => current.id !== item.id));

      setMessage("Şart maddesi silindi, sıra numaraları güncellendi.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Şart maddesi silinemedi.",
      );
    } finally {
      // Hata olsa bile listeyi sunucudaki güncel haliyle göster.
      await loadConditions();
    }
  }

  if (!roleChecked) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Şart maddeleri yükleniyor...
      </p>
    );
  }

  /* ---------------- Firma görünümü: düz metin, alt alta ---------------- */
  if (!canManage) {
    const publishedItems = items
      .filter((item) => item.status === "PUBLISHED")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Teşvik Belgesi Şartları
          </h1>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <article className="rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8 sm:py-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Dikkat Edilmesi Gereken Hususlar
          </h2>

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-500">
              Şart maddeleri yükleniyor...
            </p>
          ) : publishedItems.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Henüz görüntülenecek şart maddesi yok.
            </p>
          ) : (
            <ol className="mt-6 space-y-6">
              {publishedItems.map((item, index) => (
                <li key={item.id}>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {index + 1}. {item.title}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    );
  }

  /* ---------------- Admin / danışman görünümü ---------------- */

  // Firmaların gördüğü numara: yalnızca yayındaki maddeler sayılır.
  const publishedPosition = new Map(
    items
      .filter((item) => item.status === "PUBLISHED")
      .map((item, index) => [item.id, index + 1]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Teşvik Belgesi Şartları
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Firmaların gördüğü şart maddelerini ekleyin, düzenleyin veya yayından
          kaldırın.
        </p>
      </div>

      {canManage && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className={`scroll-mt-6 space-y-3 rounded-xl border bg-white p-4 shadow-sm transition-colors dark:bg-slate-900 ${
            editingId === null
              ? "border-slate-200 dark:border-slate-800"
              : "border-blue-400 ring-2 ring-blue-100 dark:border-blue-500 dark:ring-blue-950"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              {editingId === null
                ? "Yeni şart maddesi"
                : "Şart maddesini düzenle"}
            </h2>
            {editingId !== null && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Düzenleniyor: {title || "—"}
              </span>
            )}
          </div>

          {/* Başlık ve sıra yan yana; sıra alanı dar */}
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[220px] flex-1">
              <label
                htmlFor="condition-title"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Başlık
              </label>
              <input
                id="condition-title"
                ref={titleInputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={200}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="w-24">
              <label
                htmlFor="condition-sort-order"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Sıra
              </label>
              <input
                id="condition-sort-order"
                type="number"
                title="Maddenin listedeki yeri. 0 yazarsanız en sona eklenir; dolu bir sıra seçerseniz diğerleri bir aşağı kayar."
                min={0}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                required
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="condition-description"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Açıklama
            </label>
            <textarea
              id="condition-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={3}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isSaving
                ? "Kaydediliyor..."
                : editingId === null
                  ? "Şart maddesi ekle"
                  : "Değişiklikleri kaydet"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Düzenlemeyi iptal et
              </button>
            )}
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Şart Maddeleri
          </h2>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">
            Şart maddeleri yükleniyor...
          </p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Henüz görüntülenecek şart maddesi yok.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <article
                key={item.id}
                className={`p-5 transition-colors ${
                  editingId === item.id
                    ? "bg-blue-50/70 dark:bg-blue-950/40"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.status === "PUBLISHED"
                        ? `Firmalarda sıra: ${publishedPosition.get(item.id)}`
                        : "Taslak — firmalara gösterilmiyor"}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                      item.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {item.status === "PUBLISHED" ? "Yayında" : "Taslak"}
                  </span>
                </div>

                {canManage && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      disabled={editingId === item.id}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:border-blue-300 disabled:bg-blue-50 disabled:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:disabled:border-blue-800 dark:disabled:bg-blue-950 dark:disabled:text-blue-300"
                    >
                      {editingId === item.id ? "Düzenleniyor" : "Düzenle"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleStatusChange(
                          item,
                          item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {item.status === "PUBLISHED" ? "Taslağa al" : "Yayınla"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeactivate(item)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                    >
                      Sil
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}