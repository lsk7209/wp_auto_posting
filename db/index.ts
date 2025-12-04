import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL || 'libsql://mock-db.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || 'mock-token';

export const client = createClient({
    url,
    authToken,
});

export const db = drizzle(client, { schema });
