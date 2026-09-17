import { ForbiddenException, Injectable } from '@nestjs/common';
import { accessibleBy, createAbilityFor } from '../auth/ability';
import type { AuthenticatedUser } from '../auth/session-guard';
import { PrismaService } from '../prisma-service';
import { allowedAdminActions, derivedSessionLabel } from '../trial/trial-case-view';

@Injectable()
export class TrialTasklistService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(user: AuthenticatedUser) {
    const ability = this.requireTrialCaseRead(user);
    const trialCases = await this.prisma.client.trialCase.findMany({
      where: {
        AND: [
          accessibleBy(ability).ofType('TrialCase'),
          { student: { ownerAdminId: user.id } },
        ],
      },
      orderBy: [{ status: 'asc' }, { student: { displayName: 'asc' } }],
      select: {
        id: true,
        status: true,
        nextFollowupAt: true,
        student: {
          select: { id: true, displayName: true },
        },
        participants: {
          where: {
            bookingStatus: 'booked',
            attendance: { in: ['pending', 'present'] },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            attendance: true,
            session: {
              select: {
                startsAt: true,
                endsAt: true,
                status: true,
                class: {
                  select: {
                    course: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      items: trialCases.map((trialCase) => {
        const pendingSession = trialCase.participants.find(
          (participant) => participant.attendance === 'pending',
        )?.session;
        return {
          id: trialCase.id,
          status: trialCase.status,
          derivedSessionLabel: derivedSessionLabel(
            trialCase.status,
            pendingSession,
          ),
          nextFollowupAt: trialCase.nextFollowupAt?.toISOString() ?? null,
          allowedActions: allowedAdminActions(trialCase.status),
          student: trialCase.student,
          arrangement: toArrangement(trialCase.status, trialCase.participants),
        };
      }),
    };
  }

  private requireTrialCaseRead(user: AuthenticatedUser) {
    const ability = createAbilityFor(user);
    if (!ability.can('read', 'TrialCase')) {
      throw new ForbiddenException();
    }
    return ability;
  }
}

type BookedParticipant = {
  attendance: 'pending' | 'present' | 'absent';
  session: {
    startsAt: Date;
    endsAt: Date;
    status: 'scheduled' | 'completed' | 'cancelled';
    class: { course: { name: string } };
  };
};

function toArrangement(
  status: string,
  participants: BookedParticipant[],
) {
  const pending = participants.find(
    (participant) => participant.attendance === 'pending',
  );
  const present = participants.find(
    (participant) => participant.attendance === 'present',
  );
  const chosen = status === 'scheduled' ? pending : (present ?? pending);
  if (!chosen || chosen.session.status === 'cancelled') {
    return null;
  }

  return {
    courseName: chosen.session.class.course.name,
    startsAt: chosen.session.startsAt.toISOString(),
    endsAt: chosen.session.endsAt.toISOString(),
  };
}
