import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma-module';
import { TrialTasklistController } from './trial-tasklist-controller';
import { TrialTasklistService } from './trial-tasklist-service';

@Module({
  imports: [PrismaModule],
  controllers: [TrialTasklistController],
  providers: [TrialTasklistService],
})
export class TrialTasklistModule {}
