import { describe, it, expect } from 'vitest';
import { hasPermission, checkPermission } from '../rbac.js';

// BUSINESS RULE [RBAC-001]: Dashboard access for all roles

describe('RBAC Dashboard permissions', () => {
  it('owner can read dashboard', () => {
    expect(hasPermission('owner', 'dashboard', 'read')).toBe(true);
  });

  it('admin can read dashboard', () => {
    expect(hasPermission('admin', 'dashboard', 'read')).toBe(true);
  });

  it('member can read dashboard', () => {
    expect(hasPermission('member', 'dashboard', 'read')).toBe(true);
  });

  it('accountant can read dashboard', () => {
    expect(hasPermission('accountant', 'dashboard', 'read')).toBe(true);
  });

  it('checkPermission returns ok for owner dashboard:read', () => {
    const result = checkPermission('owner', 'dashboard', 'read');
    expect(result.ok).toBe(true);
  });
});
