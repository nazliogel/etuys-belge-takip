import type { UserRoleValue } from "../utils/user-role.js";

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRoleValue;
};

export type LoginInput = {
  identifier: string;
  password: string;
};

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  username: string | null;
  email: string | null;
  role: UserRoleValue;
  companyId: number | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export type AuthProfileResponse = {
  user: AuthUser;
};
