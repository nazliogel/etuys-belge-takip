// Belgeler ekranının veri katmanı: yetki kontrolü, belge listesi ve kart sayıları.
// Ekrandaki filtre/sıralama/sekme gibi görsel durumlar burada değil, ana ekranda.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  calculateDocumentStatus,
  fetchAllClosedDocuments,
  fetchAllDocuments,
  hasValidAuthorization,
} from "./lib";
import type {
  ApiDocument,
  AuthMeResponse,
  AuthorizationRequiredCompany,
  AuthorizationRequiredResponse,
  BackendDisplayStatus,
  ClosedApiDocument,
  ClosedDocumentListResponse,
  CompanyDetailResponse,
  DocumentListResponse,
  DocumentStatus,
  ExtensionEligibleResponse,
} from "./types";

export type UseDocumentsDataParams = {
  companyId?: string;
  variant: "admin" | "company";
  currentPage: number;
  status: DocumentStatus | undefined;
  debouncedSearch: string;
  isExtensionEligibleView: boolean;
  isClosureEligibleView: boolean;
  isAuthorizationRequiredView: boolean;
};

export function useDocumentsData({
  companyId,
  variant,
  currentPage,
  status,
  debouncedSearch,
  isExtensionEligibleView,
  isClosureEligibleView,
  isAuthorizationRequiredView,
}: UseDocumentsDataParams) {
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    inactive: 0,
  });
  const [closedDocumentCount, setClosedDocumentCount] = useState(0);
  const [extensionEligibleCount, setExtensionEligibleCount] = useState(0);
  const [closureEligibleCount, setClosureEligibleCount] = useState(0);
  const [authorizationRequiredCount, setAuthorizationRequiredCount] =
    useState(0);
  const [authorizationRequiredCompanies, setAuthorizationRequiredCompanies] =
    useState<AuthorizationRequiredCompany[]>([]);

  // Firma detayında "Süre Uzatma" / "Kapatma Yapılacaklar" kartları için
  const [companyExtensionEligibleIds, setCompanyExtensionEligibleIds] =
    useState<Set<number>>(new Set());
  const [companyClosureEligibleIds, setCompanyClosureEligibleIds] =
    useState<Set<number>>(new Set());

  const [authorizationEndDate, setAuthorizationEndDate] = useState<string | null>(null);
  const [isAuthorizationLoading, setIsAuthorizationLoading] = useState(
    variant === "company",
  );

  // Effect'in bağımlılığı tarih metni değil bu boolean olmalı.
  // Aksi halde firma detayında tarih set edilince tüm istekler ikinci kez gidiyor.
  const authorizationAllowsFetch =
    variant !== "company" ||
    Boolean(companyId) ||
    hasValidAuthorization(authorizationEndDate);

  useEffect(() => {
    async function loadCompanyAuthorization() {
      if (variant !== "company" || companyId) {
        setIsAuthorizationLoading(false);
        return;
      }

      setIsAuthorizationLoading(true);

      try {
        const authResponse = await apiFetch<AuthMeResponse>("/auth/me");
        const userCompanyId = authResponse.user.companyId;

        if (!userCompanyId) {
          setAuthorizationEndDate(null);
          return;
        }

        const companyResponse = await apiFetch<CompanyDetailResponse>(
          `/companies/${userCompanyId}`,
        );

        setAuthorizationEndDate(
          companyResponse.data.authorizationEndDate ?? null,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Yetkilendirme bilgisi alınamadı.";

        if (message.includes("yetki süresi dolmuştur")) {
          setAuthorizationEndDate(null);
          return;
        }

        console.error("Firma yetkilendirmesi alınamadı:", error);
        setAuthorizationEndDate(null);
      } finally {
        setIsAuthorizationLoading(false);
      }
    }

    void loadCompanyAuthorization();
  }, [companyId, variant]);

  useEffect(() => {
    async function loadDocuments() {
      // Firma yetkisi kontrol edilirken belge isteği gönderme.
      if (variant === "company" && !companyId && isAuthorizationLoading) {
        return;
      }

      setIsLoading(true);
      setLoadError("");

      if (!authorizationAllowsFetch) {
        // Açık belge sekmeleri ana ekranda ayrıca temizleniyor.
        setDocuments([]);
        setSummary({
          total: 0,
          active: 0,
          expiring: 0,
          expired: 0,
          inactive: 0,
        });
        setClosedDocumentCount(0);
        setExtensionEligibleCount(0);
        setClosureEligibleCount(0);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      try {
        if (companyId) {
          const companyDocumentParams = new URLSearchParams({
            companyId,
            isActive: "all",
            limit: "1000",
          });

          const [companyResponse, documentsResponse, allClosedDocuments] =
            await Promise.all([
              apiFetch<CompanyDetailResponse>(`/companies/${companyId}`),
              apiFetch<DocumentListResponse>(
                `/documents?${companyDocumentParams.toString()}`,
              ),
              fetchAllClosedDocuments(new URLSearchParams({ companyId })),
            ]);

          const company = companyResponse.data;
          setAuthorizationEndDate(company.authorizationEndDate ?? null);

          const openDocuments: ApiDocument[] = documentsResponse.data.items.map(
            (document) =>
              document.status === "EXPIRING"
                ? { ...document, status: "ACTIVE" as DocumentStatus }
                : document,
          );

          const companyClosedDocuments: ApiDocument[] = allClosedDocuments
            .filter((document) => document.company?.id === company.id)
            .map((document) => ({
              ...document,
              isActive: false,
              status: "INACTIVE" as DocumentStatus,
              documentStatus: document.status,
            }));

          const documentsByExternalId = new Map<number, ApiDocument>();
          openDocuments.forEach((d) =>
            documentsByExternalId.set(d.externalDocumentId, d),
          );
          companyClosedDocuments.forEach((d) =>
            documentsByExternalId.set(d.externalDocumentId, d),
          );
          const mappedDocuments = Array.from(documentsByExternalId.values());

          const idsWithStatus = (target: BackendDisplayStatus) =>
            new Set(
              mappedDocuments
                .filter((d) => d.displayStatus === target)
                .map((d) => d.id),
            );
          const countWithStatus = (target: BackendDisplayStatus) =>
            mappedDocuments.filter((d) => d.displayStatus === target).length;

          const extensionIds = idsWithStatus("EXTENSION_ELIGIBLE");
          const closureIds = idsWithStatus("CLOSURE_ELIGIBLE");

          setDocuments(mappedDocuments);
          setCompanyExtensionEligibleIds(extensionIds);
          setCompanyClosureEligibleIds(closureIds);
          setExtensionEligibleCount(extensionIds.size);
          setClosureEligibleCount(closureIds.size);

          setSummary({
            total: mappedDocuments.length,
            active: countWithStatus("ACTIVE"),
            expiring: countWithStatus("EXPIRING"),
            expired: countWithStatus("EXPIRED"),
            inactive: mappedDocuments.filter((d) => d.status === "INACTIVE")
              .length,
          });

          setClosedDocumentCount(
            mappedDocuments.filter((d) => d.status === "INACTIVE").length,
          );
          setTotalPages(1);
          return;
        }

        const params = new URLSearchParams({
          page: String(currentPage),
          limit: "20",
        });

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }

        const normalizedSearch = debouncedSearch.toLocaleLowerCase("tr-TR");
        const matchesSearch = (document: ApiDocument) =>
          !normalizedSearch ||
          [
            document.documentNumber,
            document.company?.name,
            document.company?.taxNumber,
          ].some((value) =>
            value?.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
          );

        // Kart sayıları: summary artık uzatma/kapatma sayılarını da içeriyor.
        const loadCounts = (includeAuthorization: boolean) =>
          Promise.all([
            apiFetch<DocumentListResponse>("/documents?page=1&limit=1"),
            apiFetch<ClosedDocumentListResponse>(
              "/closed-documents?page=1&limit=1",
            ),
            includeAuthorization
              ? apiFetch<AuthorizationRequiredResponse>(
                  "/companies/authorization-required",
                )
              : Promise.resolve<AuthorizationRequiredResponse>({
                  success: true,
                  message: "",
                  data: { items: [], totalCount: 0 },
                }),
          ]);

        const applyCounts = ([
          summaryResponse,
          closedResponse,
          authorizationResponse,
        ]: Awaited<ReturnType<typeof loadCounts>>) => {
          const nextSummary = summaryResponse.data.summary;

          setSummary(nextSummary);
          setExtensionEligibleCount(nextSummary.extensionEligible ?? 0);
          setClosureEligibleCount(nextSummary.closureEligible ?? 0);
          setClosedDocumentCount(closedResponse.data.totalCount);
          setAuthorizationRequiredCount(authorizationResponse.data.totalCount);
          setAuthorizationRequiredCompanies(authorizationResponse.data.items);
        };

        if (isAuthorizationRequiredView) {
          applyCounts(await loadCounts(true));
          setDocuments([]);
          setTotalPages(1);
          return;
        }

        if (isExtensionEligibleView || isClosureEligibleView) {
          const endpoint = isExtensionEligibleView
            ? "/documents/extension-eligible"
            : "/documents/closure-eligible";

          const [listResponse, counts] = await Promise.all([
            apiFetch<ExtensionEligibleResponse>(endpoint),
            loadCounts(true),
          ]);

          applyCounts(counts);
          setDocuments(
            listResponse.data.items.filter(matchesSearch).map((document) => ({
              ...document,
              status: calculateDocumentStatus(document),
            })),
          );
          setTotalPages(1);
          return;
        }

        if (status === "INACTIVE") {
          const [allClosedDocuments, counts] = await Promise.all([
            fetchAllClosedDocuments(params),
            loadCounts(true),
          ]);

          applyCounts(counts);
          setDocuments(
            allClosedDocuments.map((document) => ({
              ...document,
              isActive: false,
              status: "INACTIVE" as DocumentStatus,
              documentStatus: document.status,
            })),
          );
          return;
        }

        /*
         * Aktif, süresi yaklaşan ve süresi dolmuş belgeler
         * normal documents endpointinden geliyor.
         */
        if (status) {
          params.set("status", status);
        }

        const isTotalView = !status;
        const searchOnlyParams = new URLSearchParams(
          debouncedSearch ? { search: debouncedSearch } : {},
        );

        const [documentsData, allClosedDocuments, counts] = await Promise.all([
          isTotalView
            ? fetchAllDocuments(searchOnlyParams).then((result) => ({
                items: result.items,
                totalPages: 1,
              }))
            : apiFetch<DocumentListResponse>(
                `/documents?${params.toString()}`,
              ).then((response) => ({
                items: response.data.items,
                totalPages: response.data.totalPages,
              })),
          isTotalView && variant === "admin"
            ? fetchAllClosedDocuments(searchOnlyParams)
            : Promise.resolve<ClosedApiDocument[]>([]),
          loadCounts(variant === "admin"),
        ]);

        applyCounts(counts);

        const openItems = documentsData.items.map((document) =>
          document.status === "EXPIRING"
            ? { ...document, status: "ACTIVE" as DocumentStatus }
            : document,
        );

        if (isTotalView) {
          const closedItems: ApiDocument[] = allClosedDocuments.map(
            (document) => ({
              ...document,
              isActive: false,
              status: "INACTIVE" as DocumentStatus,
              documentStatus: document.status,
            }),
          );

          const byExternalId = new Map<number, ApiDocument>();
          openItems.forEach((d) => byExternalId.set(d.externalDocumentId, d));
          closedItems.forEach((d) => byExternalId.set(d.externalDocumentId, d));

          setDocuments(Array.from(byExternalId.values()));
          setTotalPages(1);
        } else {
          setDocuments(openItems);
          setTotalPages(documentsData.totalPages);
        }
      } catch (error) {
        setDocuments([]);
        setLoadError(
          error instanceof Error ? error.message : "Belgeler yüklenemedi.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDocuments();
  }, [
    companyId,
    currentPage,
    status,
    debouncedSearch,
    isExtensionEligibleView,
    isClosureEligibleView,
    isAuthorizationRequiredView,
    variant,
    authorizationAllowsFetch,
    isAuthorizationLoading,
  ]);

  return {
    documents,
    totalPages,
    isLoading,
    loadError,
    summary,
    closedDocumentCount,
    extensionEligibleCount,
    closureEligibleCount,
    authorizationRequiredCount,
    authorizationRequiredCompanies,
    companyExtensionEligibleIds,
    companyClosureEligibleIds,
    authorizationEndDate,
    isAuthorizationLoading,
    authorizationAllowsFetch,
  };
}