import type { UserRole } from '@omni-gerant/shared';
import { forbidden } from '@omni-gerant/shared';
import type { Result, AppError } from '@omni-gerant/shared';
import { ok, err } from '@omni-gerant/shared';

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
  | 'export';

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
    'billing:read', 'billing:update',
    'export:read', 'export:export',
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
  return err(forbidden(`Role '${role}' cannot ${action} ${resource}`));
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
