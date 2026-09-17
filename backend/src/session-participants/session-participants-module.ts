import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma-module';
import { SessionParticipantsController } from './session-participants-controller';
import { SessionParticipantsService } from './session-participants-service';

@Module({
  imports: [PrismaModule],
  controllers: [SessionParticipantsController],
  providers: [SessionParticipantsService],
})
export class SessionParticipantsModule {}
