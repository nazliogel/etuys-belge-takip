"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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

type ProductColumnKey =
  | "productName"
  | "us97Code"
  | "us97Description"
  | "naceCode"
  | "naceDescription"
  | "unit"
  | "existingCapacity"
  | "additionalCapacity"
  | "totalCapacity";

type ColumnWidths = Record<ProductColumnKey, number>;

const COLUMN_STORAGE_KEY = "document-products-column-widths-v1";

const MIN_COLUMN_WIDTH = 70;
const MAX_COLUMN_WIDTH = 600;

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  productName: 180,
  us97Code: 110,
  us97Description: 240,
  naceCode: 110,
  naceDescription: 240,
  unit: 90,
  existingCapacity: 120,
  additionalCapacity: 120,
  totalCapacity: 120,
};

type ResizeState = {
  column: ProductColumnKey;
  startX: number;
  startWidth: number;
  pointerId: number;
};

export function AdminDocumentProducts({
  documentId,
  isClosed = false,
}: AdminDocumentProductsProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(
    DEFAULT_COLUMN_WIDTHS,
  );

  const columnWidthsRef = useRef<ColumnWidths>(DEFAULT_COLUMN_WIDTHS);
  const resizeStateRef = useRef<ResizeState | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<ColumnWidths>;

      const nextWidths: ColumnWidths = {
        ...DEFAULT_COLUMN_WIDTHS,
        ...parsed,
      };

      columnWidthsRef.current = nextWidths;
      setColumnWidths(nextWidths);
    } catch {
      // localStorage okunamazsa varsayılan genişlikler kullanılır.
    }
  }, []);

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

  const handleResizeStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    column: ProductColumnKey,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      column,
      startX: event.clientX,
      startWidth: columnWidthsRef.current[column],
      pointerId: event.pointerId,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeState = resizeStateRef.current;

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const difference = event.clientX - resizeState.startX;

    const nextWidth = Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(MIN_COLUMN_WIDTH, resizeState.startWidth + difference),
    );

    setColumnWidths((current) => {
      const next = {
        ...current,
        [resizeState.column]: nextWidth,
      };

      columnWidthsRef.current = next;

      return next;
    });
  };

  const handleResizeEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const resizeState = resizeStateRef.current;

    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer zaten bırakıldıysa devam et.
    }

    resizeStateRef.current = null;

    try {
      window.localStorage.setItem(
        COLUMN_STORAGE_KEY,
        JSON.stringify(columnWidthsRef.current),
      );
    } catch {
      // localStorage kullanılamıyorsa sessizce geç.
    }
  };

  const totalTableWidth = Object.values(columnWidths).reduce(
    (total, width) => total + width,
    0,
  );

  const resizeHandle = (column: ProductColumnKey, label: string) => (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`${label} sütun genişliğini değiştir`}
      onPointerDown={(event) => handleResizeStart(event, column)}
      onPointerMove={handleResizeMove}
      onPointerUp={handleResizeEnd}
      onPointerCancel={handleResizeEnd}
      className="group absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none"
    >
      <span className="mx-auto block h-full w-px bg-transparent transition-colors group-hover:bg-blue-400" />
    </button>
  );

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
          <table
            className="table-fixed border-collapse text-left"
            style={{
              width: `${totalTableWidth}px`,
              minWidth: `${totalTableWidth}px`,
            }}
          >
            <colgroup>
              <col style={{ width: columnWidths.productName }} />
              <col style={{ width: columnWidths.us97Code }} />
              <col style={{ width: columnWidths.us97Description }} />
              <col style={{ width: columnWidths.naceCode }} />
              <col style={{ width: columnWidths.naceDescription }} />
              <col style={{ width: columnWidths.unit }} />
              <col style={{ width: columnWidths.existingCapacity }} />
              <col style={{ width: columnWidths.additionalCapacity }} />
              <col style={{ width: columnWidths.totalCapacity }} />
            </colgroup>

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="relative border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Ürün Adı
                  {resizeHandle("productName", "Ürün Adı")}
                </th>

                <th className="relative border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  US97 Kodu
                  {resizeHandle("us97Code", "US97 Kodu")}
                </th>

                <th className="relative border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  US97 Açıklaması
                  {resizeHandle("us97Description", "US97 Açıklaması")}
                </th>

                <th className="relative border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  NACE Kodu
                  {resizeHandle("naceCode", "NACE Kodu")}
                </th>

                <th className="relative border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  NACE Açıklaması
                  {resizeHandle("naceDescription", "NACE Açıklaması")}
                </th>

                <th className="relative border-r border-slate-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Birim
                  {resizeHandle("unit", "Birim")}
                </th>

                <th className="relative border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Mevcut Kap.
                  {resizeHandle("existingCapacity", "Mevcut Kapasite")}
                </th>

                <th className="relative border-r border-slate-200 px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  İlave Kap.
                  {resizeHandle("additionalCapacity", "İlave Kapasite")}
                </th>

                <th className="relative px-2.5 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Toplam Kap.
                  {resizeHandle("totalCapacity", "Toplam Kapasite")}
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
                  <td className="break-words border-r border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-900">
                    {product.productName ?? "-"}
                  </td>

                  <td className="break-words border-r border-slate-200 px-2.5 py-1.5">
                    {product.us97Code ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                        {product.us97Code}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="break-words border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600">
                    {product.us97Description ?? "-"}
                  </td>

                  <td className="break-words border-r border-slate-200 px-2.5 py-1.5">
                    {product.naceCode ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                        {product.naceCode}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="break-words border-r border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600">
                    {product.naceDescription ?? "-"}
                  </td>

                  <td className="break-words border-r border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700">
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
