import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm-module';
import { PrismaModule } from '../prisma-module';
import { TrialCasesController } from './trial-cases-controller';
import { TrialCasesService } from './trial-cases-service';

@Module({
  imports: [PrismaModule, LlmModule],
  controllers: [TrialCasesController],
  providers: [TrialCasesService],
})
export class TrialCasesModule {}
