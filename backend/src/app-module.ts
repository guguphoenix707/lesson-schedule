import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth-module';
import { CommonModule } from './common/common-module';
import { PrismaModule } from './prisma-module';
import { SessionParticipantsModule } from './session-participants/session-participants-module';
import { StudentsModule } from './students/students-module';
import { TrialCasesModule } from './trial-cases/trial-cases-module';
import { TrialTasklistModule } from './trial-tasklist/trial-tasklist-module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CommonModule,
    StudentsModule,
    SessionParticipantsModule,
    TrialTasklistModule,
    TrialCasesModule,
  ],
})
export class AppModule {}
