"use client";

import RouteGuard from "@/components/auth/route-guard";
import { getSessionUser } from "@/lib/mock-auth";

import { DocumentsScreen } from "../_components/screens/documents-screen";

export default function DocumentsPage() {
  const user = getSessionUser();

  const variant = user?.role === "ADMIN" ? "admin" : "company";

  return (
    <RouteGuard>
      <DocumentsScreen variant={variant} />
    </RouteGuard>
  );
}
