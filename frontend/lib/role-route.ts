// lib/role-route.ts
import type { UserRole } from "./mock-auth";

export function roleToRoutePrefix(role: UserRole): "admin" | "company" {
  return role === "ADMIN" ? "admin" : "company";
}