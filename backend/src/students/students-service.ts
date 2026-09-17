import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AttendanceStatus } from '../generated/prisma/client';
import type { BookingStatus } from '../generated/prisma/client';
import { accessibleBy, createAbilityFor } from '../auth/ability';
import type { AuthenticatedUser } from '../auth/session-guard';
import { PrismaService } from '../prisma-service';
import { derivedSessionLabel } from '../trial/trial-case-view';

type BookedParticipant = {
  bookingStatus: BookingStatus;
  attendance: AttendanceStatus;
  session: {
    startsAt: Date;
    endsAt: Date;
    status: 'scheduled' | 'completed' | 'cancelled';
    class: { name: string };
    assignedTeacher: { displayName: string };
  };
};

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(user: AuthenticatedUser, studentId: string) {
    const ability = this.requireStudentRead(user);
    const student = await this.prisma.client.student.findFirst({
      where: {
        AND: [{ id: studentId }, accessibleBy(ability).ofType('Student')],
      },
      select: {
        id: true,
        displayName: true,
        yearLevel: true,
        currentSchool: true,
        email: true,
        phone: true,
        notes: true,
        trialCase: {
          select: {
            status: true,
            concerns: true,
            submittedBy: true,
            referralSource: true,
            nextFollowupAt: true,
            closedReason: true,
            requestedCourse: {
              select: { id: true, name: true, nameEn: true },
            },
            preferredCampus: {
              select: { id: true, name: true, nameZh: true },
            },
            participants: {
              where: { bookingStatus: 'booked' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                bookingStatus: true,
                attendance: true,
                session: {
                  select: {
                    startsAt: true,
                    endsAt: true,
                    status: true,
                    class: { select: { name: true } },
                    assignedTeacher: { select: { displayName: true } },
                  },
                },
              },
            },
          },
        },
        guardians: {
          where: { isPrimary: true },
          take: 1,
          select: {
            relationship: true,
            guardian: {
              select: {
                displayName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException();
    }

    const { trialCase } = student;
    const booked = trialCase?.participants[0];
    const primaryGuardian = student.guardians[0];

    return {
      id: student.id,
      displayName: student.displayName,
      yearLevel: student.yearLevel,
      currentSchool: student.currentSchool,
      email: student.email,
      phone: student.phone,
      notes: student.notes,
      trial: trialCase
        ? {
            status: trialCase.status,
            derivedSessionLabel: derivedSessionLabel(
              trialCase.status,
              booked?.session,
            ),
            requestedCourse: trialCase.requestedCourse,
            preferredCampus: trialCase.preferredCampus,
            concerns: trialCase.concerns,
            submittedBy: trialCase.submittedBy,
            referralSource: trialCase.referralSource,
            nextFollowupAt: trialCase.nextFollowupAt?.toISOString() ?? null,
            closedReason: trialCase.closedReason,
            currentSession: toCurrentSession(booked),
          }
        : null,
      primaryGuardian: primaryGuardian
        ? {
            displayName: primaryGuardian.guardian.displayName,
            email: primaryGuardian.guardian.email,
            phone: primaryGuardian.guardian.phone,
            relationship: primaryGuardian.relationship,
          }
        : null,
    };
  }

  private requireStudentRead(user: AuthenticatedUser) {
    const ability = createAbilityFor(user);
    if (!ability.can('read', 'Student')) {
      throw new ForbiddenException();
    }
    return ability;
  }
}

function toCurrentSession(participant: BookedParticipant | undefined) {
  if (!participant) {
    return null;
  }
  return {
    startsAt: participant.session.startsAt.toISOString(),
    endsAt: participant.session.endsAt.toISOString(),
    className: participant.session.class.name,
    teacherName: participant.session.assignedTeacher.displayName,
    bookingStatus: participant.bookingStatus,
    attendance: participant.attendance,
  };
}
