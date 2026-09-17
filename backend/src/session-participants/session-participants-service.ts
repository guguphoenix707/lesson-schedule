import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { AppAbility } from '../auth/ability';
import { accessibleBy, createAbilityFor } from '../auth/ability';
import type { AuthenticatedUser } from '../auth/session-guard';
import { PrismaService } from '../prisma-service';

type PresentAttendance = {
  attendance: 'present';
  performance: string;
  fitSuggestion: string;
  questionsForAdmin?: string;
};

type AbsentAttendance = {
  attendance: 'absent';
  absentNote?: string;
};

type RecordedAttendance = PresentAttendance | AbsentAttendance;

const participantTaskSelect = {
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
} satisfies Prisma.SessionParticipantSelect;

@Injectable()
export class SessionParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPendingForTeacher(user: AuthenticatedUser) {
    const ability = this.requireParticipantAction(user, 'read');
    const participants = await this.prisma.client.sessionParticipant.findMany({
      where: pendingProcessWhere(ability, user.id),
      orderBy: [
        { session: { endsAt: 'asc' } },
        { student: { displayName: 'asc' } },
      ],
      select: participantTaskSelect,
    });

    return {
      items: participants.map(toTeacherTrialTask),
    };
  }

  async getPendingForTeacher(user: AuthenticatedUser, participantId: string) {
    const ability = this.requireParticipantAction(user, 'read');
    const participant = await this.prisma.client.sessionParticipant.findFirst({
      where: pendingProcessWhere(ability, user.id, participantId),
      select: participantTaskSelect,
    });

    if (!participant) {
      throw new NotFoundException('该试听不在待处理名单');
    }

    return toTeacherTrialTask(participant);
  }

  async recordAttendanceForTeacher(
    user: AuthenticatedUser,
    participantId: string,
    body: unknown,
  ) {
    const ability = this.requireParticipantAction(user, 'update');
    const input = parseAttendanceBody(body);

    try {
      await this.prisma.client.$transaction(async (tx) => {
        const participant = await tx.sessionParticipant.findFirst({
          where: {
            AND: [
              { id: participantId },
              accessibleBy(ability, 'update').ofType('SessionParticipant'),
            ],
          },
          select: {
            id: true,
            attendance: true,
            bookingStatus: true,
            trialCaseId: true,
            trialCase: { select: { status: true } },
            session: {
              select: {
                status: true,
                endsAt: true,
              },
            },
          },
        });

        if (!participant) {
          throw new NotFoundException('该试听不在待处理名单');
        }

        await tx.$queryRaw`
          SELECT id FROM trial_cases WHERE id = ${participant.trialCaseId} FOR UPDATE
        `;

        const trialCase = await tx.trialCase.findUnique({
          where: { id: participant.trialCaseId },
          select: { status: true },
        });

        if (
          !trialCase ||
          trialCase.status !== 'scheduled' ||
          participant.bookingStatus !== 'booked' ||
          participant.attendance !== 'pending' ||
          participant.session.status === 'cancelled' ||
          participant.session.endsAt.getTime() > Date.now()
        ) {
          throw new ConflictException('该试听已登记或当前不能处理');
        }

        const participantUpdate = await tx.sessionParticipant.updateMany({
          where: {
            id: participant.id,
            bookingStatus: 'booked',
            attendance: 'pending',
          },
          data: {
            attendance: input.attendance,
            teacherFeedback: toTeacherFeedback(input),
          },
        });

        if (participantUpdate.count !== 1) {
          throw new ConflictException('该试听已登记或当前不能处理');
        }

        const nextStatus =
          input.attendance === 'present'
            ? 'pending_followup'
            : 'pending_schedule';
        const trialCaseUpdate = await tx.trialCase.updateMany({
          where: {
            id: participant.trialCaseId,
            status: 'scheduled',
          },
          data: { status: nextStatus },
        });

        if (trialCaseUpdate.count !== 1) {
          throw new ConflictException('该试听已登记或当前不能处理');
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('该试听已登记或当前不能处理');
      }
      throw error;
    }

    return { ok: true as const };
  }

  private requireParticipantAction(
    user: AuthenticatedUser,
    action: 'read' | 'update',
  ) {
    const ability = createAbilityFor(user);
    if (!ability.can(action, 'SessionParticipant')) {
      throw new ForbiddenException();
    }
    return ability;
  }
}

function pendingProcessWhere(
  ability: AppAbility,
  teacherId: string,
  participantId?: string,
): Prisma.SessionParticipantWhereInput {
  return {
    AND: [
      accessibleBy(ability).ofType('SessionParticipant'),
      {
        ...(participantId ? { id: participantId } : {}),
        kind: 'trial',
        bookingStatus: 'booked',
        attendance: 'pending',
        trialCase: { status: 'scheduled' },
        session: {
          assignedTeacherId: teacherId,
          status: { not: 'cancelled' },
          endsAt: { lte: new Date() },
        },
      },
    ],
  };
}

function toTeacherTrialTask(
  participant: Prisma.SessionParticipantGetPayload<{
    select: typeof participantTaskSelect;
  }>,
) {
  return {
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
  };
}

function parseAttendanceBody(body: unknown): RecordedAttendance {
  if (!isRecord(body)) {
    throw new BadRequestException('请求无效');
  }

  if (body.attendance === 'present') {
    const feedback = isRecord(body.teacherFeedback)
      ? body.teacherFeedback
      : body;
    return {
      attendance: 'present',
      performance: requiredText(feedback.performance, '请填写表现评价'),
      fitSuggestion: requiredText(
        feedback.fitSuggestion,
        '请填写适配建议',
      ),
      questionsForAdmin: optionalText(
        feedback.questionsForAdmin,
        '需顾问确认的问题格式无效',
      ),
    };
  }

  if (body.attendance === 'absent') {
    const feedback = isRecord(body.teacherFeedback)
      ? body.teacherFeedback
      : body;
    return {
      attendance: 'absent',
      absentNote: optionalText(feedback.absentNote, '说明格式无效'),
    };
  }

  throw new BadRequestException('请选择已到课或未到课');
}

function toTeacherFeedback(
  input: RecordedAttendance,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (input.attendance === 'present') {
    const feedback: Record<string, string> = {
      performance: input.performance,
      fit_suggestion: input.fitSuggestion,
    };
    if (input.questionsForAdmin) {
      feedback.questions_for_admin = input.questionsForAdmin;
    }
    return feedback;
  }

  if (input.absentNote) {
    return { absent_note: input.absentNote };
  }

  return Prisma.DbNull;
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

function optionalText(value: unknown, message: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(message);
  }
  const text = value.trim();
  return text.length > 0 ? text : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
