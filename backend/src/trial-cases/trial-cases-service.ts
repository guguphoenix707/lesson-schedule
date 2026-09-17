import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { accessibleBy, createAbilityFor } from '../auth/ability';
import type { AuthenticatedUser } from '../auth/session-guard';
import { PrismaService } from '../prisma-service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TrialCasesService {
  constructor(private readonly prisma: PrismaService) {}

  async listSchedulableSessions(user: AuthenticatedUser, trialCaseId: string) {
    const ability = this.requireTrialCaseUpdate(user);
    const trialCase = await this.prisma.client.trialCase.findFirst({
      where: {
        AND: [
          { id: trialCaseId },
          accessibleBy(ability, 'update').ofType('TrialCase'),
        ],
      },
      select: { id: true, studentId: true },
    });

    if (!trialCase) {
      throw new NotFoundException();
    }

    const occupied = await this.prisma.client.sessionParticipant.findMany({
      where: { studentId: trialCase.studentId },
      select: { sessionId: true },
    });
    const occupiedSessionIds = occupied.map((row) => row.sessionId);

    const sessions = await this.prisma.client.classSession.findMany({
      where: {
        status: { not: 'cancelled' },
        startsAt: { gt: new Date() },
        ...(occupiedSessionIds.length > 0
          ? { id: { notIn: occupiedSessionIds } }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        assignedTeacher: {
          select: { id: true, displayName: true },
        },
        class: {
          select: {
            name: true,
            course: { select: { id: true, name: true } },
          },
        },
      },
    });

    return {
      items: sessions.map((session) => ({
        id: session.id,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        className: session.class.name,
        course: session.class.course,
        teacher: session.assignedTeacher,
      })),
    };
  }

  async schedule(user: AuthenticatedUser, trialCaseId: string, body: unknown) {
    const ability = this.requireTrialCaseUpdate(user);
    const sessionId = parseSessionId(body);

    try {
      await this.prisma.client.$transaction(async (tx) => {
        const owned = await tx.trialCase.findFirst({
          where: {
            AND: [
              { id: trialCaseId },
              accessibleBy(ability, 'update').ofType('TrialCase'),
            ],
          },
          select: { id: true, studentId: true },
        });

        if (!owned) {
          throw new NotFoundException();
        }

        await tx.$queryRaw`
          SELECT id FROM trial_cases WHERE id = ${owned.id} FOR UPDATE
        `;

        const trialCase = await tx.trialCase.findUnique({
          where: { id: owned.id },
          select: { id: true, studentId: true, status: true },
        });

        if (!trialCase) {
          throw new NotFoundException();
        }

        if (trialCase.status !== 'pending_schedule') {
          throw new ConflictException('当前状态不能安排试听');
        }

        const completedTrial = await tx.sessionParticipant.findFirst({
          where: {
            trialCaseId: trialCase.id,
            kind: 'trial',
            attendance: 'present',
          },
          select: { id: true },
        });
        if (completedTrial) {
          throw new ConflictException('该学生已完成试听，不能再安排');
        }

        const openBooking = await tx.sessionParticipant.findFirst({
          where: {
            trialCaseId: trialCase.id,
            kind: 'trial',
            bookingStatus: 'booked',
            attendance: 'pending',
          },
          select: { id: true },
        });
        if (openBooking) {
          throw new ConflictException('已有待上课的试听安排');
        }

        const session = await tx.classSession.findUnique({
          where: { id: sessionId },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
          },
        });

        if (!session || session.status === 'cancelled') {
          throw new BadRequestException('课次不存在或已取消');
        }
        if (session.startsAt.getTime() <= Date.now()) {
          throw new BadRequestException('不能安排已开始的课次');
        }

        const existingOnSession = await tx.sessionParticipant.findUnique({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: trialCase.studentId,
            },
          },
          select: { id: true },
        });
        if (existingOnSession) {
          throw new ConflictException('该课次已有该学生的预约记录');
        }

        const overlapping = await tx.sessionParticipant.findFirst({
          where: {
            studentId: trialCase.studentId,
            bookingStatus: 'booked',
            attendance: 'pending',
            session: {
              status: { not: 'cancelled' },
              startsAt: { lt: session.endsAt },
              endsAt: { gt: session.startsAt },
            },
          },
          select: { id: true },
        });
        if (overlapping) {
          throw new ConflictException('与学生已有课次时间冲突');
        }

        await tx.sessionParticipant.create({
          data: {
            studentId: trialCase.studentId,
            sessionId: session.id,
            trialCaseId: trialCase.id,
            kind: 'trial',
            bookingStatus: 'booked',
            attendance: 'pending',
          },
        });

        const updated = await tx.trialCase.updateMany({
          where: {
            id: trialCase.id,
            status: 'pending_schedule',
          },
          data: { status: 'scheduled' },
        });
        if (updated.count !== 1) {
          throw new ConflictException('当前状态不能安排试听');
        }
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('该课次已有该学生的预约记录');
      }
      throw error;
    }

    return { ok: true as const };
  }

  private requireTrialCaseUpdate(user: AuthenticatedUser) {
    const ability = createAbilityFor(user);
    if (!ability.can('update', 'TrialCase')) {
      throw new ForbiddenException();
    }
    return ability;
  }
}

function parseSessionId(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException('请求无效');
  }
  const { sessionId } = body as { sessionId?: unknown };
  if (typeof sessionId !== 'string' || !uuidPattern.test(sessionId)) {
    throw new BadRequestException('请选择课次');
  }
  return sessionId;
}
