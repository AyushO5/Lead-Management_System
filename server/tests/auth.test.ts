import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app';
import { resetDatabase, createTestUser, loginAndGetToken } from './helpers';

let adminToken: string;
let adminId: string;

beforeAll(async () => {
  await resetDatabase();

  adminId = await createTestUser('Admin Test', 'admin@test.com', 'ADMIN', 'adminpass');
  await createTestUser('Member Test', 'member@test.com', 'MEMBER', 'memberpass');

  adminToken = await loginAndGetToken('admin@test.com', 'adminpass');
});

afterAll(async () => {
  await resetDatabase();
});

describe('AUTHENTICATION', () => {
  it('valid admin login returns 200 with token and user (no passwordHash)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'adminpass' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('invalid password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('protected route without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('invalid JWT returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });

  it('JWT with invalid claims returns 401', async () => {
    const secret = process.env.JWT_SECRET;
    expect(secret).toBeTruthy();

    const token = jwt.sign(
      { userId: 'test-user', role: 'INVALID' },
      secret as string,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('/api/auth/me with valid token returns user without passwordHash', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const user = res.body?.data?.user ?? res.body?.data;
    expect(user).toHaveProperty('id', adminId);
    expect(user.passwordHash).toBeUndefined();
  });
});
