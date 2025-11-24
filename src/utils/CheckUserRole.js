import { Roles } from "../models/user.modle.js";

export const CheckUserRole = (roleCode) => {
  if (roleCode == 2) {
    return Roles.SUPER_ADMIN;
  }
  if (roleCode == 1) {
    return Roles.BRANCH_ADMIN;
  }
  if (roleCode == 0) {
    return Roles.MEMBER;
  }
};
