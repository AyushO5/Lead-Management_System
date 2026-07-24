import request from 'supertest';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../src/app';
import { resetDatabase, createTestUser, loginAndGetToken } from './helpers';

let adminToken: string;
let memberToken: string;
let memberId: string;

beforeEach(async () => {
  await resetDatabase();
  await createTestUser('Admin User', 'admin@test.com', 'ADMIN', 'adminpass');
  memberId = await createTestUser('Member User', 'member@test.com', 'MEMBER', 'memberpass');
  adminToken = await loginAndGetToken('admin@test.com', 'adminpass');
  memberToken = await loginAndGetToken('member@test.com', 'memberpass');
});

afterAll(async () => {
  await resetDatabase();
});

describe('AUTHORIZATION', () => {
  it('MEMBER cannot GET /api/users (403)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('MEMBER cannot assign leads (403)', async () => {
    const leadRes = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Test Lead', email: 'lead@example.com' });
    expect(leadRes.status).toBe(201);
    const leadId = leadRes.body.data.id;

    const assignRes = await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ userId: memberId });
    expect(assignRes.status).toBe(403);
  });

  it('MEMBER cannot delete leads (403)', async () => {
    const leadRes = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Del Lead', email: 'del@example.com' });
    const leadId = leadRes.body.data.id;

    const delRes = await request(app)
      .delete(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(delRes.status).toBe(403);
  });

  it("MEMBER cannot access another member's lead returns 404 (access denied)", async () => {
    const leadRes = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Private Lead', email: 'priv@example.com' });
    const leadId = leadRes.body.data.id;

    // Assign lead to memberId
    await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberId });

    // Create another member
    await createTestUser('Other Member', 'other@test.com', 'MEMBER', 'otherpass');
    const otherToken = await loginAndGetToken('other@test.com', 'otherpass');

    const getRes = await request(app)
      .get(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    // App returns 404 to avoid leaking resource existence (intentional design)
    expect(getRes.status).toBe(404);
  });

  it('MEMBER can access lead assigned to them (200)', async () => {
    const leadRes = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Assigned Lead', email: 'assign@example.com' });
    const leadId = leadRes.body.data.id;

    await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberId });

    const getRes = await request(app)
      .get(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(leadId);
  });

  it('ADMIN can list all leads (200)', async () => {
    await request(app).post('/api/public/leads').send({ name: 'L1', email: 'l1@example.com' });
    await request(app).post('/api/public/leads').send({ name: 'L2', email: 'l2@example.com' });

    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('ADMIN can GET /api/users (200)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('ADMIN can assign leads (200)', async () => {
    const leadRes = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Assign Test', email: 'assigntest@example.com' });
    const leadId = leadRes.body.data.id;

    const assignRes = await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: memberId });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.assignedToId).toBe(memberId);
  });
});
