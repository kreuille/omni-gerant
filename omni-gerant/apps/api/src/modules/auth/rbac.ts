import type { UserRole } from '@zenadmin/shared';
import { forbidden } from '@zenadmin/shared';
import type { Result, AppError } from '@zenadmin/shared';
import { ok, err } from '@zenadmin/shared';

// BUSINESS RULE [CDC-6]: Roles et permissions
// owner    : tout (CRUD all, settings, billing, users)
// admin    : tout sauf billing et suppression tenant
// member   : CRUD sur ventes, achats, clients, produits (pas users ni settings)
// accountant : lecture seule + export FEC

export type Resource =
  | 'tenant'
  | 'user'
  | 'client'
  | 'product'
  | 'quote'
  | 'invoice'
  | 'purchase'
  | 'bank'
  | 'audit'
  | 'settings'
  | 'billing'
  | 'export'
  | 'legal'
  | 'dashboard';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'export';

export interface Permission {
  resource: Resource;
  action: Action;
}

// BUSINESS RULE [CDC-6]: Matrice de permissions par role
const PERMISSION_MATRIX: Record<UserRole, Set<string>> = {
  owner: new Set([
    // Owner can do everything
    'tenant:read', 'tenant:update', 'tenant:delete',
    'user:create', 'user:read', 'user:update', 'user:delete',
    'client:create', 'client:read', 'client:update', 'client:delete',
    'product:create', 'product:read', 'product:update', 'product:delete',
    'quote:create', 'quote:read', 'quote:update', 'quote:delete',
    'invoice:create', 'invoice:read', 'invoice:update', 'invoice:delete',
    'purchase:create', 'purchase:read', 'purchase:update', 'purchase:delete',
    'bank:create', 'bank:read', 'bank:update', 'bank:delete',
    'audit:read',
    'settings:read', 'settings:update',
    'billing:create', 'billing:read', 'billing:update', 'billing:delete',
    'export:read', 'export:export',
    'legal:create', 'legal:read', 'legal:update', 'legal:delete',
    'dashboard:read',
  ]),
  admin: new Set([
    // Admin can do everything except billing and tenant delete
    'tenant:read', 'tenant:update',
    'user:create', 'user:read', 'user:update', 'user:delete',
    'client:create', 'client:read', 'client:update', 'client:delete',
    'product:create', 'product:read', 'product:update', 'product:delete',
    'quote:create', 'quote:read', 'quote:update', 'quote:delete',
    'invoice:create', 'invoice:read', 'invoice:update', 'invoice:delete',
    'purchase:create', 'purchase:read', 'purchase:update', 'purchase:delete',
    'bank:create', 'bank:read', 'bank:update', 'bank:delete',
    'audit:read',
    'settings:read', 'settings:update',
    'export:read', 'export:export',
    'legal:create', 'legal:read', 'legal:update', 'legal:delete',
    'dashboard:read',
  ]),
  member: new Set([
    // Member: CRUD on business entities, no users/settings/billing
    'tenant:read',
    'client:create', 'client:read', 'client:update', 'client:delete',
    'product:create', 'product:read', 'product:update', 'product:delete',
    'quote:create', 'quote:read', 'quote:update', 'quote:delete',
    'invoice:create', 'invoice:read', 'invoice:update', 'invoice:delete',
    'purchase:create', 'purchase:read', 'purchase:update', 'purchase:delete',
    'bank:read',
    'legal:read',
    'dashboard:read',
  ]),
  accountant: new Set([
    // Accountant: read-only + export FEC
    'tenant:read',
    'client:read',
    'product:read',
    'quote:read',
    'invoice:read',
    'purchase:read',
    'bank:read',
    'audit:read',
    'export:read', 'export:export',
    'legal:read',
    'dashboard:read',
  ]),
};

export function hasPermission(role: UserRole, resource: Resource, action: Action): boolean {
  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return false;
  return permissions.has(`${resource}:${action}`);
}

export function checkPermission(role: UserRole, resource: Resource, action: Action): Result<true, AppError> {
  if (hasPermission(role, resource, action)) {
    return ok(true);
  }
  return err(forbidden(`Le role '${role}' n'a pas la permission '${action}' sur '${resource}'`));
}

export function getRolePermissions(role: UserRole): Permission[] {
  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) return [];
  return Array.from(permissions).map((p) => {
    const [resource, action] = p.split(':') as [Resource, Action];
    return { resource, action };
  });
}

export const VALID_ROLES: readonly UserRole[] = ['owner', 'admin', 'member', 'accountant'] as const;

export function isValidRole(role: string): role is UserRole {
  return (VALID_ROLES as readonly string[]).includes(role);
}
