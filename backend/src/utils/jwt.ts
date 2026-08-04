import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";
import { isUserRoleValue, type UserRoleValue } from "./user-role.js";

type AccessTokenPayload = {
  sub: number;
  role: UserRoleValue;
};

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, env.jwtSecret);

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.sub !== "number" ||
    typeof payload.role !== "string" ||
    !isUserRoleValue(payload.role)
  ) {
    throw new Error("Invalid access token payload.");
  }

  return {
    sub: payload.sub,
    role: payload.role,
  };
};
