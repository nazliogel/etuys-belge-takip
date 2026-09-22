"use client";

import { FileText, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import {
  getSelectedDocument,
  type SelectedDocumentStatus,
} from "@/app/(dashboard)/_lib/selected-document";

type ProductItem = {
  id: number;
  productName: string | null;
  us97Code: string | null;
  us97Description: string | null;
  naceCode: string | null;
  naceDescription: string | null;
  unit: string | null;
  existingCapacity: string | null;
  additionalCapacity: string | null;
  totalCapacity: string | null;
};

type ProductsResponse = {
  success: boolean;
  data: {
    documentId: number;
    externalDocumentId: number;
    documentNumber: string | null;
    items: ProductItem[];
  };
};

export function ProductInformationScreen() {
  const searchParams = useSearchParams();

  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedDocumentNumber, setSelectedDocumentNumber] = useState<
    string | null
  >(null);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedDocumentStatus, setSelectedDocumentStatus] =
    useState<SelectedDocumentStatus>("OPEN");

  useEffect(() => {
    const documentIdFromUrl = searchParams.get("documentId");
    const storedDocument = getSelectedDocument();

    const documentId = documentIdFromUrl ?? storedDocument?.id ?? "";

    setSelectedDocumentId(documentId);
    setSelectedDocumentNumber(storedDocument?.documentNumber ?? null);
    setSelectedDocumentStatus(storedDocument?.status ?? "OPEN");
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setProducts([]);
      setProductsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        setProductsLoading(true);

        const isClosed =
          selectedDocumentStatus === "CLOSED" ||
          selectedDocumentStatus === "CANCELLED";

        const endpoint = isClosed
          ? `/closed-documents/${selectedDocumentId}/products`
          : `/documents/${selectedDocumentId}/products`;

        const response = await apiFetch<ProductsResponse>(endpoint);

        setProducts(response.data.items);

        if (response.data.documentNumber) {
          setSelectedDocumentNumber(response.data.documentNumber);
        }
      } catch (error) {
        console.error("Ürün bilgileri alınamadı:", error);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    void fetchProducts();
  }, [selectedDocumentId, selectedDocumentStatus]);

  return (
    <div className="space-y-8">
      {/* SAYFA BAŞLIĞI */}
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Belge Detayları
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          Ürün Bilgileri
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Seçili teşvik belgesine ait ürün ve kapasite bilgilerini
          görüntüleyebilirsiniz.
        </p>
      </header>

      {/* SEÇİLİ BELGE ŞERİDİ */}
      {selectedDocumentId && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-md border border-border bg-card px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
            <FileText
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.75}
            />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Belge No
            </span>
            <span className="h-4 w-px bg-border" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {selectedDocumentNumber ?? `#${selectedDocumentId}`}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Seçili
          </span>
        </div>
      )}

      {/* İÇERİK KARTI */}
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none">
        {/* Kart Alt Başlığı */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-b from-slate-50 to-white px-6 py-4 dark:from-muted/40 dark:to-card">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-[#1e2a5e] dark:bg-blue-400" />
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground">
                Ürün ve Kapasite Listesi
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Belgede tanımlı ürünler ile mevcut, ilave ve toplam kapasite
                değerleri.
              </p>
            </div>
          </div>
          {!productsLoading && selectedDocumentId && products.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm dark:shadow-none">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c8102e]" />
              {products.length} Kayıt
            </span>
          )}
        </div>

        {/* Tablo */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[#1e2a5e]/15 bg-[#1e2a5e]/[0.04] text-left dark:border-blue-400/20 dark:bg-blue-400/10">
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  Ürün Adı
                </th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  US97 Kodu
                </th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  US97 Açıklaması
                </th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  NACE Kodu
                </th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  NACE Açıklaması
                </th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  Birim
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  Mevcut Kap.
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  İlave Kap.
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#1e2a5e] dark:text-blue-300">
                  Toplam Kap.
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {!selectedDocumentId ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-foreground/80">
                      Görüntülenecek belge seçilmedi
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Lütfen sol menüden bir belge numarası seçin.
                    </p>
                  </td>
                </tr>
              ) : productsLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14">
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-[#1e2a5e] dark:text-blue-300" />
                      <span className="text-sm text-muted-foreground">
                        Yükleniyor
                      </span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-foreground/80">
                      Kayıt bulunamadı
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Bu belgeye ait ürün bilgisi mevcut değil.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr
                    key={product.id}
                    className={`group transition-colors hover:bg-[#1e2a5e]/[0.03] dark:hover:bg-blue-400/5 ${
                      index % 2 === 1 ? "bg-muted/40" : "bg-card"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-sm font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c8102e] opacity-0 transition-opacity group-hover:opacity-100" />
                        {product.productName ?? (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {product.us97Code ? (
                        <span className="inline-flex rounded border border-[#1e2a5e]/20 bg-[#1e2a5e]/[0.05] px-2 py-0.5 font-mono text-xs font-semibold text-[#1e2a5e] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300">
                          {product.us97Code}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {product.us97Description ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {product.naceCode ? (
                        <span className="inline-flex rounded border border-[#1e2a5e]/20 bg-[#1e2a5e]/[0.05] px-2 py-0.5 font-mono text-xs font-semibold text-[#1e2a5e] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300">
                          {product.naceCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {product.naceDescription ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {product.unit ? (
                        <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
                          {product.unit}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-foreground/80">
                      {product.existingCapacity ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums text-emerald-700 dark:text-emerald-400">
                      {product.additionalCapacity ? (
                        `+${product.additionalCapacity}`
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-[#1e2a5e] dark:text-blue-300">
                      {product.totalCapacity ?? (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
