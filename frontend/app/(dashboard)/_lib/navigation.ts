import {
  Archive,
  Bell,
  Building2,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Users,
} from "lucide-react";

import type { Permission } from "./permissions";

export const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard:view",
  },
  {
    label: "Firmalar",
    href: "/companies",
    icon: Building2,
    permission: "companies:view",
  },
  {
    label: "Belgeler",
    href: "/documents",
    icon: FileText,
    permission: "documents:view-all",
  },
  {
    label: "Açık Durumdaki Belgeler",
    href: "/documents",
    icon: FileText,
    permission: "documents:view",
  },
  {
    label: "Kapalı Durumdaki Belgeler",
    href: "/documents/archive",
    icon: Archive,
    permission: "documents:view",
  },
  {
    label: "Yatırım Cinsi",
    href: "/document-details/investment-type",
    icon: FileText,
    permission: "documents:view",
  },
  {
    label: "Ürün Bilgileri",
    href: "/document-details/products",
    icon: FileText,
    permission: "documents:view",
  },
  {
    label: "Destek Unsurları",
    href: "/document-details/supports",
    icon: FileText,
    permission: "documents:view",
  },
  {
    label: "Finansal Bilgiler",
    href: "/document-details/financial",
    icon: FileText,
    permission: "documents:view",
  },
  {
    label: "Yerli Liste",
    href: "/document-details/domestic-machines",
    icon: FileText,
    permission: "documents:view",
  },
  {
    label: "İthal Liste",
    href: "/document-details/imported-machines",
    icon: FileText,
    permission: "documents:view",
  },
  {
    label: "Özel Şartlar",
    href: "/document-details/special-conditions",
    icon: FileText,
    permission: "documents:view",
  },
  {
    label: "Excel Yükleme",
    href: "/excel-import",
    icon: FileSpreadsheet,
    permission: "imports:manage",
  },
  {
    label: "Bildirimler",
    href: "/notifications",
    icon: Bell,
    permission: "notifications:view",
  },
  {
    label: "Kullanıcı Yönetimi",
    href: "/users",
    icon: Users,
    permission: "users:manage",
  },
] satisfies Array<{
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}>;
