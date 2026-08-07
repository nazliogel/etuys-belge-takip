export type UserRole = "ADMIN" | "COMPANY";

export type Permission =
  | "dashboard:view"
  | "companies:view"
  | "documents:view"
  | "documents:view-all"
  | "documents:update"
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

  COMPANY: [
    "documents:view",
    "notifications:view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
