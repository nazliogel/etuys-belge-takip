import type { UserRoleValue } from "../utils/user-role.js";

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRoleValue;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRoleValue;
  isActive: boolean;
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
