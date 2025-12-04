// lib/staffRoles.ts
// Central helpers for staff roles and "manager" permissions.

export const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export type ManagerRoleCode = (typeof MANAGER_ROLES)[number];

export function isManagerRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (MANAGER_ROLES as readonly string[]).includes(normalized);
}