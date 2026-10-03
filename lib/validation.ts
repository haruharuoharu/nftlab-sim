import { z } from 'zod';
const record=z.object({stage:z.enum(['locked','ready','minted','transferred','redeemed']),asset:z.string().max(100).optional(),owner:z.string().max(100).optional(),signature:z.string().max(120).optional()});
export const progressSchema=z.object({version:z.literal(1),records:z.object({ticket:record,loyalty:record,membership:record}),certificate:z.object({id:z.string().max(100),date:z.string().max(50),signature:z.string().max(120).optional()}).optional()});
