// tests/env-setup.ts
// Load test environment variables before any other modules are imported.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Safety checks
if (process.env.NODE_ENV !== 'test') {
  console.warn('Warning: NODE_ENV is not set to "test".');
}

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error('TEST_DATABASE_URL environment variable is not set');
}

// Parse URL without exposing credentials
try {
  const parsed = new URL(testUrl);
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const pathname = parsed.pathname; // format /dbname
  const dbName = pathname.replace(/^\//, '').split('?')[0];
  console.log('✅ Test DB configuration detected:', `database=${dbName}`, `host=${host}`, `port=${port}`);
} catch (e) {
  console.error('Failed to parse TEST_DATABASE_URL');
  // rethrow to fail early
  throw e;
}
