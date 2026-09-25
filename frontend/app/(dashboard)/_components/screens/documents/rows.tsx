"use client";

// Belge listesinin satırları (mobil kart + masaüstü tablo) ve açık belge sekmeleri.
// Bu bileşenler sadece gösterir; veri ve tıklama davranışı ana ekrandan gelir.

import { ChevronRight, FileText, X } from "lucide-react";
import type { RefObject } from "react";
import { AdminDocumentDetailScreen } from "../admin-document-detail-screen";
import { DocumentDetailScreen } from "../document-detail-screen";
import { AuthorizationStatusBadge, StatusBadge } from "./components";
import { formatDate } from "./lib";
import type {
  ApiDocument,
  AuthorizationRequiredCompany,
  OpenDocumentTab,
} from "./types";

/* ---------- Yetkilendirme yapılacak firmalar ---------- */

// Mobil görünümde tek firma kartı
export function AuthorizationCompanyCard({
  company,
  onOpen,
}: {
  company: AuthorizationRequiredCompany;
  onOpen: () => void;
}) {
  return (
    <li className="px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {company.name}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Firma ID: {company.externalCompanyId} • VKN:{" "}
            {company.taxNumber || "-"}
          </p>
        </div>
        <AuthorizationStatusBadge
          status={company.authorizationStatus}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Uzman
          </p>
          <p className="mt-0.5 truncate font-medium text-foreground/80">
            {company.consultant ?? "-"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Yetki Bitiş
          </p>
          <p className="mt-0.5 font-medium text-foreground/80">
            {formatDate(company.authorizationEndDate)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex justify-end">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground/80 transition hover:bg-red-600 hover:text-white"
        >
          Firma Detayı
          <ChevronRight size={12} />
        </button>
      </div>
    </li>
  );
}

// Masaüstü tabloda tek firma satırı
export function AuthorizationCompanyRow({
  company,
  onOpen,
}: {
  company: AuthorizationRequiredCompany;
  onOpen: () => void;
}) {
  return (
    <tr
      className="transition-colors hover:bg-muted/60"
    >
      <td className="px-3 py-2 text-center text-xs font-semibold text-foreground/80">
        {company.externalCompanyId}
      </td>
      <td className="max-w-xs px-3 py-2">
        <p
          title={company.name}
          className="truncate text-xs font-semibold text-foreground"
        >
          {company.name}
        </p>
      </td>
      <td className="px-3 py-2 text-center text-xs text-muted-foreground">
        {company.taxNumber || "-"}
      </td>
      <td className="px-3 py-2 text-center">
        <p
          title={company.consultant ?? undefined}
          className="truncate text-xs font-semibold text-foreground/80"
        >
          {company.consultant ?? "-"}
        </p>
      </td>
      <td className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
        {formatDate(company.authorizationEndDate)}
      </td>
      <td className="px-3 py-2 text-center">
        <AuthorizationStatusBadge
          status={company.authorizationStatus}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex whitespace-nowrap items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-foreground/80 transition hover:bg-red-600 hover:text-white"
        >
          Firma Detayı
          <ChevronRight size={14} />
        </button>
      </td>
    </tr>
  );
}

/* ---------- Belgeler ---------- */

type DocumentItemProps = {
  doc: ApiDocument;
  badgeStatus: string;
  isSelected: boolean;
  onOpen: () => void;
};

// Mobil görünümde tek belge kartı. Firma detayında firma bilgisi gizlenir.
export function DocumentCard({
  doc,
  badgeStatus,
  isSelected,
  showCompany,
  onOpen,
}: DocumentItemProps & { showCompany: boolean }) {
  return (
    <li
      className={
        isSelected ? "bg-red-500/5 dark:bg-red-500/10" : ""
      }
    >
      <button
        type="button"
        onClick={onOpen}
        className="w-full px-3 py-3 text-left transition active:bg-muted"
      >
        <div className="flex items-center gap-1.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              isSelected
                ? "border-red-600 bg-red-600 text-white"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <FileText size={16} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {doc.documentNumber ?? "-"}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              ID: {doc.externalDocumentId}
            </p>
          </div>

          <StatusBadge status={badgeStatus} />
        </div>

        {showCompany && doc.company && (
          <div className="mt-2 rounded-lg bg-muted/60 px-2 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Firma
            </p>
            <p className="truncate text-xs font-semibold text-foreground">
              {doc.company.name}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              VKN: {doc.company.taxNumber ?? "-"}
              {doc.company.consultant && (
                <>
                  {" • "}
                  Uzman:{" "}
                  <span className="font-semibold text-foreground/80">
                    {doc.company.consultant}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Başlangıç
            </p>
            <p className="font-medium text-foreground/80">
              {formatDate(doc.documentStartDate)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Bitiş
            </p>
            <p className="font-medium text-foreground/80">
              {formatDate(doc.documentEndDate)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Süre Uzatım
            </p>
            <p className="font-medium text-foreground/80">
              {formatDate(doc.extensionDate)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Yetki Bitiş
            </p>
            <p className="font-medium text-foreground/80">
              {formatDate(
                doc.company?.authorizationEndDate ?? null,
              )}
            </p>
          </div>
          {doc.supportClass && (
            <div className="col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Destek Sınıfı
              </p>
              <p className="truncate font-medium text-foreground/80">
                {doc.supportClass}
              </p>
            </div>
          )}
        </div>

        <div className="mt-2.5 flex justify-end">
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
              isSelected
                ? "bg-red-600 text-white"
                : "bg-muted text-foreground/80"
            }`}
          >
            {isSelected ? (
              "Görüntüleniyor"
            ) : (
              <>
                Görüntüle
                <ChevronRight size={12} />
              </>
            )}
          </span>
        </div>
      </button>
    </li>
  );
}

// Masaüstü tabloda tek belge satırı
export function DocumentRow({
  doc,
  badgeStatus,
  isSelected,
  onOpen,
}: DocumentItemProps) {
  return (
    <tr
      className={`transition-colors ${
        isSelected
          ? "bg-red-500/5 dark:bg-red-500/10"
          : "hover:bg-muted/60"
      }`}
    >
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              isSelected
                ? "border-red-600 bg-red-600 text-white"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {doc.documentNumber ?? "-"}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              ID: {doc.externalDocumentId}
            </p>
          </div>
        </div>
      </td>

      {/* Firma */}
      <td className="max-w-xs px-2 py-1.5">
        <p
          title={
            doc.company?.name ?? "Firma bilgisi bulunamadı"
          }
          className="truncate text-xs font-semibold text-foreground"
        >
          {doc.company?.name ?? "Firma bilgisi bulunamadı"}
        </p>
        <p className="mt-1 text-left text-[11px] text-muted-foreground">
          VKN: {doc.company?.taxNumber ?? "-"}
        </p>
      </td>

      {/* Uzman */}
      <td className="px-2 py-1.5 text-center">
        <p
          title={doc.company?.consultant ?? undefined}
          className="truncate text-xs font-semibold text-foreground/80"
        >
          {doc.company?.consultant ?? "-"}
        </p>
      </td>

      <td className="hidden whitespace-nowrap px-2 py-1.5 text-center text-xs font-medium text-muted-foreground xl:table-cell">
        {formatDate(doc.documentStartDate)}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
        {formatDate(doc.documentEndDate)}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
        {formatDate(doc.extensionDate)}
      </td>

      {/* Yetki Bitiş */}
      <td className="hidden whitespace-nowrap px-2 py-1.5 text-center text-xs font-medium text-muted-foreground xl:table-cell">
        {formatDate(
          doc.company?.authorizationEndDate ?? null,
        )}
      </td>

      <td className="px-2 py-1.5 text-center">
        <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
          {doc.supportClass ?? "-"}
        </span>
      </td>

      {/* Durum */}
      <td className="px-2 py-1.5 text-center">
        <StatusBadge status={badgeStatus} />
      </td>

      <td className="px-2 py-1.5 text-center">
        <div className="flex items-center justify-center px-1">
          <button
            type="button"
            onClick={onOpen}
            className={`inline-flex whitespace-nowrap items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
              isSelected
                ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                : "bg-muted text-foreground/80 hover:bg-muted/80"
            }`}
          >
            {isSelected ? (
              "Görüntüleniyor"
            ) : (
              <>
                Görüntüle
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ---------- Açık belge sekmeleri + detay ---------- */

export function DocumentTabsPanel({
  tabs,
  activeKey,
  variant,
  sectionRef,
  onActivate,
  onClose,
}: {
  tabs: OpenDocumentTab[];
  activeKey: string | null;
  variant: "admin" | "company";
  sectionRef: RefObject<HTMLDivElement | null>;
  onActivate: (key: string) => void;
  onClose: (key: string) => void;
}) {
  return (
    <section
      ref={sectionRef}
      className="scroll-mt-16 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:scroll-mt-24 sm:rounded-2xl"
    >
      {/* BELGE TABLARI */}
      <div className="flex gap-1 overflow-x-auto border-b border-border bg-muted/60 px-2 pt-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-2.5">
        {tabs.map((document) => {
          const isActive = activeKey === document.key;

          const label = document.documentNumber
            ? `${document.documentNumber} No'lu Belge`
            : `Belge #${document.id}`;

          return (
            <div
              key={document.key}
              className={`flex shrink-0 items-center rounded-t-xl border border-b-0 ${
                isActive
                  ? "border-border bg-card font-semibold text-red-600 dark:text-red-400"
                  : "border-transparent bg-muted text-muted-foreground"
              }`}
            >
              <button
                type="button"
                onClick={() => onActivate(document.key)}
                className="max-w-56 truncate px-2.5 py-1.5 text-xs"
              >
                {label}
              </button>

              <button
                type="button"
                onClick={() => onClose(document.key)}
                aria-label="Sekmeyi kapat"
                className="mr-1 rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 sm:p-1"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/*
        SEÇİLİ BELGENİN DETAYI
        Açık tüm tab'lar burada aynı anda mount edilir; sadece aktif olan
        görünür, diğerleri CSS ile gizlenir. Böylece tab değiştirirken
        DocumentDetailScreen yeniden mount olup veriyi baştan çekmiyor
        (tekrar "yükleniyor" durumuna düşüp içeriğin anlık kaybolması /
        geri gelmesi - flicker - önlenmiş oluyor).
      */}
      <div className="min-w-0 p-2 sm:p-3">
        {tabs.map((document) => (
          <div
            key={document.key}
            className={
              document.key === activeKey ? "block" : "hidden"
            }
          >
            {variant === "admin" ? (
              <AdminDocumentDetailScreen
                documentId={document.id}
                isClosed={document.isClosed}
              />
            ) : (
              <DocumentDetailScreen
                documentId={document.id}
                variant={variant}
                isClosed={document.isClosed}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}