"use client";

import { useEffect, useRef, useState } from "react";

import RouteGuard from "@/components/auth/route-guard";
import { getSessionUser } from "@/lib/mock-auth";
import { DocumentsScreen } from "../_components/screens/documents-screen";
import { DocumentDetailScreen } from "../_components/screens/document-detail-screen";
export default function DocumentsPage() {
  const user = getSessionUser();
  const variant = user?.role === "ADMIN" ? "admin" : "company";

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );

  const detailRef = useRef<HTMLDivElement>(null);

  function handleSelectDocument(documentId: string) {
    console.log("handleSelectDocument çalıştı:", documentId);

    setSelectedDocumentId((current) => {
      const nextValue = current === documentId ? null : documentId;

      console.log("Eski değer:", current);
      console.log("Yeni değer:", nextValue);

      return nextValue;
    });
  }

  useEffect(() => {
    console.log("selectedDocumentId değişti:", selectedDocumentId);

    if (!selectedDocumentId) return;

    const timeoutId = window.setTimeout(() => {
      console.log("Detay elementi:", detailRef.current);

      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [selectedDocumentId]);

  return (
    <RouteGuard>
      <div className="space-y-6">
        <DocumentsScreen
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={handleSelectDocument}
          variant={variant}
        />

        {selectedDocumentId && (
          <div
            ref={detailRef}
            className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <DocumentDetailScreen
              documentId={selectedDocumentId}
              variant={variant}
            />
          </div>
        )}
      </div>
    </RouteGuard>
  );
}
