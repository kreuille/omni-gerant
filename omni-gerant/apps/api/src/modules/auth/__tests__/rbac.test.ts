import { describe, it, expect } from 'vitest';
import type { UserRole } from '@omni-gerant/shared';
import { hasPermission, checkPermission, getRolePermissions, isValidRole, VALID_ROLES } from '../rbac.js';
import { evaluatePolicy, type PolicyContext } from '../policies.js';

// BUSINESS RULE [CDC-6]: Test chaque role peut/ne peut pas effectuer chaque action

describe('RBAC - hasPermission', () => {
  describe('owner role', () => {
    const role: UserRole = 'owner';

    it('can do everything on all resources', () => {
      expect(hasPermission(role, 'tenant', 'read')).toBe(true);
      expect(hasPermission(role, 'tenant', 'update')).toBe(true);
      expect(hasPermission(role, 'tenant', 'delete')).toBe(true);
      expect(hasPermission(role, 'user', 'create')).toBe(true);
      expect(hasPermission(role, 'user', 'read')).toBe(true);
      expect(hasPermission(role, 'user', 'update')).toBe(true);
      expect(hasPermission(role, 'user', 'delete')).toBe(true);
      expect(hasPermission(role, 'client', 'create')).toBe(true);
      expect(hasPermission(role, 'product', 'delete')).toBe(true);
      expect(hasPermission(role, 'quote', 'create')).toBe(true);
      expect(hasPermission(role, 'invoice', 'create')).toBe(true);
      expect(hasPermission(role, 'purchase', 'create')).toBe(true);
      expect(hasPermission(role, 'bank', 'read')).toBe(true);
      expect(hasPermission(role, 'audit', 'read')).toBe(true);
      expect(hasPermission(role, 'settings', 'read')).toBe(true);
      expect(hasPermission(role, 'settings', 'update')).toBe(true);
      expect(hasPermission(role, 'billing', 'read')).toBe(true);
      expect(hasPermission(role, 'billing', 'update')).toBe(true);
      expect(hasPermission(role, 'export', 'export')).toBe(true);
    });
  });

  describe('admin role', () => {
    const role: UserRole = 'admin';

    it('can manage users and settings', () => {
      expect(hasPermission(role, 'user', 'create')).toBe(true);
      expect(hasPermission(role, 'user', 'read')).toBe(true);
      expect(hasPermission(role, 'user', 'update')).toBe(true);
      expect(hasPermission(role, 'user', 'delete')).toBe(true);
      expect(hasPermission(role, 'settings', 'read')).toBe(true);
      expect(hasPermission(role, 'settings', 'update')).toBe(true);
    });

    it('cannot access billing', () => {
      expect(hasPermission(role, 'billing', 'read')).toBe(false);
      expect(hasPermission(role, 'billing', 'update')).toBe(false);
    });

    it('cannot delete tenant', () => {
      expect(hasPermission(role, 'tenant', 'delete')).toBe(false);
    });

    it('can manage business resources', () => {
      expect(hasPermission(role, 'client', 'create')).toBe(true);
      expect(hasPermission(role, 'product', 'create')).toBe(true);
      expect(hasPermission(role, 'quote', 'create')).toBe(true);
      expect(hasPermission(role, 'invoice', 'create')).toBe(true);
    });
  });

  describe('member role', () => {
    const role: UserRole = 'member';

    it('can CRUD business resources', () => {
      expect(hasPermission(role, 'client', 'create')).toBe(true);
      expect(hasPermission(role, 'client', 'read')).toBe(true);
      expect(hasPermission(role, 'client', 'update')).toBe(true);
      expect(hasPermission(role, 'client', 'delete')).toBe(true);
      expect(hasPermission(role, 'product', 'create')).toBe(true);
      expect(hasPermission(role, 'quote', 'create')).toBe(true);
      expect(hasPermission(role, 'invoice', 'create')).toBe(true);
      expect(hasPermission(role, 'purchase', 'create')).toBe(true);
    });

    it('cannot manage users', () => {
      expect(hasPermission(role, 'user', 'create')).toBe(false);
      expect(hasPermission(role, 'user', 'read')).toBe(false);
      expect(hasPermission(role, 'user', 'update')).toBe(false);
      expect(hasPermission(role, 'user', 'delete')).toBe(false);
    });

    it('cannot access settings or billing', () => {
      expect(hasPermission(role, 'settings', 'read')).toBe(false);
      expect(hasPermission(role, 'settings', 'update')).toBe(false);
      expect(hasPermission(role, 'billing', 'read')).toBe(false);
    });

    it('cannot view audit logs', () => {
      expect(hasPermission(role, 'audit', 'read')).toBe(false);
    });

    it('can read bank but not write', () => {
      expect(hasPermission(role, 'bank', 'read')).toBe(true);
      expect(hasPermission(role, 'bank', 'create')).toBe(false);
    });
  });

  describe('accountant role', () => {
    const role: UserRole = 'accountant';

    it('can read all business resources', () => {
      expect(hasPermission(role, 'client', 'read')).toBe(true);
      expect(hasPermission(role, 'product', 'read')).toBe(true);
      expect(hasPermission(role, 'quote', 'read')).toBe(true);
      expect(hasPermission(role, 'invoice', 'read')).toBe(true);
      expect(hasPermission(role, 'purchase', 'read')).toBe(true);
      expect(hasPermission(role, 'bank', 'read')).toBe(true);
    });

    it('cannot create/update/delete any resource', () => {
      expect(hasPermission(role, 'client', 'create')).toBe(false);
      expect(hasPermission(role, 'client', 'update')).toBe(false);
      expect(hasPermission(role, 'client', 'delete')).toBe(false);
      expect(hasPermission(role, 'product', 'create')).toBe(false);
      expect(hasPermission(role, 'invoice', 'create')).toBe(false);
    });

    it('can read audit logs', () => {
      expect(hasPermission(role, 'audit', 'read')).toBe(true);
    });

    it('can export FEC', () => {
      expect(hasPermission(role, 'export', 'read')).toBe(true);
      expect(hasPermission(role, 'export', 'export')).toBe(true);
    });

    it('cannot manage users or settings', () => {
      expect(hasPermission(role, 'user', 'create')).toBe(false);
      expect(hasPermission(role, 'settings', 'update')).toBe(false);
    });
  });
});

