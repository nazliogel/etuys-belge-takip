import type { User } from "../generated/prisma/client.js";

import type { AuthUser } from "../types/auth.js";
import { fromPrismaUserRole } from "./user-role.js";

export const serializeAuthUser = (user: User): AuthUser => {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: fromPrismaUserRole(user.role),
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};
