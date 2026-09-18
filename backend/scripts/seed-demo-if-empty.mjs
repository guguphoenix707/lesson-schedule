import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing required environment variable DATABASE_URL');
}

const client = new Client({ connectionString: databaseUrl });
let seededDemoData = false;

try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM users)
      + (SELECT COUNT(*) FROM students)
      + (SELECT COUNT(*) FROM campuses)
      + (SELECT COUNT(*) FROM guardians)
      + (SELECT COUNT(*) FROM student_guardians)
      + (SELECT COUNT(*) FROM courses)
      + (SELECT COUNT(*) FROM classes)
      + (SELECT COUNT(*) FROM class_sessions)
      + (SELECT COUNT(*) FROM trial_cases)
      + (SELECT COUNT(*) FROM session_participants)
      + (SELECT COUNT(*) FROM follow_ups)
      + (SELECT COUNT(*) FROM session)
      + (SELECT COUNT(*) FROM account)
      + (SELECT COUNT(*) FROM verification) AS total_count
  `);

  if (rows[0]?.total_count !== '0') {
    console.log('Database is not empty; skipped demo seed.');
  } else {
    const seedPath = fileURLToPath(
      new URL('../../db/seed/001-trial-journey.sql', import.meta.url),
    );
    const seedSql = await readFile(seedPath, 'utf8');
    await client.query(seedSql);
    seededDemoData = true;
    console.log('Seeded demo business data.');
  }
} finally {
  await client.end();
}

if (!seededDemoData) {
  process.exit(0);
}

const authSeedPath = fileURLToPath(
  new URL('./seed-auth-accounts.mjs', import.meta.url),
);
const authSeed = spawnSync(process.execPath, [authSeedPath], {
  stdio: 'inherit',
});

if (authSeed.status !== 0) {
  process.exitCode = authSeed.status ?? 1;
}
