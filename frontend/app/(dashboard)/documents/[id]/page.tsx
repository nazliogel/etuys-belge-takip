import RouteGuard from "@/components/auth/route-guard";
import { DocumentDetailScreen } from "../../_components/screens/document-detail-screen";

interface DocumentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { id } = await params;

  return (
    <RouteGuard>
      <DocumentDetailScreen documentId={id} />
    </RouteGuard>
  );
}