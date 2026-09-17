import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { prisma } from './prisma-client';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client = prisma;

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
