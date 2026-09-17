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
          where: { bookingStatus: 'booked', attendance: 'pending' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            session: {
              select: { endsAt: true, status: true },
            },
          },
        },
      },
    });

    return {
      items: trialCases.map((trialCase) => {
        const pendingSession = trialCase.participants[0]?.session;
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
