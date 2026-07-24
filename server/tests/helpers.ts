import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';
import request from 'supertest';
import app from '../src/app';

/**
 * Truncate all tables in FK-safe order.
 * Never touches lead_management — only runs against lead_management_test (enforced by setup.ts).
 */
export async function resetDatabase() {
  await prisma.activity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(
  name: string,
  email: string,
  role: 'ADMIN' | 'MEMBER',
  password: string,
) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, role, passwordHash } });
  return user.id;
}

/**
 * Login and return the JWT token.
 * API response shape: { data: { token, user } }
 */
export async function loginAndGetToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(
      `loginAndGetToken: login failed for ${email} — HTTP ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }
  const token = res.body?.data?.token as string | undefined;
  if (!token) {
    throw new Error(
      `loginAndGetToken: no token in response for ${email} — body: ${JSON.stringify(res.body)}`,
    );
  }
  return token;
}
