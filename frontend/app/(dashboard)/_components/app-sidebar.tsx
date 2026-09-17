"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Headphones, LogOut } from "lucide-react";

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
  status?: "OPEN" | "CLOSED" | "CANCELLED";
};

type DocumentsResponse = {
  success: boolean;
  data: {
    items: SidebarDocument[];
  };
};

type UnreadSupportRequestCountResponse = {
  success: boolean;
  data: {
    count: number;
  };
};

interface AppSidebarProps {
  role: UserRole;
  userName?: string;
  variant?: "desktop" | "mobile";
}

const SIDEBAR_COLLAPSE_KEY = "sidebar-collapsed";

export function AppSidebar({
  role,
  userName,
  variant = "desktop",
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState<SidebarDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentWarning, setDocumentWarning] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  // Mobil drawer'da daralt/genişlet mantığı devre dışı — drawer'ın kendi genişliği var,
  // içeride ayrıca daraltmak anlamsız. Sadece desktop varyantta `collapsed` görsel olarak
  // uygulanır. Böylece localStorage'daki tercih desktop'ta yaşarken drawer temiz kalır.
  const isCollapsed = variant === "desktop" && collapsed;

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

  // Daraltma tercihini yükle
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "true") setCollapsed(true);
    } catch {
      // localStorage erişilemiyorsa sessizce geç
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(next));
      } catch {
        // yoksay
      }
      return next;
    });
  };

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setDocumentsLoading(true);

        const [openResponse, closedResponse] = await Promise.all([
          apiFetch<DocumentsResponse>("/documents?limit=100"),
          apiFetch<DocumentsResponse>("/closed-documents?limit=100"),
        ]);

        const openItems = openResponse.data.items ?? [];
        const closedItems = closedResponse.data.items ?? [];

        const mergedItems = [...openItems, ...closedItems];

        const uniqueItems = Array.from(
          new Map(
            mergedItems.map((item) => [item.externalDocumentId, item]),
          ).values(),
        );

        const items = uniqueItems;

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

          setSelectedDocument(
            String(document.id),
            document.documentNumber,
            document.status ?? "OPEN",
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Belgeler yüklenemedi.";

        if (message.includes("yetki süresi dolmuştur")) {
          setDocuments([]);
          setSelectedDocumentId("");
          setDocumentWarning(false);
          clearSelectedDocument();
          return;
        }

        console.error("Sidebar belgeleri yüklenemedi:", error);
      } finally {
        setDocumentsLoading(false);
      }
    };

    void loadDocuments();
  }, [searchParams]);

  // Destek talebi okunmamış bildirim sayısı
  useEffect(() => {
    if (role !== "ADMIN" && role !== "OPERATION") {
      setSupportUnreadCount(0);
      return;
    }

    let active = true;

    const loadUnreadCount = async () => {
      try {
        const response = await apiFetch<UnreadSupportRequestCountResponse>(
          "/support-requests/unread-count",
        );

        if (active) {
          setSupportUnreadCount(response.data?.count ?? 0);
        }
      } catch (error) {
        console.error("Okunmamış destek talebi sayısı alınamadı:", error);
      }
    };

    // Sidebar ilk açıldığında sayıyı getir
    void loadUnreadCount();

    // Destek talebi okundu / okunmadı olduğunda anında yenile
    const handleUnreadChanged = () => {
      void loadUnreadCount();
    };

    window.addEventListener(
      "support-request-unread-changed",
      handleUnreadChanged,
    );

    // Kullanıcı sekmeye geri döndüğünde tekrar kontrol et
    window.addEventListener("focus", handleUnreadChanged);

    // Yeni talep geldiyse 15 saniyede bir kontrol et
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 15000);

    return () => {
      active = false;

      window.removeEventListener(
        "support-request-unread-changed",
        handleUnreadChanged,
      );

      window.removeEventListener("focus", handleUnreadChanged);

      window.clearInterval(intervalId);
    };
  }, [role]);

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

    setSelectedDocument(
      documentId,
      document.documentNumber,
      document.status ?? "OPEN",
    );

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

  const isSupportRequestsActive =
    pathname === "/support-requests" ||
    pathname.startsWith("/support-requests/");

  /*
    <aside> className mantığı:
    - variant === "mobile"  → Drawer içinde tam ekran (header'daki Sheet'e sığar).
                              Border, sticky, hidden yok — sadece flex + gradient.
    - variant === "desktop" → 1024px altında GİZLİ (hidden lg:flex).
                              1024px ve üzerinde sticky, w-64 (açık) veya w-20 (kapalı).
                              overflow-visible çünkü daralt/genişlet butonu sağa taşıyor.
  */
  const asideClassName =
    variant === "mobile"
      ? "flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-blue-800 to-blue-900 text-blue-100"
      : `sticky top-0 hidden h-screen ${
          isCollapsed ? "w-20" : "w-64"
        } shrink-0 flex-col overflow-visible border-r border-blue-900 bg-gradient-to-b from-blue-800 to-blue-900 text-blue-100 transition-all duration-200 lg:flex`;

  return (
    <aside className={asideClassName}>
      {/* DARALTMA BUTONU - sadece desktop varyantta (mobil drawer'da anlamsız) */}
      {variant === "desktop" && (
        <button
          type="button"
          onClick={toggleCollapsed}
          title={isCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-blue-900 bg-white text-blue-900 shadow-md transition hover:bg-blue-50"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* LOGO - Beyaz kart içinde, kenarları yuvarlak */}
      <div
        className={`mx-2 mt-6 flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200 ${
          isCollapsed ? "px-2 py-2" : "px-3 py-3"
        }`}
      >
        <div
          className={`relative shrink-0 transition-all duration-200 ${
            isCollapsed ? "h-10 w-10" : "h-24 w-60"
          }`}
        >
          <Image
            src="/logos/2.png"
            alt="Teşvik 360 logo"
            fill
            sizes={isCollapsed ? "40px" : "240px"}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* NAVİGASYON */}
      <nav className="mt-2 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden p-3 [scrollbar-color:rgba(147,197,253,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-300/40 hover:[&::-webkit-scrollbar-thumb]:bg-blue-200/60">
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
            <div key={`${item.label}-${item.href}`}>
              {showDocumentSection && !isCollapsed && (
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
                          ? "Belge bulunamadı"
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

                        {document.status === "CLOSED"
                          ? " - Kapalı"
                          : document.status === "CANCELLED"
                            ? " - İptal"
                            : ""}
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

              {showDocumentSection && isCollapsed && (
                <div className="mb-2 mt-4 border-t border-blue-700/70 pt-4" />
              )}

              {isDocumentDetailItem && !selectedDocumentId ? (
                <button
                  type="button"
                  onClick={showDocumentWarning}
                  title="Önce bir belge seçiniz"
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-blue-300/50 transition hover:bg-blue-800/30 ${
                    isCollapsed ? "justify-center" : ""
                  }`}
                >
                  <Icon size={18} className="shrink-0 text-blue-300/40" />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={(event) => handleNavigation(event, item.href)}
                  title={isCollapsed ? item.label : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 ${
                    isCollapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-gradient-to-r from-red-600 to-red-500 font-semibold text-white shadow-md shadow-red-600/30"
                      : "font-medium text-blue-100 hover:bg-blue-700/60 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 ${
                      active
                        ? "text-white"
                        : "text-blue-200 transition group-hover:text-white"
                    }`}
                  />

                  {!isCollapsed && <span>{item.label}</span>}

                  {active && !isCollapsed && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* DESTEK TALEPLERİ - SABİT ALT MENÜ */}
      {(role === "COMPANY" || role === "OPERATION" || role === "ADMIN") && (
        <div className="shrink-0 border-t border-blue-700/60 px-3 pt-3">
          {(() => {
            const canSeeBadge = role === "ADMIN" || role === "OPERATION";
            const hasUnread = canSeeBadge && supportUnreadCount > 0;
            const shouldAnimate = hasUnread && !isSupportRequestsActive;

            return (
              <Link
                href="/support-requests"
                title={
                  isCollapsed
                    ? role === "COMPANY"
                      ? "Destek Talebi"
                      : "Destek Talepleri"
                    : undefined
                }
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-150 ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isSupportRequestsActive
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md shadow-red-600/30"
                    : "bg-blue-900/35 text-blue-100 hover:bg-blue-700/60 hover:text-white"
                }`}
              >
                <Headphones
                  size={19}
                  className={`shrink-0 ${
                    isSupportRequestsActive
                      ? "text-white"
                      : "text-blue-200 transition group-hover:text-white"
                  } ${shouldAnimate ? "animate-ring-shake" : ""}`}
                />

                {!isCollapsed && (
                  <span>
                    {role === "COMPANY" ? "Destek Talebi" : "Destek Talepleri"}
                  </span>
                )}

                {!isCollapsed && (
                  <div className="ml-auto flex items-center gap-2">
                    {hasUnread && (
                      <span
                        className={`flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isSupportRequestsActive
                            ? "bg-white text-red-600"
                            : "bg-red-500 text-white"
                        } ${shouldAnimate ? "animate-badge-bounce" : ""}`}
                      >
                        {supportUnreadCount > 99 ? "99+" : supportUnreadCount}
                      </span>
                    )}

                    {isSupportRequestsActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                    )}
                  </div>
                )}

                {isCollapsed && hasUnread && (
                  <span
                    className={`absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-bold ${
                      isSupportRequestsActive
                        ? "bg-white text-red-600"
                        : "bg-red-500 text-white"
                    } ${shouldAnimate ? "animate-badge-bounce" : ""}`}
                  >
                    {supportUnreadCount > 9 ? "9+" : supportUnreadCount}
                  </span>
                )}
              </Link>
            );
          })()}
        </div>
      )}

      {/* KULLANICI / ÇIKIŞ */}
      <div className="shrink-0 border-t border-blue-900/60 p-3">
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Oturumu Kapat" : undefined}
          className={`group flex w-full items-center gap-3 rounded-xl border border-blue-900/60 bg-blue-900/40 p-2.5 text-left text-sm transition hover:border-red-500/50 hover:bg-red-500/20 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white shadow-sm shadow-red-600/30">
            {userName?.charAt(0).toUpperCase() ?? "?"}
          </div>

          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white transition group-hover:text-red-300">
                  {userName ?? "Kullanıcı"}
                </p>
                <p className="text-[11px] text-blue-200">Oturumu Kapat</p>
              </div>

              <LogOut
                size={16}
                className="shrink-0 text-blue-200 transition group-hover:text-red-300"
              />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
