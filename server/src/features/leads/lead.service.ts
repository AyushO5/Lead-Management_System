import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { LeadUpdateInput, LeadListQuery } from './lead.schema';
import { ActivityType } from '@prisma/client';

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
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return { data, pagination: { page, limit, total, totalPages } };
}

export async function getLead(id: string, requester: { userId: string; role: string }) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
    },
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
  if (!current) throw new Error('Lead not found');
  if (requester.role !== 'ADMIN' && current.assignedToId !== requester.userId) {
    throw new Error('Forbidden');
  }

  return prisma.$transaction(async (tx) => {
    const { status, ...rest } = updates;
    const updatedLead = await tx.lead.update({
      where: { id },
      data: { ...rest, ...(status ? { status } : {}) },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
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

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } });
}

export async function assignLead(
  leadId: string,
  newUserId: string,
  adminId: string,
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead not found');

  const assignee = await prisma.user.findUnique({
    where: { id: newUserId },
    select: { id: true, role: true },
  });
  if (!assignee) throw new Error('User not found');
  if (assignee.role !== 'MEMBER') throw new Error('Leads can only be assigned to members');

  const oldUserId = lead.assignedToId ?? null;

  const tx = await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId: newUserId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
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
