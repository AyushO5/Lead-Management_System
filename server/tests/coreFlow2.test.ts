import request from 'supertest';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import app from '../src/app';
import { resetDatabase, createTestUser, loginAndGetToken } from './helpers';
import { prisma } from '../src/lib/prisma';

let adminToken: string;
let memberToken: string;
let memberId: string;
let leadId: string;

beforeEach(async () => {
  await resetDatabase();
  await createTestUser('Admin User', 'admin@test.com', 'ADMIN', 'adminpass');
  memberId = await createTestUser('Member User', 'member@test.com', 'MEMBER', 'memberpass');
  adminToken = await loginAndGetToken('admin@test.com', 'adminpass');
  memberToken = await loginAndGetToken('member@test.com', 'memberpass');

  // Create a lead and assign it to member
  const leadRes = await request(app)
    .post('/api/public/leads')
    .send({ name: 'Assigned Lead', email: 'assigned@example.com' });
  leadId = leadRes.body.data.id;

  await request(app)
    .patch(`/api/leads/${leadId}/assign`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ userId: memberId });
});

afterAll(async () => {
  await resetDatabase();
});

describe('CORE FLOW 2 – Member updates status and adds note', () => {
  it('member changes status, activity logged, adds note, note activity logged', async () => {
    // 1. Member updates status from NEW to CONTACTED
    const statusRes = await request(app)
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'CONTACTED' });
    expect(statusRes.status).toBe(200);
    // API wraps: { data: { status, ... } }
    expect(statusRes.body.data.status).toBe('CONTACTED');

    // Verify STATUS_CHANGED activity
    const statusActivities = await prisma.activity.findMany({ where: { leadId } });
    const statusAct = statusActivities.find((a) => a.type === 'STATUS_CHANGED');
    expect(statusAct).toBeDefined();
    expect(statusAct?.oldValue).toBe('NEW');
    expect(statusAct?.newValue).toBe('CONTACTED');

    // 2. Member adds a note
    const noteRes = await request(app)
      .post(`/api/leads/${leadId}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ content: 'Follow-up call scheduled' });
    expect(noteRes.status).toBe(201);
    // API wraps: { data: { id, content, author, ... } }
    const note = noteRes.body.data;
    expect(note.id).toBeDefined();
    expect(note.content).toBe('Follow-up call scheduled');

    // Retrieve notes and verify
    const notesRes = await request(app)
      .get(`/api/leads/${leadId}/notes`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(notesRes.status).toBe(200);
    // API wraps: { data: [...] }
    const notes = notesRes.body.data;
    const found = notes.find((n: any) => n.id === note.id);
    expect(found).toBeDefined();
    expect(found.content).toBe('Follow-up call scheduled');

    // Verify NOTE_ADDED activity exists — service intentionally stores no newValue for notes
    const noteActivities = await prisma.activity.findMany({ where: { leadId } });
    const noteAct = noteActivities.find((a) => a.type === 'NOTE_ADDED');
    expect(noteAct).toBeDefined();
    expect(noteAct?.leadId).toBe(leadId);
    expect(noteAct?.userId).toBe(memberId);
    expect(noteAct?.createdAt).toBeDefined();
  });
});
