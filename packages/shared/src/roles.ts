export const ROLES = ["COUPLE", "VENDOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/** Account types a person can choose at sign-up. Admin is never self-assigned. */
export const ACCOUNT_TYPES = ["COUPLE", "VENDOR"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
