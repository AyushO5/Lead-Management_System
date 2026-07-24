import request from 'supertest';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../src/app';
import { resetDatabase, createTestUser, loginAndGetToken } from './helpers';
import { prisma } from '../src/lib/prisma';

let adminToken: string;
let memberId: string;

beforeEach(async () => {
  await resetDatabase();
  await createTestUser('Admin User', 'admin@test.com', 'ADMIN', 'adminpass');
  memberId = await createTestUser('Member User', 'member@test.com', 'MEMBER', 'memberpass');
  adminToken = await loginAndGetToken('admin@test.com', 'adminpass');
});

afterAll(async () => {
  await resetDatabase();
});

describe('CORE FLOW 1 – Public lead creation and admin assignment', () => {
  it('creates a lead, admin assigns to member, activity logged', async () => {
    // 1. Public lead creation (no auth)
    const leadRes = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Public Lead', email: 'public@example.com' });
    expect(leadRes.status).toBe(201);
    // API wraps: { data: { id, status, assignedToId, ... } }
    const lead = leadRes.body.data;
    expect(lead.status).toBe('NEW');
    expect(lead.assignedToId).toBeNull();

    // 2. Admin retrieves the lead
    const getRes = await request(app)
      .get(`/api/leads/${lead.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(lead.id);

    // 3. Admin assigns lead to member
    const assignRes = await request(app)
      .patch(`/api/leads/${lead.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberId });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.assignedToId).toBe(memberId);

    // 4. Verify activity logged
    const activities = await prisma.activity.findMany({ where: { leadId: lead.id } });
    const assignActivity = activities.find((a) => a.type === 'LEAD_ASSIGNED');
    expect(assignActivity).toBeDefined();
    expect(assignActivity?.newValue).toBe(memberId);
  });
});
