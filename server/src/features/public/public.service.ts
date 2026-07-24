import { prisma } from '../../lib/prisma';
import { PublicLeadInput } from './public.schema';
import { ActivityType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Create a public lead (no auth) — status NEW, unassigned.
// Uses a transaction so the lead + activity either both succeed or both fail.
// ─────────────────────────────────────────────────────────────────────────────

export async function createPublicLead(input: PublicLeadInput) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        name:    input.name,
        email:   input.email,
        phone:   input.phone   ?? null,
        company: input.company ?? null,
        message: input.message ?? null,
        status:  'NEW',
        assignedToId: null,
      },
    });

    await tx.activity.create({
      data: {
        type:   ActivityType.LEAD_CREATED,
        leadId: lead.id,
        // userId is null — anonymous public submission
      },
    });

    return lead;
  });
}
