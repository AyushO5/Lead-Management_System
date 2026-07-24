import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { LeadUpdateInput, LeadListQuery } from './lead.schema';
import { ActivityType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Helper to create activity records (used in transactions)
// ─────────────────────────────────────────────────────────────────────────────

function activityCreateBase(data: {
  type: ActivityType;
  leadId: string;
  userId?: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  return prisma.activity.create({ data });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lead service functions
// ─────────────────────────────────────────────────────────────────────────────

/** List leads with pagination, filters, and search. */
export async function listLeads(params: LeadListQuery, requester: { userId: string; role: string }) {
  const { page, limit, status, assignedTo, search } = params;
  const skip = (page - 1) * limit;

  // Base where clause – members are forced to their own leads
  const where: Prisma.LeadWhereInput = {};

  if (status) where.status = status;

  // Member restriction – ignore any supplied assignedTo filter for MEMBER
  if (requester.role === 'ADMIN') {
    if (assignedTo) where.assignedToId = assignedTo;
  } else {
    where.assignedToId = requester.userId;
  }

  if (search) {
    const like = `%${search}%`;
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return { data, pagination: { page, limit, total, totalPages } };
}

/** Get a single lead (ADMIN can fetch any, MEMBER only own). */
export async function getLead(id: string, requester: { userId: string; role: string }) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return null;
  if (requester.role !== 'ADMIN' && lead.assignedToId !== requester.userId) {
    return null; // hide from unauthorized members
  }
  return lead;
}

/** Update lead fields. For status change, creates a STATUS_CHANGED activity.
 *  Returns the updated lead.
 */
export async function updateLead(
  id: string,
  updates: LeadUpdateInput,
  requester: { userId: string; role: string },
) {
  // Load current lead for permission checks and old values
  const current = await prisma.lead.findUnique({ where: { id } });
  if (!current) throw new Error('Lead not found');
  if (requester.role !== 'ADMIN' && current.assignedToId !== requester.userId) {
    throw new Error('Forbidden');
  }

  // Build transaction steps
  const tx: Prisma.PrismaPromise<any>[] = [];

  // If status is being changed, record activity
  if (updates.status && updates.status !== current.status) {
    tx.push(
      activityCreateBase({
        type: ActivityType.STATUS_CHANGED,
        leadId: id,
        userId: requester.userId,
        oldValue: current.status,
        newValue: updates.status,
      }),
    );
  }

  // Apply generic field updates (excluding status handled above)
  const { status, ...rest } = updates;
  if (Object.keys(rest).length > 0) {
    tx.push(prisma.lead.update({ where: { id }, data: rest }));
  }

  // If only status changed (no other fields) we still need to update the lead
  if (updates.status) {
    tx.push(prisma.lead.update({ where: { id }, data: { status: updates.status } }));
  }

  const results = await prisma.$transaction(tx);
  // The last lead update result contains the fresh lead
  return results[results.length - 1] as Prisma.LeadGetPayload<{}>;
}

/** Delete a lead – ADMIN only. */
export async function deleteLead(id: string) {
  // Cascade delete is defined in Prisma schema for notes & activities
  await prisma.lead.delete({ where: { id } });
}

/** Assign a lead to a user – ADMIN only. */
export async function assignLead(
  leadId: string,
  newUserId: string,
  adminId: string,
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead not found');

  const oldUserId = lead.assignedToId ?? null;

  const tx = await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId: newUserId },
    }),
    activityCreateBase({
      type: ActivityType.LEAD_ASSIGNED,
      leadId,
      userId: adminId,
      oldValue: oldUserId,
      newValue: newUserId,
    }),
  ]);
  return tx[0]; // updated lead
}

/** Retrieve activities for a lead – ordered newest first. */
export async function getLeadActivities(
  leadId: string,
  requester: { userId: string; role: string },
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead not found');
  if (requester.role !== 'ADMIN' && lead.assignedToId !== requester.userId) {
    throw new Error('Forbidden');
  }

  return prisma.activity.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
}
