"use client";

import { PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

type ApiDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
};

type DocumentsResponse = {
  success: boolean;
  data: {
    items: ApiDocument[];
  };
};

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
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await apiFetch<DocumentsResponse>(
          "/documents?isActive=true",
        );

        const items = response.data.items;

        setDocuments(items);

        if (items.length === 1) {
          setSelectedDocumentId(String(items[0].id));
        }
      } catch (error) {
        console.error("Aktif belgeler alınamadı:", error);
      } finally {
        setDocumentsLoading(false);
      }
    };

    void fetchDocuments();
  }, []);
  useEffect(() => {
    if (!selectedDocumentId) {
      setProducts([]);
      return;
    }

    const fetchProducts = async () => {
      try {
        setProductsLoading(true);

        const response = await apiFetch<ProductsResponse>(
          `/documents/${selectedDocumentId}/products`,
        );

        setProducts(response.data.items);
      } catch (error) {
        console.error("Ürün bilgileri alınamadı:", error);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    void fetchProducts();
  }, [selectedDocumentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Ürün Bilgileri
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Teşvik belgesine ait ürün ve kapasite bilgilerini
          görüntüleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <PackageSearch className="h-5 w-5 text-slate-600" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Ürün Listesi</h2>

            <p className="text-sm text-slate-500">
              Seçili belgeye ait ürün bilgileri burada görüntülenecek.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Belge
          </label>

          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.target.value)}
            disabled={documentsLoading || documents.length === 0}
          >
            <option value="" disabled>
              {documentsLoading
                ? "Belgeler yükleniyor..."
                : documents.length === 0
                  ? "Aktif belge bulunamadı"
                  : "Belge seçiniz"}
            </option>

            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.documentNumber ??
                  `Belge ${document.externalDocumentId}`}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Ürün Adı</th>
                <th className="px-4 py-3 font-medium">US97 Kodu</th>
                <th className="px-4 py-3 font-medium">US97 Açıklaması</th>
                <th className="px-4 py-3 font-medium">NACE Kodu</th>
                <th className="px-4 py-3 font-medium">NACE Açıklaması</th>
                <th className="px-4 py-3 font-medium">Birim</th>
                <th className="px-4 py-3 font-medium">Mevcut Kapasite</th>
                <th className="px-4 py-3 font-medium">İlave Kapasite</th>
                <th className="px-4 py-3 font-medium">Toplam Kapasite</th>
              </tr>
            </thead>

            <tbody>
              {!selectedDocumentId ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Önce bir belge seçiniz.
                  </td>
                </tr>
              ) : productsLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Ürün bilgileri yükleniyor...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Bu belgeye ait ürün bilgisi bulunamadı.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 text-slate-700"
                  >
                    <td className="px-4 py-3">{product.productName ?? "-"}</td>
                    <td className="px-4 py-3">{product.us97Code ?? "-"}</td>
                    <td className="px-4 py-3">
                      {product.us97Description ?? "-"}
                    </td>
                    <td className="px-4 py-3">{product.naceCode ?? "-"}</td>
                    <td className="px-4 py-3">
                      {product.naceDescription ?? "-"}
                    </td>
                    <td className="px-4 py-3">{product.unit ?? "-"}</td>
                    <td className="px-4 py-3">
                      {product.existingCapacity ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {product.additionalCapacity ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {product.totalCapacity ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
