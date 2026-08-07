import RouteGuard from "@/components/auth/route-guard";
import { CompaniesScreen } from "../_components/screens/companies-screen";

export default function CompaniesPage() {
  return (
    <RouteGuard allowedRole={["ADMIN", "COMPANY"]}>
      <CompaniesScreen />
    </RouteGuard>
  );
}
