import { z } from 'zod';

// BUSINESS RULE [R08]: Validation aux frontieres

export const auditListSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  entity_type: z.string().max(100).optional(),
  entity_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  action: z.string().max(50).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type AuditListInput = z.infer<typeof auditListSchema>;
