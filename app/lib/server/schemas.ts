// app/lib/server/schemas.ts
import { z } from 'zod';

export const ConsumeSchema = z.object({
  userId: z.string().min(1, 'userId required'),
  docId: z.string().min(1, 'docId required'),
  action: z.literal('consume').default('consume'),
});

export const FavoritesWriteSchema = z.object({
  userId: z.string().min(1, 'userId required'),
  docId: z.string().min(1, 'docId required'),
});
