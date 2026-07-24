import { prisma } from '../../lib/prisma';
import { NoteCreateInput } from './note.schema';
import { ActivityType } from '@prisma/client';

/** Retrieve notes for a lead, enforce permission via requester */
export async function getLeadNotes(leadId: string, requester: { userId: string; role: string }) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead not found');
  if (requester.role !== 'ADMIN' && lead.assignedToId !== requester.userId) {
    throw new Error('Forbidden');
  }
  return prisma.note.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, name: true, email: true, role: true } } },
  });
}

/** Create a note on a lead and log NOTE_ADDED activity. */
export async function addNote(
  leadId: string,
  input: NoteCreateInput,
  requester: { userId: string; role: string },
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead not found');
  if (requester.role !== 'ADMIN' && lead.assignedToId !== requester.userId) {
    throw new Error('Forbidden');
  }

  return prisma.$transaction([
    prisma.note.create({
      data: {
        content: input.content,
        leadId,
        authorId: requester.userId,
      },
    }),
    prisma.activity.create({
      data: {
        type: ActivityType.NOTE_ADDED,
        leadId,
        userId: requester.userId,
        // no oldValue/newValue for notes
      },
    }),
  ]);
}
