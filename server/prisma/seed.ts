import 'dotenv/config';
import { PrismaClient, LeadStatus, ActivityType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

// ─────────────────────────────────────────────────────────────────────────────
// Seed script — run via: npm run db:seed
// Reads ADMIN_SEED_PASSWORD and MEMBER_SEED_PASSWORD from environment.
// Idempotent: running multiple times produces the same final state.
// ─────────────────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** Return a Date offset by `daysAgo` days from now, with a fixed hour. */
function daysAgo(days: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  const connectionString = requireEnv('DATABASE_URL');
  const adminPassword    = requireEnv('ADMIN_SEED_PASSWORD');
  const memberPassword   = requireEnv('MEMBER_SEED_PASSWORD');

  const adapter = new PrismaPg({ connectionString });
  const prisma  = new PrismaClient({ adapter });

  try {
    const adminHash  = await bcrypt.hash(adminPassword,  SALT_ROUNDS);
    const memberHash = await bcrypt.hash(memberPassword, SALT_ROUNDS);

    // ── Demo users (upsert on unique email) ──────────────────────────────────

    const admin = await prisma.user.upsert({
      where:  { email: 'admin@example.com' },
      update: { passwordHash: adminHash },
      create: { name: 'Admin User', email: 'admin@example.com', passwordHash: adminHash, role: 'ADMIN' },
    });

    const member = await prisma.user.upsert({
      where:  { email: 'member@example.com' },
      update: { passwordHash: memberHash },
      create: { name: 'Member User', email: 'member@example.com', passwordHash: memberHash, role: 'MEMBER' },
    });

    console.log('✅ Demo users ready');
    console.log(`   Admin  → ${admin.email}`);
    console.log(`   Member → ${member.email}`);

    // ── Demo leads ────────────────────────────────────────────────────────────
    // Lead.email is NOT @unique in the schema, so upsert is not available.
    // Idempotency strategy: findFirst by email, create only if absent, update
    // mutable fields (status, assignedToId) if already present.

    type LeadSeed = {
      email:          string;
      name:           string;
      phone:          string;
      company:        string;
      message:        string;
      status:         LeadStatus;
      assignedToId:   string | null;
      createdDaysAgo: number;
    };

    const leadSeeds: LeadSeed[] = [
      // WON (3) ──────────────────────────────────────────────────────────────
      {
        email:          'arjun.mehta@finedge.example.com',
        name:           'Arjun Mehta',
        phone:          '+91 98201 34567',
        company:        'FinEdge Solutions',
        message:        'Looking for a CRM to track and close enterprise FinTech deals faster.',
        status:         LeadStatus.WON,
        assignedToId:   member.id,
        createdDaysAgo: 60,
      },
      {
        email:          'manish.agarwal@retailflow.example.com',
        name:           'Manish Agarwal',
        phone:          '+91 79301 82341',
        company:        'RetailFlow',
        message:        'Need a scalable CRM for our retail sales team across 12 cities.',
        status:         LeadStatus.WON,
        assignedToId:   member.id,
        createdDaysAgo: 55,
      },
      {
        email:          'dev.khanna@shipswift.example.com',
        name:           'Dev Khanna',
        phone:          '+91 88201 90123',
        company:        'ShipSwift',
        message:        'Evaluating CRM options to improve B2B logistics client retention.',
        status:         LeadStatus.WON,
        assignedToId:   member.id,
        createdDaysAgo: 48,
      },

      // LOST (3) ─────────────────────────────────────────────────────────────
      {
        email:          'ananya.gupta@urbannest.example.com',
        name:           'Ananya Gupta',
        phone:          '+91 91234 56789',
        company:        'UrbanNest',
        message:        'Interested in CRM for real estate lead tracking but budget was reallocated.',
        status:         LeadStatus.LOST,
        assignedToId:   member.id,
        createdDaysAgo: 50,
      },
      {
        email:          'simran.kaur@travelnest.example.com',
        name:           'Simran Kaur',
        phone:          '+91 77091 44320',
        company:        'TravelNest',
        message:        'Wanted a CRM for travel package lead management. Went with a competitor.',
        status:         LeadStatus.LOST,
        assignedToId:   member.id,
        createdDaysAgo: 45,
      },
      {
        email:          'aditi.sethi@brandforge.example.com',
        name:           'Aditi Sethi',
        phone:          '+91 99112 67854',
        company:        'BrandForge',
        message:        'Marketing agency looking to track client acquisition. Deal went cold.',
        status:         LeadStatus.LOST,
        assignedToId:   null,
        createdDaysAgo: 40,
      },

      // PROPOSAL (3) ─────────────────────────────────────────────────────────
      {
        email:          'priya.patel@brightcart.example.com',
        name:           'Priya Patel',
        phone:          '+91 80912 23456',
        company:        'BrightCart',
        message:        'Requires CRM integration with our e-commerce platform for lead nurturing.',
        status:         LeadStatus.PROPOSAL,
        assignedToId:   member.id,
        createdDaysAgo: 30,
      },
      {
        email:          'kavya.iyer@greengrid.example.com',
        name:           'Kavya Iyer',
        phone:          '+91 98432 11092',
        company:        'GreenGrid Energy',
        message:        'Renewable energy startup tracking investor and partner leads.',
        status:         LeadStatus.PROPOSAL,
        assignedToId:   member.id,
        createdDaysAgo: 28,
      },
      {
        email:          'ishita.desai@finora.example.com',
        name:           'Ishita Desai',
        phone:          '+91 83001 57423',
        company:        'Finora Consulting',
        message:        'Financial advisory firm needs CRM for HNI client pipeline management.',
        status:         LeadStatus.PROPOSAL,
        assignedToId:   null,
        createdDaysAgo: 22,
      },

      // QUALIFIED (4) ────────────────────────────────────────────────────────
      {
        email:          'rahul.sharma@nexora.example.com',
        name:           'Rahul Sharma',
        phone:          '+91 98765 43210',
        company:        'Nexora Technologies',
        message:        'SaaS startup looking to track inbound leads from product-led growth campaigns.',
        status:         LeadStatus.QUALIFIED,
        assignedToId:   member.id,
        createdDaysAgo: 20,
      },
      {
        email:          'rohan.malhotra@datavista.example.com',
        name:           'Rohan Malhotra',
        phone:          '+91 85234 67890',
        company:        'DataVista Analytics',
        message:        'Data consultancy firm evaluating CRM to track enterprise sales pipeline.',
        status:         LeadStatus.QUALIFIED,
        assignedToId:   member.id,
        createdDaysAgo: 18,
      },
      {
        email:          'karan.bansal@securestack.example.com',
        name:           'Karan Bansal',
        phone:          '+91 90123 45678',
        company:        'SecureStack',
        message:        'Cybersecurity firm needs CRM to manage government and enterprise prospects.',
        status:         LeadStatus.QUALIFIED,
        assignedToId:   null,
        createdDaysAgo: 15,
      },
      {
        email:          'yash.thakur@buildright.example.com',
        name:           'Yash Thakur',
        phone:          '+91 93456 78901',
        company:        'BuildRight',
        message:        'Construction company tracking B2B contractor and developer relationships.',
        status:         LeadStatus.QUALIFIED,
        assignedToId:   null,
        createdDaysAgo: 12,
      },

      // CONTACTED (3) ────────────────────────────────────────────────────────
      {
        email:          'neha.verma@pixelcraft.example.com',
        name:           'Neha Verma',
        phone:          '+91 96321 54870',
        company:        'PixelCraft Studio',
        message:        'Design agency looking for lead tracking across multiple client verticals.',
        status:         LeadStatus.CONTACTED,
        assignedToId:   member.id,
        createdDaysAgo: 10,
      },
      {
        email:          'sneha.kapoor@medcore.example.com',
        name:           'Sneha Kapoor',
        phone:          '+91 87654 32109',
        company:        'MedCore Labs',
        message:        'Healthcare company tracking pharma partnership leads in Tier-2 cities.',
        status:         LeadStatus.CONTACTED,
        assignedToId:   null,
        createdDaysAgo: 9,
      },
      {
        email:          'nitin.rao@autosphere.example.com',
        name:           'Nitin Rao',
        phone:          '+91 76543 21098',
        company:        'AutoSphere',
        message:        'Automotive dealer network evaluating CRM for regional sales teams.',
        status:         LeadStatus.CONTACTED,
        assignedToId:   null,
        createdDaysAgo: 7,
      },

      // NEW (4) ──────────────────────────────────────────────────────────────
      {
        email:          'vikram.singh@cloudpeak.example.com',
        name:           'Vikram Singh',
        phone:          '+91 92345 67890',
        company:        'CloudPeak Systems',
        message:        'Cloud infrastructure provider wants CRM for tracking ISV partner leads.',
        status:         LeadStatus.NEW,
        assignedToId:   null,
        createdDaysAgo: 5,
      },
      {
        email:          'aditya.joshi@learnsphere.example.com',
        name:           'Aditya Joshi',
        phone:          '+91 81234 56789',
        company:        'LearnSphere',
        message:        'EdTech platform tracking B2B school and university partnerships.',
        status:         LeadStatus.NEW,
        assignedToId:   null,
        createdDaysAgo: 4,
      },
      {
        email:          'meera.shah@foodloop.example.com',
        name:           'Meera Shah',
        phone:          '+91 78901 23456',
        company:        'FoodLoop',
        message:        'Food & beverage startup tracking restaurant chain and FMCG partnerships.',
        status:         LeadStatus.NEW,
        assignedToId:   null,
        createdDaysAgo: 3,
      },
      {
        email:          'pooja.nair@worknest.example.com',
        name:           'Pooja Nair',
        phone:          '+91 84567 89012',
        company:        'WorkNest',
        message:        'HR-tech platform looking for a CRM to track enterprise client prospects.',
        status:         LeadStatus.NEW,
        assignedToId:   null,
        createdDaysAgo: 1,
      },
    ];

    // email → lead id (populated below)
    const leadIdByEmail: Record<string, string> = {};
    let leadsCreated = 0;
    let leadsUpdated = 0;

    for (const seed of leadSeeds) {
      const existing = await prisma.lead.findFirst({ where: { email: seed.email } });

      if (existing) {
        // Update mutable fields only — don't reset createdAt
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            status:       seed.status,
            assignedToId: seed.assignedToId,
          },
        });
        leadIdByEmail[seed.email] = existing.id;
        leadsUpdated++;
      } else {
        const created = await prisma.lead.create({
          data: {
            email:        seed.email,
            name:         seed.name,
            phone:        seed.phone,
            company:      seed.company,
            message:      seed.message,
            status:       seed.status,
            assignedToId: seed.assignedToId,
            createdAt:    daysAgo(seed.createdDaysAgo, 9),
          },
        });
        leadIdByEmail[seed.email] = created.id;
        leadsCreated++;
      }
    }

    console.log(`   Leads: ${leadsCreated} created, ${leadsUpdated} already existed (status/assignment refreshed).`);

    // ── Notes ─────────────────────────────────────────────────────────────────
    // Idempotent: only create if that lead has zero notes.

    type NoteSeed = {
      leadEmail:      string;
      authorId:       string;
      content:        string;
      createdDaysAgo: number;
    };

    const noteSeeds: NoteSeed[] = [
      {
        leadEmail:      'arjun.mehta@finedge.example.com',
        authorId:       member.id,
        content:        'Budget approved by procurement. Contract signed and onboarding scheduled for next month.',
        createdDaysAgo: 5,
      },
      {
        leadEmail:      'manish.agarwal@retailflow.example.com',
        authorId:       member.id,
        content:        'Decision maker confirmed. Proposal accepted — deal closed at ₹4.2L annual.',
        createdDaysAgo: 10,
      },
      {
        leadEmail:      'dev.khanna@shipswift.example.com',
        authorId:       member.id,
        content:        'Technical walkthrough completed. Integration with their WMS confirmed. Contract signed.',
        createdDaysAgo: 8,
      },
      {
        leadEmail:      'ananya.gupta@urbannest.example.com',
        authorId:       member.id,
        content:        'Lead went cold after three follow-ups. Budget reallocated to a different initiative.',
        createdDaysAgo: 20,
      },
      {
        leadEmail:      'priya.patel@brightcart.example.com',
        authorId:       member.id,
        content:        'Requested pricing proposal for the annual subscription with team seats for 15 users.',
        createdDaysAgo: 5,
      },
      {
        leadEmail:      'kavya.iyer@greengrid.example.com',
        authorId:       member.id,
        content:        'Follow-up call scheduled for next Tuesday. Decision maker is the VP of Operations.',
        createdDaysAgo: 4,
      },
      {
        leadEmail:      'rahul.sharma@nexora.example.com',
        authorId:       member.id,
        content:        'Interested in integrating CRM with their existing HubSpot marketing stack. Demo scheduled.',
        createdDaysAgo: 7,
      },
      {
        leadEmail:      'rohan.malhotra@datavista.example.com',
        authorId:       member.id,
        content:        'Decision maker requested a technical walkthrough of the API and reporting features.',
        createdDaysAgo: 3,
      },
      {
        leadEmail:      'neha.verma@pixelcraft.example.com',
        authorId:       member.id,
        content:        'Initial call completed. Team of 8 sales reps. Follow-up email with feature overview sent.',
        createdDaysAgo: 5,
      },
      {
        leadEmail:      'ishita.desai@finora.example.com',
        authorId:       admin.id,
        content:        'Proposal sent covering enterprise plan with custom onboarding. Awaiting internal review.',
        createdDaysAgo: 3,
      },
    ];

    let notesCreated = 0;
    let notesSkipped = 0;

    for (const n of noteSeeds) {
      const leadId = leadIdByEmail[n.leadEmail];
      if (!leadId) continue;
      const existingCount = await prisma.note.count({ where: { leadId } });
      if (existingCount === 0) {
        await prisma.note.create({
          data: {
            content:   n.content,
            leadId,
            authorId:  n.authorId,
            createdAt: daysAgo(n.createdDaysAgo, 14),
          },
        });
        notesCreated++;
      } else {
        notesSkipped++;
      }
    }

    console.log(`   Notes: ${notesCreated} created, ${notesSkipped} skipped (lead already had notes).`);

    // ── Activities ────────────────────────────────────────────────────────────
    // Idempotent: only create activities for a lead if it has ZERO activities.
    // This inserts the full lifecycle history in one go on first run.

    type ActivitySeed = {
      leadEmail:      string;
      type:           ActivityType;
      userId:         string | null;
      oldValue:       string | null;
      newValue:       string | null;
      createdDaysAgo: number;
    };

    const activitySeeds: ActivitySeed[] = [
      // Arjun Mehta / WON ───────────────────────────────────────────────────
      { leadEmail: 'arjun.mehta@finedge.example.com', type: ActivityType.LEAD_CREATED,   userId: null,      oldValue: null,        newValue: null,        createdDaysAgo: 60 },
      { leadEmail: 'arjun.mehta@finedge.example.com', type: ActivityType.LEAD_ASSIGNED,  userId: admin.id,  oldValue: null,        newValue: member.id,   createdDaysAgo: 59 },
      { leadEmail: 'arjun.mehta@finedge.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'NEW',       newValue: 'CONTACTED', createdDaysAgo: 50 },
      { leadEmail: 'arjun.mehta@finedge.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'CONTACTED', newValue: 'QUALIFIED', createdDaysAgo: 40 },
      { leadEmail: 'arjun.mehta@finedge.example.com', type: ActivityType.NOTE_ADDED,     userId: member.id, oldValue: null,        newValue: null,        createdDaysAgo: 30 },
      { leadEmail: 'arjun.mehta@finedge.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'QUALIFIED', newValue: 'PROPOSAL',  createdDaysAgo: 20 },
      { leadEmail: 'arjun.mehta@finedge.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'PROPOSAL',  newValue: 'WON',       createdDaysAgo: 10 },

      // Manish Agarwal / WON ─────────────────────────────────────────────────
      { leadEmail: 'manish.agarwal@retailflow.example.com', type: ActivityType.LEAD_CREATED,   userId: null,      oldValue: null,        newValue: null,        createdDaysAgo: 55 },
      { leadEmail: 'manish.agarwal@retailflow.example.com', type: ActivityType.LEAD_ASSIGNED,  userId: admin.id,  oldValue: null,        newValue: member.id,   createdDaysAgo: 54 },
      { leadEmail: 'manish.agarwal@retailflow.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'NEW',       newValue: 'CONTACTED', createdDaysAgo: 45 },
      { leadEmail: 'manish.agarwal@retailflow.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'CONTACTED', newValue: 'QUALIFIED', createdDaysAgo: 35 },
      { leadEmail: 'manish.agarwal@retailflow.example.com', type: ActivityType.NOTE_ADDED,     userId: member.id, oldValue: null,        newValue: null,        createdDaysAgo: 20 },
      { leadEmail: 'manish.agarwal@retailflow.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'QUALIFIED', newValue: 'PROPOSAL',  createdDaysAgo: 18 },
      { leadEmail: 'manish.agarwal@retailflow.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'PROPOSAL',  newValue: 'WON',       createdDaysAgo: 10 },

      // Ananya Gupta / LOST ──────────────────────────────────────────────────
      { leadEmail: 'ananya.gupta@urbannest.example.com', type: ActivityType.LEAD_CREATED,   userId: null,      oldValue: null,        newValue: null,        createdDaysAgo: 50 },
      { leadEmail: 'ananya.gupta@urbannest.example.com', type: ActivityType.LEAD_ASSIGNED,  userId: admin.id,  oldValue: null,        newValue: member.id,   createdDaysAgo: 49 },
      { leadEmail: 'ananya.gupta@urbannest.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'NEW',       newValue: 'CONTACTED', createdDaysAgo: 40 },
      { leadEmail: 'ananya.gupta@urbannest.example.com', type: ActivityType.NOTE_ADDED,     userId: member.id, oldValue: null,        newValue: null,        createdDaysAgo: 30 },
      { leadEmail: 'ananya.gupta@urbannest.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'CONTACTED', newValue: 'LOST',      createdDaysAgo: 20 },

      // Simran Kaur / LOST ───────────────────────────────────────────────────
      { leadEmail: 'simran.kaur@travelnest.example.com', type: ActivityType.LEAD_CREATED,   userId: null,      oldValue: null,        newValue: null,        createdDaysAgo: 45 },
      { leadEmail: 'simran.kaur@travelnest.example.com', type: ActivityType.LEAD_ASSIGNED,  userId: admin.id,  oldValue: null,        newValue: member.id,   createdDaysAgo: 44 },
      { leadEmail: 'simran.kaur@travelnest.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'NEW',       newValue: 'CONTACTED', createdDaysAgo: 38 },
      { leadEmail: 'simran.kaur@travelnest.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'CONTACTED', newValue: 'LOST',      createdDaysAgo: 30 },

      // Priya Patel / PROPOSAL ───────────────────────────────────────────────
      { leadEmail: 'priya.patel@brightcart.example.com', type: ActivityType.LEAD_CREATED,   userId: null,      oldValue: null,        newValue: null,        createdDaysAgo: 30 },
      { leadEmail: 'priya.patel@brightcart.example.com', type: ActivityType.LEAD_ASSIGNED,  userId: admin.id,  oldValue: null,        newValue: member.id,   createdDaysAgo: 29 },
      { leadEmail: 'priya.patel@brightcart.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'NEW',       newValue: 'CONTACTED', createdDaysAgo: 22 },
      { leadEmail: 'priya.patel@brightcart.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'CONTACTED', newValue: 'QUALIFIED', createdDaysAgo: 15 },
      { leadEmail: 'priya.patel@brightcart.example.com', type: ActivityType.NOTE_ADDED,     userId: member.id, oldValue: null,        newValue: null,        createdDaysAgo: 10 },
      { leadEmail: 'priya.patel@brightcart.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'QUALIFIED', newValue: 'PROPOSAL',  createdDaysAgo: 5  },

      // Rahul Sharma / QUALIFIED ─────────────────────────────────────────────
      { leadEmail: 'rahul.sharma@nexora.example.com', type: ActivityType.LEAD_CREATED,   userId: null,      oldValue: null,        newValue: null,        createdDaysAgo: 20 },
      { leadEmail: 'rahul.sharma@nexora.example.com', type: ActivityType.LEAD_ASSIGNED,  userId: admin.id,  oldValue: null,        newValue: member.id,   createdDaysAgo: 19 },
      { leadEmail: 'rahul.sharma@nexora.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'NEW',       newValue: 'CONTACTED', createdDaysAgo: 14 },
      { leadEmail: 'rahul.sharma@nexora.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'CONTACTED', newValue: 'QUALIFIED', createdDaysAgo: 8  },
      { leadEmail: 'rahul.sharma@nexora.example.com', type: ActivityType.NOTE_ADDED,     userId: member.id, oldValue: null,        newValue: null,        createdDaysAgo: 7  },

      // Neha Verma / CONTACTED ───────────────────────────────────────────────
      { leadEmail: 'neha.verma@pixelcraft.example.com', type: ActivityType.LEAD_CREATED,   userId: null,      oldValue: null,        newValue: null,        createdDaysAgo: 10 },
      { leadEmail: 'neha.verma@pixelcraft.example.com', type: ActivityType.LEAD_ASSIGNED,  userId: admin.id,  oldValue: null,        newValue: member.id,   createdDaysAgo: 9  },
      { leadEmail: 'neha.verma@pixelcraft.example.com', type: ActivityType.STATUS_CHANGED, userId: member.id, oldValue: 'NEW',       newValue: 'CONTACTED', createdDaysAgo: 6  },
      { leadEmail: 'neha.verma@pixelcraft.example.com', type: ActivityType.NOTE_ADDED,     userId: member.id, oldValue: null,        newValue: null,        createdDaysAgo: 5  },

      // Vikram Singh / NEW ───────────────────────────────────────────────────
      { leadEmail: 'vikram.singh@cloudpeak.example.com', type: ActivityType.LEAD_CREATED, userId: null, oldValue: null, newValue: null, createdDaysAgo: 5 },

      // Pooja Nair / NEW ─────────────────────────────────────────────────────
      { leadEmail: 'pooja.nair@worknest.example.com', type: ActivityType.LEAD_CREATED, userId: null, oldValue: null, newValue: null, createdDaysAgo: 1 },
    ];

    // Group activity seeds by lead email so we can bulk-insert per lead
    const activitiesByLead: Record<string, ActivitySeed[]> = {};
    for (const a of activitySeeds) {
      (activitiesByLead[a.leadEmail] ??= []).push(a);
    }

    let activitiesCreated = 0;
    let activitiesSkipped = 0;

    for (const [email, seeds] of Object.entries(activitiesByLead)) {
      const leadId = leadIdByEmail[email];
      if (!leadId) continue;
      const existingCount = await prisma.activity.count({ where: { leadId } });
      if (existingCount === 0) {
        // Insert all activities for this lead in one createMany call
        await prisma.activity.createMany({
          data: seeds.map(a => ({
            type:      a.type,
            leadId,
            userId:    a.userId,
            oldValue:  a.oldValue,
            newValue:  a.newValue,
            createdAt: daysAgo(a.createdDaysAgo, 10),
          })),
        });
        activitiesCreated += seeds.length;
      } else {
        activitiesSkipped += seeds.length;
      }
    }

    console.log(`   Activities: ${activitiesCreated} created, ${activitiesSkipped} skipped (lead already had activities).`);
    console.log('\n✅ Seed complete — demo CRM is ready.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
