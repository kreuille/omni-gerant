import type { UserRole } from '@omni-gerant/shared';
import type { Resource, Action } from './rbac.js';
import { hasPermission } from './rbac.js';

// BUSINESS RULE [CDC-6]: Policies par ressource
// Policies add resource-specific rules on top of RBAC permissions.
// For example: a member cannot promote another user to admin.

export interface PolicyContext {
  role: UserRole;
  user_id: string;
  tenant_id: string;
}

export interface PolicyCheck {
  allowed: boolean;
  reason?: string;
}

type PolicyFn = (ctx: PolicyContext, target?: { id?: string; role?: string }) => PolicyCheck;

const ALLOW: PolicyCheck = { allowed: true };
function deny(reason: string): PolicyCheck {
  return { allowed: false, reason };
}

// BUSINESS RULE [CDC-6]: Users - role hierarchy enforcement
const userPolicy: PolicyFn = (ctx, target) => {
  if (!hasPermission(ctx.role, 'user', 'read')) {
    return deny(`Role '${ctx.role}' cannot manage users`);
  }

  // Cannot modify own role
  if (target?.id === ctx.user_id && target?.role && target.role !== ctx.role) {
    return deny('Cannot change your own role');
  }

  // Only owner can create/modify another owner
  if (target?.role === 'owner' && ctx.role !== 'owner') {
    return deny('Only owner can assign owner role');
  }

  // Admin cannot delete another admin
  if (ctx.role === 'admin' && target?.role === 'admin' && target?.id !== ctx.user_id) {
    return deny('Admin cannot remove another admin');
  }

  return ALLOW;
};

// BUSINESS RULE [CDC-6]: Tenant delete = owner only
const tenantPolicy: PolicyFn = (ctx) => {
  if (!hasPermission(ctx.role, 'tenant', 'read')) {
    return deny(`Role '${ctx.role}' cannot access tenant`);
  }
  return ALLOW;
};

const RESOURCE_POLICIES: Partial<Record<Resource, PolicyFn>> = {
  user: userPolicy,
  tenant: tenantPolicy,
};

export function evaluatePolicy(
  ctx: PolicyContext,
  resource: Resource,
  action: Action,
  target?: { id?: string; role?: string },
): PolicyCheck {
  // First check RBAC permissions
  if (!hasPermission(ctx.role, resource, action)) {
    return deny(`Role '${ctx.role}' cannot ${action} ${resource}`);
  }

  // Then check resource-specific policy
  const policy = RESOURCE_POLICIES[resource];
  if (policy) {
    return policy(ctx, target);
  }

  return ALLOW;
}
