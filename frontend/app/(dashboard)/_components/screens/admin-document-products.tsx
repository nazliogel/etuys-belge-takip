"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api";

interface AdminDocumentProductsProps {
  documentId: string;
  isClosed?: boolean;
}

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

export function AdminDocumentProducts({
  documentId,
  isClosed = false,
}: AdminDocumentProductsProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      setLoadError("");

      try {
        const endpoint = isClosed
          ? `/closed-documents/${documentId}/products`
          : `/documents/${documentId}/products`;

        const response = await apiFetch<ProductsResponse>(endpoint);

        setProducts(response.data.items ?? []);
      } catch (error) {
        setProducts([]);

        setLoadError(
          error instanceof Error ? error.message : "Ürün bilgileri alınamadı.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProducts();
  }, [documentId, isClosed]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
            Ürün ve Kapasite Listesi
          </h3>

          <p className="mt-0.5 text-[10px] text-slate-400">
            Belgede tanımlı ürün ve kapasite bilgileri
          </p>
        </div>

        {!isLoading && products.length > 0 && (
          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            {products.length} Kayıt
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />

          <span className="text-xs text-slate-500">
            Ürün bilgileri yükleniyor...
          </span>
        </div>
      ) : loadError ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-semibold text-red-600">{loadError}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-medium text-slate-600">Kayıt bulunamadı</p>

          <p className="mt-1 text-[10px] text-slate-400">
            Bu belgeye ait ürün bilgisi mevcut değil.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Ürün Adı
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  US97 Kodu
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  US97 Açıklaması
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  NACE Kodu
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  NACE Açıklaması
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Birim
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Mevcut Kap.
                </th>

                <th className="border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  İlave Kap.
                </th>

                <th className="px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Toplam Kap.
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {products.map((product, index) => (
                <tr
                  key={product.id}
                  className={
                    index % 2 === 1
                      ? "bg-slate-50/40 hover:bg-slate-50"
                      : "bg-white hover:bg-slate-50"
                  }
                >
                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-900">
                    {product.productName ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5">
                    {product.us97Code ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                        {product.us97Code}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600">
                    {product.us97Description ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5">
                    {product.naceCode ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                        {product.naceCode}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600">
                    {product.naceDescription ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700">
                    {product.unit ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] text-slate-700">
                    {product.existingCapacity ?? "-"}
                  </td>

                  <td className="border-r border-slate-200 px-2.5 py-1.5 text-right font-mono text-[11px] text-slate-700">
                    {product.additionalCapacity ?? "-"}
                  </td>

                  <td className="px-2.5 py-1.5 text-right font-mono text-[11px] font-bold text-slate-900">
                    {product.totalCapacity ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
