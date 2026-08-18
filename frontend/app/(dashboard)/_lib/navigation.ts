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
    permission: "companies:view",
  },
] satisfies Array<{
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}>;
