import { prisma } from '../../lib/prisma';

// Return all users with safe fields only (no passwordHash)
export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
}
