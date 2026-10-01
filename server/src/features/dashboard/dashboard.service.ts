import { LeadStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface DashboardRequester {
  userId: string;
  role: string;
}

const statuses = Object.values(LeadStatus);

export async function getDashboardStats(requester: DashboardRequester) {
  const scope = requester.role === 'ADMIN'
    ? {}
    : { assignedToId: requester.userId };

  const [total, statusCounts, recentLeads] = await Promise.all([
    prisma.lead.count({ where: scope }),
    Promise.all(
      statuses.map(async (status) => [
        status,
        await prisma.lead.count({ where: { ...scope, status } }),
      ] as const),
    ),
    prisma.lead.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
  ]);

  return {
    counts: Object.fromEntries([
      ['total', total],
      ...statusCounts,
    ]),
    recentLeads,
  };
}
