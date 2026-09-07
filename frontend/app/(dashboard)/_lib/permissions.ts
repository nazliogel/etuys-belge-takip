export type UserRole = "ADMIN" | "OPERATION" | "COMPANY";

export type Permission =
  | "dashboard:view"
  | "companies:view"
  | "documents:view"
  | "documents:view-all"
  | "documents:update"
  | "company-documents:view"
  | "document-details:view"
  | "imports:manage"
  | "notifications:view"
  | "users:manage"
  | "settings:manage";

const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    "dashboard:view",
    "companies:view",
    "documents:view-all",
    "documents:update",
    "imports:manage",
    "notifications:view",
    "users:manage",
    "settings:manage",
  ],

  OPERATION: [
    "dashboard:view",
    "companies:view",
    "documents:view",
    "documents:view-all",
    "documents:update",
    "imports:manage",
    "notifications:view",
    "users:manage",
  ],

  COMPANY: [
    "documents:view",
    "company-documents:view",
    "document-details:view",
    "notifications:view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
