"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogOut } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { logoutMockUser } from "@/lib/mock-auth";

import { navigationItems } from "../_lib/navigation";
import {
  clearSelectedDocument,
  getSelectedDocument,
  setSelectedDocument,
} from "../_lib/selected-document";

import { hasPermission, type UserRole } from "../_lib/permissions";

type SidebarDocument = {
  id: number;
  externalDocumentId: number;
  documentNumber: string | null;
};

type DocumentsResponse = {
  success: boolean;
  data: {
    items: SidebarDocument[];
  };
};

interface AppSidebarProps {
  role: UserRole;
  userName?: string;
}

export function AppSidebar({ role, userName }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState<SidebarDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentWarning, setDocumentWarning] = useState(false);

  const visibleItems = navigationItems.filter((item) =>
    hasPermission(role, item.permission),
  );

  const documentContextPaths = new Set([
    "/documents/investment-type",
    "/documents/product-information",
    "/documents/supports",
    "/documents/financial",
    "/documents/domestic-machines",
    "/documents/imported-machines",
    "/documents/special-conditions",
  ]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setDocumentsLoading(true);

        const response = await apiFetch<DocumentsResponse>(
          "/documents?isActive=true&limit=100",
        );

        const items = response.data.items ?? [];

        setDocuments(items);

        const documentIdFromUrl = searchParams.get("documentId");
        const storedDocument = getSelectedDocument();

        const currentDocumentId = documentIdFromUrl ?? storedDocument?.id ?? "";

        const selectedDocumentExists = items.some(
          (item) => String(item.id) === currentDocumentId,
        );

        if (currentDocumentId && selectedDocumentExists) {
          setSelectedDocumentId(currentDocumentId);
          return;
        }

        if (currentDocumentId && !selectedDocumentExists) {
          clearSelectedDocument();
          setSelectedDocumentId("");
        }

        if (items.length === 1) {
          const document = items[0];

          setSelectedDocumentId(String(document.id));

          setSelectedDocument(String(document.id), document.documentNumber);
        }
      } catch (error) {
        console.error("Sidebar belgeleri alınamadı:", error);
        setDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    };

    void loadDocuments();
  }, [searchParams]);

  const showDocumentWarning = () => {
    setDocumentWarning(true);

    window.setTimeout(() => {
      setDocumentWarning(false);
    }, 2500);
  };

  const handleNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!documentContextPaths.has(href)) {
      return;
    }

    const selectedDocument = getSelectedDocument();

    if (!selectedDocument) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    router.push(
      `${href}?documentId=${encodeURIComponent(selectedDocument.id)}`,
    );
  };

  const handleDocumentChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const documentId = event.target.value;

    const document = documents.find((item) => String(item.id) === documentId);

    if (!document) return;

    setSelectedDocumentId(documentId);
    setDocumentWarning(false);
    setSelectedDocument(documentId, document.documentNumber);

    if (documentContextPaths.has(pathname)) {
      router.replace(
        `${pathname}?documentId=${encodeURIComponent(documentId)}`,
      );
    }
  };

  const handleLogout = () => {
    clearSelectedDocument();
    logoutMockUser();
    router.replace("/login");
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col bg-gradient-to-b from-blue-800 to-blue-900 border-r border-blue-900 text-blue-100">
      {/* LOGO - Beyaz kart içinde, kenarları yuvarlak */}
      <div className="mx-2 mt-8 flex items-center justify-center rounded-2xl bg-white px-4 py-6 shadow-sm">
        <div className="relative h-18 w-52 shrink-0">
          <Image
            src="/logos/360teşvikk.png"
            alt="Teşvik 360 logo"
            fill
            sizes="208px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* NAVİGASYON */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3 mt-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === "/documents"
              ? pathname === "/documents" || /^\/documents\/\d+$/.test(pathname)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const isDocumentDetailItem = documentContextPaths.has(item.href);

          const showDocumentSection =
            item.href === "/documents/investment-type";

          return (
            <div key={item.href}>
              {showDocumentSection && (
                <div className="mb-2 mt-4 border-t border-blue-700/70 pt-4">
                  <div className="px-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                      Belge Detayları
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-blue-200/80">
                      Detaylarını görüntülemek için belge seçin.
                    </p>
                  </div>

                  <select
                    value={selectedDocumentId}
                    onChange={handleDocumentChange}
                    disabled={documentsLoading || documents.length === 0}
                    className="mt-2.5 w-full rounded-lg border border-blue-700 bg-blue-900/60 px-3 py-2.5 text-xs font-semibold text-white outline-none transition focus:border-white/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {documentsLoading
                        ? "Belgeler yükleniyor..."
                        : documents.length === 0
                          ? "Açık belge bulunamadı"
                          : "Belge seçiniz"}
                    </option>

                    {documents.map((document) => (
                      <option
                        key={document.id}
                        value={String(document.id)}
                        className="text-slate-900"
                      >
                        {document.documentNumber ??
                          `Belge ${document.externalDocumentId}`}
                      </option>
                    ))}
                  </select>
                  {documentWarning && (
                    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      Önce belge seçimi yapınız.
                    </div>
                  )}
                </div>
              )}

              {isDocumentDetailItem && !selectedDocumentId ? (
                <button
                  type="button"
                  onClick={showDocumentWarning}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-blue-300/50 transition hover:bg-blue-800/30"
                  title="Önce bir belge seçiniz"
                >
                  <Icon size={18} className="text-blue-300/40" />
                  <span>{item.label}</span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={(event) => handleNavigation(event, item.href)}
                  className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                    active
                      ? "bg-gradient-to-r from-red-600 to-red-500 font-semibold text-white shadow-md shadow-red-600/30"
                      : "text-blue-100 font-medium hover:bg-blue-700/60 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-white"
                        : "text-blue-200 transition group-hover:text-white"
                    }
                  />

                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* KULLANICI / ÇIKIŞ */}
      <div className="border-t border-blue-900/60 p-3">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl bg-blue-900/40 p-2.5 text-left text-sm border border-blue-900/60 transition hover:bg-red-500/20 hover:border-red-500/50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white shadow-sm shadow-red-600/30">
            {userName?.charAt(0).toUpperCase() ?? "?"}
          </div>

          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-white group-hover:text-red-300 transition">
              {userName ?? "Kullanıcı"}
            </p>
            <p className="text-[11px] text-blue-200">Oturumu Kapat</p>
          </div>

          <LogOut
            size={16}
            className="shrink-0 text-blue-200 group-hover:text-red-300 transition"
          />
        </button>
      </div>
    </aside>
  );
}
