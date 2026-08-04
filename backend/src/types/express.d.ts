import type { UserRoleValue } from "../utils/user-role.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        role: UserRoleValue;
      };
    }
  }
}
export {};
