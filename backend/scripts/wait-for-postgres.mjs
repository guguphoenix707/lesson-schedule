import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing required environment variable DATABASE_URL');
}

const intervalMs = 3000;
const retries = 20;

for (let attempt = 1; attempt <= retries; attempt += 1) {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    console.log('Postgres is ready');
    process.exit(0);
  } catch (error) {
    await client.end().catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Postgres not ready (${attempt}/${retries}): ${message}`,
    );
    if (attempt === retries) {
      process.exit(1);
    }
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
}
