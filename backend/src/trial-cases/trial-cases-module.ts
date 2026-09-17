import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma-module';
import { TrialCasesController } from './trial-cases-controller';
import { TrialCasesService } from './trial-cases-service';

@Module({
  imports: [PrismaModule],
  controllers: [TrialCasesController],
  providers: [TrialCasesService],
})
export class TrialCasesModule {}
