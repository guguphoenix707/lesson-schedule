import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { FollowUpOutcome, TrialCaseStatus } from '../generated/prisma/client';
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
      select: {
        id: true,
        student: {
          select: { id: true, displayName: true },
        },
      },
    });

    if (!trialCase) {
      throw new NotFoundException();
    }

    const occupied = await this.prisma.client.sessionParticipant.findMany({
      where: { studentId: trialCase.student.id },
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
      student: trialCase.student,
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

        const isReschedule = trialCase.status === 'scheduled';
        if (trialCase.status !== 'pending_schedule' && !isReschedule) {
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
          select: { id: true, sessionId: true },
        });
        if (isReschedule) {
          if (!openBooking) {
            throw new ConflictException('没有可改期的试听安排');
          }
        } else if (openBooking) {
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

        if (isReschedule && openBooking?.sessionId === session.id) {
          throw new ConflictException('请选择其他课次');
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

        if (isReschedule && openBooking) {
          const cancelled = await tx.sessionParticipant.updateMany({
            where: {
              id: openBooking.id,
              bookingStatus: 'booked',
              attendance: 'pending',
            },
            data: {
              bookingStatus: 'cancelled',
              cancelledAt: new Date(),
              cancelReason: '改期',
            },
          });
          if (cancelled.count !== 1) {
            throw new ConflictException('没有可改期的试听安排');
          }
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

        if (!isReschedule) {
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

  async getFollowup(user: AuthenticatedUser, trialCaseId: string) {
    const ability = this.requireTrialCaseRead(user);
    const trialCase = await this.prisma.client.trialCase.findFirst({
      where: {
        AND: [
          { id: trialCaseId },
          accessibleBy(ability).ofType('TrialCase'),
        ],
      },
      select: followupDetailSelect,
    });

    if (!trialCase) {
      throw new NotFoundException();
    }

    return toFollowupDetail(trialCase);
  }

  async saveFollowupDraft(
    user: AuthenticatedUser,
    trialCaseId: string,
    body: unknown,
  ) {
    const ability = this.requireTrialCaseUpdate(user);
    const followupDraft = parseFollowupDraft(body);

    const owned = await this.prisma.client.trialCase.findFirst({
      where: {
        AND: [
          { id: trialCaseId },
          accessibleBy(ability, 'update').ofType('TrialCase'),
        ],
      },
      select: { id: true, status: true },
    });

    if (!owned) {
      throw new NotFoundException();
    }

    if (!isFollowupStatus(owned.status)) {
      throw new ConflictException('当前状态不能保存沟通草稿');
    }

    const updated = await this.prisma.client.trialCase.updateMany({
      where: {
        id: owned.id,
        status: { in: followupStatuses },
      },
      data: { followupDraft },
    });
    if (updated.count !== 1) {
      throw new ConflictException('当前状态不能保存沟通草稿');
    }

    return { ok: true as const, followupDraft };
  }

  async createFollowUp(
    user: AuthenticatedUser,
    trialCaseId: string,
    body: unknown,
  ) {
    const ability = this.requireTrialCaseUpdate(user);
    const input = parseFollowUpBody(body);

    try {
      await this.prisma.client.$transaction(async (tx) => {
        const owned = await tx.trialCase.findFirst({
          where: {
            AND: [
              { id: trialCaseId },
              accessibleBy(ability, 'update').ofType('TrialCase'),
            ],
          },
          select: { id: true },
        });

        if (!owned) {
          throw new NotFoundException();
        }

        await tx.$queryRaw`
          SELECT id FROM trial_cases WHERE id = ${owned.id} FOR UPDATE
        `;

        const trialCase = await tx.trialCase.findUnique({
          where: { id: owned.id },
          select: { id: true, status: true },
        });

        if (!trialCase) {
          throw new NotFoundException();
        }

        if (!isFollowupStatus(trialCase.status)) {
          throw new ConflictException('当前状态不能提交跟进');
        }

        await tx.followUp.create({
          data: {
            trialCaseId: trialCase.id,
            authorAdminId: user.id,
            outcome: input.outcome,
            summary: input.summary,
            nextFollowupAt: input.nextFollowupAt,
          },
        });

        const updated = await tx.trialCase.updateMany({
          where: {
            id: trialCase.id,
            status: { in: followupStatuses },
          },
          data: followUpTrialCaseData(input),
        });
        if (updated.count !== 1) {
          throw new ConflictException('当前状态不能提交跟进');
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
      throw error;
    }

    return { ok: true as const };
  }

  private requireTrialCaseRead(user: AuthenticatedUser) {
    const ability = createAbilityFor(user);
    if (!ability.can('read', 'TrialCase')) {
      throw new ForbiddenException();
    }
    return ability;
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

const followupStatuses: FollowupStatus[] = [
  'pending_followup',
  'following_up',
];

type FollowupStatus = 'pending_followup' | 'following_up';

type FollowUpInput =
  | {
      outcome: 'unreachable';
      summary: string | null;
      nextFollowupAt: Date;
    }
  | {
      outcome: 'considering';
      summary: string;
      nextFollowupAt: Date;
    }
  | {
      outcome: 'interested';
      summary: string;
      nextFollowupAt: null;
    }
  | {
      outcome: 'not_interested';
      summary: string;
      closedReason: string;
      nextFollowupAt: null;
    };

const followupDetailSelect = {
  id: true,
  status: true,
  nextFollowupAt: true,
  followupDraft: true,
  closedReason: true,
  student: {
    select: { id: true, displayName: true },
  },
  participants: {
    where: { kind: 'trial', attendance: 'present' },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      teacherFeedback: true,
      session: {
        select: {
          startsAt: true,
          endsAt: true,
          class: { select: { name: true } },
          assignedTeacher: { select: { displayName: true } },
        },
      },
    },
  },
  followUps: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      outcome: true,
      summary: true,
      nextFollowupAt: true,
      createdAt: true,
      authorAdmin: { select: { displayName: true } },
    },
  },
} satisfies Prisma.TrialCaseSelect;

function isFollowupStatus(status: TrialCaseStatus): status is FollowupStatus {
  return status === 'pending_followup' || status === 'following_up';
}

function toFollowupDetail(
  trialCase: Prisma.TrialCaseGetPayload<{ select: typeof followupDetailSelect }>,
) {
  const present = trialCase.participants[0];
  return {
    id: trialCase.id,
    status: trialCase.status,
    nextFollowupAt: trialCase.nextFollowupAt?.toISOString() ?? null,
    followupDraft: trialCase.followupDraft,
    closedReason: trialCase.closedReason,
    student: trialCase.student,
    teacherFeedback: present
      ? toTeacherFeedbackView(present.teacherFeedback, present.session)
      : null,
    followUps: trialCase.followUps.map((followUp) => ({
      id: followUp.id,
      outcome: followUp.outcome,
      summary: followUp.summary,
      nextFollowupAt: followUp.nextFollowupAt?.toISOString() ?? null,
      createdAt: followUp.createdAt.toISOString(),
      authorName: followUp.authorAdmin.displayName,
    })),
  };
}

function toTeacherFeedbackView(
  value: Prisma.JsonValue | null,
  session: {
    startsAt: Date;
    endsAt: Date;
    class: { name: string };
    assignedTeacher: { displayName: string };
  },
) {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.performance !== 'string' ||
    typeof value.fit_suggestion !== 'string'
  ) {
    return null;
  }
  const questionsForAdmin =
    typeof value.questions_for_admin === 'string' &&
    value.questions_for_admin.trim().length > 0
      ? value.questions_for_admin
      : null;
  return {
    performance: value.performance,
    fitSuggestion: value.fit_suggestion,
    questionsForAdmin,
    session: {
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      className: session.class.name,
      teacherName: session.assignedTeacher.displayName,
    },
  };
}

function parseFollowupDraft(body: unknown): string | null {
  if (!isRecord(body)) {
    throw new BadRequestException('请求无效');
  }
  if (body.followupDraft === undefined || body.followupDraft === null) {
    return null;
  }
  if (typeof body.followupDraft !== 'string') {
    throw new BadRequestException('沟通草稿格式无效');
  }
  const text = body.followupDraft.trim();
  return text.length > 0 ? text : null;
}

function parseFollowUpBody(body: unknown): FollowUpInput {
  if (!isRecord(body)) {
    throw new BadRequestException('请求无效');
  }
  if (!isFollowUpOutcome(body.outcome)) {
    throw new BadRequestException('请选择跟进结果');
  }

  if (body.outcome === 'unreachable') {
    return {
      outcome: 'unreachable',
      summary: optionalText(body.summary, '沟通摘要格式无效'),
      nextFollowupAt: parseFutureDate(body.nextFollowupAt),
    };
  }

  if (body.outcome === 'considering') {
    return {
      outcome: 'considering',
      summary: requiredText(body.summary, '请填写沟通摘要'),
      nextFollowupAt: parseFutureDate(body.nextFollowupAt),
    };
  }

  if (body.outcome === 'interested') {
    return {
      outcome: 'interested',
      summary: requiredText(body.summary, '请填写沟通摘要'),
      nextFollowupAt: null,
    };
  }

  return {
    outcome: 'not_interested',
    summary: requiredText(body.summary, '请填写沟通摘要'),
    closedReason: requiredText(body.closedReason, '请填写关闭原因'),
    nextFollowupAt: null,
  };
}

function followUpTrialCaseData(
  input: FollowUpInput,
): Prisma.TrialCaseUpdateManyMutationInput {
  if (input.outcome === 'unreachable' || input.outcome === 'considering') {
    return {
      status: 'following_up',
      nextFollowupAt: input.nextFollowupAt,
    };
  }
  if (input.outcome === 'interested') {
    return {
      status: 'interested',
      nextFollowupAt: null,
    };
  }
  return {
    status: 'closed',
    nextFollowupAt: null,
    closedReason: input.closedReason,
  };
}

function isFollowUpOutcome(value: unknown): value is FollowUpOutcome {
  return (
    value === 'unreachable' ||
    value === 'considering' ||
    value === 'interested' ||
    value === 'not_interested'
  );
}

function parseFutureDate(value: unknown): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException('请选择下次跟进时间');
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('下次跟进时间格式无效');
  }
  if (date.getTime() <= Date.now()) {
    throw new BadRequestException('下次跟进时间必须是未来时间');
  }
  return date;
}

function requiredText(value: unknown, message: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(message);
  }
  const text = value.trim();
  if (text.length === 0) {
    throw new BadRequestException(message);
  }
  return text;
}

function optionalText(value: unknown, message: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(message);
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
