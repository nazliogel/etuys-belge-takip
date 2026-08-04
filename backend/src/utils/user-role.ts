import type { UserRole } from "../generated/prisma/client.js";

export const USER_ROLE_VALUES = ["ADMIN", "COMPANY"] as const;

export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];

export function isUserRoleValue(value: string): value is UserRoleValue {
  return USER_ROLE_VALUES.includes(value as UserRoleValue);
}

export function fromPrismaUserRole(role: UserRole): UserRoleValue {
  return role;
}

export function toPrismaUserRole(role: UserRoleValue): UserRole {
  return role;
}
