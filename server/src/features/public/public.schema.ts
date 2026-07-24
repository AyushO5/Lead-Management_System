import { z } from 'zod';

// Public lead capture schema – no auth required
export const publicLeadSchema = z.object({
  name:    z.string().min(1, 'Name is required').max(255),
  email:   z.string().email('Invalid email address'),
  phone:   z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  message: z.string().max(5000).optional(),
});

export type PublicLeadInput = z.infer<typeof publicLeadSchema>;