describe('RBAC - checkPermission', () => {
  it('returns ok(true) for allowed action', () => {
    const result = checkPermission('owner', 'client', 'create');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(true);
  });

  it('returns err(FORBIDDEN) for disallowed action', () => {
    const result = checkPermission('member', 'user', 'create');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });
});

describe('RBAC - getRolePermissions', () => {
  it('returns permissions array for a role', () => {
    const perms = getRolePermissions('accountant');
    expect(perms.length).toBeGreaterThan(0);
    expect(perms.every((p) => p.resource && p.action)).toBe(true);
  });

  it('owner has more permissions than member', () => {
    const ownerPerms = getRolePermissions('owner');
    const memberPerms = getRolePermissions('member');
    expect(ownerPerms.length).toBeGreaterThan(memberPerms.length);
  });
});

describe('RBAC - isValidRole', () => {
  it('validates known roles', () => {
    expect(isValidRole('owner')).toBe(true);
    expect(isValidRole('admin')).toBe(true);
    expect(isValidRole('member')).toBe(true);
    expect(isValidRole('accountant')).toBe(true);
  });

  it('rejects unknown roles', () => {
    expect(isValidRole('superadmin')).toBe(false);
    expect(isValidRole('')).toBe(false);
    expect(isValidRole('root')).toBe(false);
  });

  it('VALID_ROLES contains all four roles', () => {
    expect(VALID_ROLES).toHaveLength(4);
  });
});

describe('Policies - evaluatePolicy', () => {
  const ownerCtx: PolicyContext = {
    role: 'owner',
    user_id: 'user-1',
    tenant_id: 'tenant-1',
  };
  const adminCtx: PolicyContext = {
    role: 'admin',
    user_id: 'user-2',
    tenant_id: 'tenant-1',
  };
  const memberCtx: PolicyContext = {
    role: 'member',
    user_id: 'user-3',
    tenant_id: 'tenant-1',
  };

  it('owner can manage all users', () => {
    const result = evaluatePolicy(ownerCtx, 'user', 'create', { role: 'admin' });
    expect(result.allowed).toBe(true);
  });

  it('owner can assign owner role', () => {
    const result = evaluatePolicy(ownerCtx, 'user', 'update', { id: 'user-99', role: 'owner' });
    expect(result.allowed).toBe(true);
  });

  it('admin cannot assign owner role', () => {
    const result = evaluatePolicy(adminCtx, 'user', 'update', { id: 'user-99', role: 'owner' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('owner');
  });

  it('admin cannot delete another admin', () => {
    const result = evaluatePolicy(adminCtx, 'user', 'delete', { id: 'user-99', role: 'admin' });
    expect(result.allowed).toBe(false);
  });

  it('cannot change own role', () => {
    const result = evaluatePolicy(ownerCtx, 'user', 'update', { id: 'user-1', role: 'member' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('own role');
  });

  it('member cannot manage users at all', () => {
    const result = evaluatePolicy(memberCtx, 'user', 'create');
    expect(result.allowed).toBe(false);
  });

  it('allows resource actions without specific policy', () => {
    const result = evaluatePolicy(memberCtx, 'client', 'create');
    expect(result.allowed).toBe(true);
  });

  it('denies resource when RBAC denies it', () => {
    const result = evaluatePolicy(memberCtx, 'settings', 'update');
    expect(result.allowed).toBe(false);
  });
});
