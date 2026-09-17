import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth-module';
import { PrismaModule } from './prisma-module';
import { SessionParticipantsModule } from './session-participants/session-participants-module';
import { StudentsModule } from './students/students-module';
import { TrialTasklistModule } from './trial-tasklist/trial-tasklist-module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StudentsModule,
    SessionParticipantsModule,
    TrialTasklistModule,
  ],
})
export class AppModule {}
