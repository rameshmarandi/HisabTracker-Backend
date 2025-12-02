import { ENV } from "./utils/env.js";

export const DB_NAME = "HisabTracker";

export const ENABLE_ENCRYPTION =
  ENV.NODE_ENV === "production" ? true : ENV.ENABLE_ENCRYPTION === "true";

// Don't change any thing on the user roles and admin roles, they are used in many places.

export const USER_ROLES = {
  SKILLED_WORKER: "skilledWorker",
  LABOUR: "labour",
  CONTRACTOR: "contractor",
  USER: "user",
};
export const PLAN_KEYS = {
  FREE: "free",
  MONTH_1: "month_1",
  MONTH_3: "month_3",
  YEAR_1: "year_1",
};
export const USER_ROLE_VALUES = Object.values(USER_ROLES);

export const ADMIN_ROLES = {
  SUPER_ADMIN: "superAdmin",
  ADMIN: "admin",
  MODERATOR: "moderator",
};

export const ADMIN_ROLE_VALUES = Object.values(ADMIN_ROLES);
