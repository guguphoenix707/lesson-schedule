import { hashPassword } from 'better-auth/crypto';
import { DEMO_PASSWORD, DEMO_STAFF } from '../dist/src/auth/demo-staff.js';
import { prisma } from '../dist/src/prisma-client.js';

async function seedAuthAccounts() {
  const now = new Date();

  for (const staff of DEMO_STAFF) {
    const password = await hashPassword(DEMO_PASSWORD);
    await prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: 'credential',
          accountId: staff.id,
        },
      },
      update: {
        password,
        updatedAt: now,
      },
      create: {
        id: crypto.randomUUID(),
        providerId: 'credential',
        accountId: staff.id,
        userId: staff.id,
        password,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}

seedAuthAccounts()
  .then(async () => {
    console.log(
      `Seeded Better Auth credentials for ${DEMO_STAFF.length} demo staff accounts.`,
    );
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
