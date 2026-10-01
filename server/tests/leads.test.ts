import request from 'supertest';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../src/app';
import { resetDatabase, createTestUser, loginAndGetToken } from './helpers';
import { prisma } from '../src/lib/prisma';

let adminToken: string;
let memberId: string;
let leadId: string;

beforeEach(async () => {
  await resetDatabase();
  const adminId = await createTestUser('Admin User', 'admin@test.com', 'ADMIN', 'adminpass');
  memberId = await createTestUser('Member User', 'member@test.com', 'MEMBER', 'memberpass');
  adminToken = await loginAndGetToken('admin@test.com', 'adminpass');

  // Create a lead
  const leadRes = await request(app)
    .post('/api/public/leads')
    .send({ name: 'Update Test Lead', email: 'update@example.com' });
  leadId = leadRes.body.data.id;

  // Assign to member so we can test assignedTo filter
  await request(app)
    .patch(`/api/leads/${leadId}/assign`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ userId: memberId });
});

afterAll(async () => {
  await resetDatabase();
});

describe('LEADS SERVICE & ENDPOINTS', () => {
  it('updates lead status only (no other fields)', async () => {
    const statusRes = await request(app)
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'QUALIFIED' });
      
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('QUALIFIED');
    expect(statusRes.body.data.name).toBe('Update Test Lead');
    
    const activities = await prisma.activity.findMany({ where: { leadId } });
    const statusAct = activities.find((a) => a.type === 'STATUS_CHANGED');
    expect(statusAct).toBeDefined();
    expect(statusAct?.newValue).toBe('QUALIFIED');
  });

  it('updates lead status and another field simultaneously', async () => {
    const updateRes = await request(app)
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PROPOSAL', name: 'Renamed Lead' });
      
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('PROPOSAL');
    expect(updateRes.body.data.name).toBe('Renamed Lead');
    
    // Ensure the lead in DB is correct
    const leadInDb = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(leadInDb?.status).toBe('PROPOSAL');
    expect(leadInDb?.name).toBe('Renamed Lead');
    
    const activities = await prisma.activity.findMany({ where: { leadId } });
    const statusAct = activities.find((a) => a.type === 'STATUS_CHANGED');
    expect(statusAct).toBeDefined();
    expect(statusAct?.newValue).toBe('PROPOSAL');
  });

  it('filters leads by assignedTo (admin only)', async () => {
    // We already have 1 lead assigned to memberId. Let's create another lead unassigned.
    await request(app)
      .post('/api/public/leads')
      .send({ name: 'Unassigned', email: 'unassigned@example.com' });

    // Filter by the member's ID
    const res = await request(app)
      .get(`/api/leads?assignedTo=${memberId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].assignedToId).toBe(memberId);
    
    // Filter by invalid CUID (doesn't exist but is valid CUID format) - wait, cuid format is required.
    // If we send invalid CUID, we should get 400 or empty. Zod .cuid() will fail if it's not a valid CUID format.
    // We can just test a random valid CUID or omit to see it gets both.
    
    const resAll = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(resAll.status).toBe(200);
    expect(resAll.body.data.length).toBeGreaterThanOrEqual(2);
  });
  
  it('assignedTo filter rejects invalid format (e.g. uuid)', async () => {
    const res = await request(app)
      .get(`/api/leads?assignedTo=123e4567-e89b-12d3-a456-426614174000`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.status).toBe(400); // Because zod .cuid() fails on UUID
  });
});
