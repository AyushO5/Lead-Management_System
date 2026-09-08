import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { LeadUpdateInput, LeadListQuery } from './lead.schema';
import { ActivityType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Helper to create activity records using the supplied Prisma client/transaction
// ─────────────────────────────────────────────────────────────────────────────

function activityCreateBase(
  db: Prisma.TransactionClient | typeof prisma,
  data: {
    type: ActivityType;
    leadId: string;
    userId?: string;
    oldValue?: string | null;
    newValue?: string | null;
  },
) {
  return db.activity.create({ data });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lead service functions
// ─────────────────────────────────────────────────────────────────────────────

/** List leads with pagination, filters, and search. */
export async function listLeads(params: LeadListQuery, requester: { userId: string; role: string }) {
  const { page, limit, status, assignedTo, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.LeadWhereInput = {};

  if (status) where.status = status;

  if (requester.role === 'ADMIN') {
    if (assignedTo) where.assignedToId = assignedTo;
  } else {
    where.assignedToId = requester.userId;
  }

  if (search) {
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
    return null;
  }
  return lead;
}

/** Update lead fields and atomically record a status-change activity. */
export async function updateLead(
  id: string,
  updates: LeadUpdateInput,
  requester: { userId: string; role: string },
) {
  const current = await prisma.lead.findUnique({ where: { id } });
  if (!current) throw new Error('Lead not found');
  if (requester.role !== 'ADMIN' && current.assignedToId !== requester.userId) {
    throw new Error('Forbidden');
  }

  return prisma.$transaction(async (tx) => {
    const { status, ...rest } = updates;

    const updatedLead = await tx.lead.update({
      where: { id },
      data: {
        ...rest,
        ...(status ? { status } : {}),
      },
    });

    if (status && status !== current.status) {
      await activityCreateBase(tx, {
        type: ActivityType.STATUS_CHANGED,
        leadId: id,
        userId: requester.userId,
        oldValue: current.status,
        newValue: status,
      });
    }

    return updatedLead;
  });
}

/** Delete a lead – ADMIN only. */
export async function deleteLead(id: string) {
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
    activityCreateBase(prisma, {
      type: ActivityType.LEAD_ASSIGNED,
      leadId,
      userId: adminId,
      oldValue: oldUserId,
      newValue: newUserId,
    }),
  ]);
  return tx[0];
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
