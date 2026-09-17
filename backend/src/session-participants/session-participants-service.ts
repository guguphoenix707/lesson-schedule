import { ForbiddenException, Injectable } from '@nestjs/common';
import { accessibleBy, createAbilityFor } from '../auth/ability';
import type { AuthenticatedUser } from '../auth/session-guard';
import { PrismaService } from '../prisma-service';

@Injectable()
export class SessionParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPendingForTeacher(user: AuthenticatedUser) {
    const ability = this.requireParticipantRead(user);
    const participants = await this.prisma.client.sessionParticipant.findMany({
      where: {
        AND: [
          accessibleBy(ability).ofType('SessionParticipant'),
          {
            kind: 'trial',
            bookingStatus: 'booked',
            attendance: 'pending',
            trialCase: { status: 'scheduled' },
            session: {
              assignedTeacherId: user.id,
              status: { not: 'cancelled' },
              endsAt: { lte: new Date() },
            },
          },
        ],
      },
      orderBy: [
        { session: { endsAt: 'asc' } },
        { student: { displayName: 'asc' } },
      ],
      select: {
        id: true,
        studentId: true,
        trialCaseId: true,
        trialCase: {
          select: { status: true },
        },
        student: {
          select: { displayName: true },
        },
        session: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            class: { select: { name: true } },
          },
        },
      },
    });

    return {
      items: participants.map((participant) => ({
        id: participant.id,
        studentId: participant.studentId,
        studentDisplayName: participant.student.displayName,
        trialCaseId: participant.trialCaseId,
        status: participant.trialCase.status,
        session: {
          id: participant.session.id,
          startsAt: participant.session.startsAt.toISOString(),
          endsAt: participant.session.endsAt.toISOString(),
          className: participant.session.class.name,
        },
      })),
    };
  }

  private requireParticipantRead(user: AuthenticatedUser) {
    const ability = createAbilityFor(user);
    if (!ability.can('read', 'SessionParticipant')) {
      throw new ForbiddenException();
    }
    return ability;
  }
}
