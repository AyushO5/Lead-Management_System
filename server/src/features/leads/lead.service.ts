import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { LeadUpdateInput, LeadListQuery } from './lead.schema';
import { ActivityType } from '@prisma/client';
import { createError } from '../../middleware/error.middleware';

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

const safeUserSelect = { id: true, name: true, email: true, role: true } as const;

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
      include: { assignedTo: { select: safeUserSelect } },
    }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getLead(id: string, requester: { userId: string; role: string }) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { assignedTo: { select: safeUserSelect } },
  });
  if (!lead) return null;
  if (requester.role !== 'ADMIN' && lead.assignedToId !== requester.userId) return null;
  return lead;
}

export async function updateLead(
  id: string,
  updates: LeadUpdateInput,
  requester: { userId: string; role: string },
) {
  const current = await prisma.lead.findUnique({ where: { id } });
  if (!current) throw createError('Lead not found', 404);
  if (requester.role !== 'ADMIN' && current.assignedToId !== requester.userId) {
    throw createError('Forbidden', 403);
  }

  return prisma.$transaction(async (tx) => {
    const { status, ...rest } = updates;
    const updatedLead = await tx.lead.update({
      where: { id },
      data: { ...rest, ...(status ? { status } : {}) },
      include: { assignedTo: { select: safeUserSelect } },
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

export async function deleteLead(id: string) {
  try {
    await prisma.lead.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw createError('Lead not found', 404);
    }
    throw err;
  }
}

export async function assignLead(
  leadId: string,
  newUserId: string,
  adminId: string,
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw createError('Lead not found', 404);

  const assignee = await prisma.user.findUnique({
    where: { id: newUserId },
    select: { id: true, role: true },
  });
  if (!assignee) throw createError('User not found', 404);
  if (assignee.role !== 'MEMBER') {
    throw createError('Leads can only be assigned to members', 400);
  }

  const oldUserId = lead.assignedToId ?? null;

  return prisma.$transaction(async (tx) => {
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: { assignedToId: newUserId },
      include: { assignedTo: { select: safeUserSelect } },
    });

    await activityCreateBase(tx, {
      type: ActivityType.LEAD_ASSIGNED,
      leadId,
      userId: adminId,
      oldValue: oldUserId,
      newValue: newUserId,
    });

    return updatedLead;
  });
}

export async function getLeadActivities(
  leadId: string,
  requester: { userId: string; role: string },
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw createError('Lead not found', 404);
  if (requester.role !== 'ADMIN' && lead.assignedToId !== requester.userId) {
    throw createError('Forbidden', 403);
  }

  return prisma.activity.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: safeUserSelect } },
  });
}
