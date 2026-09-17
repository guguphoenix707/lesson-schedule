import type { Ability } from '@casl/ability';
import {
  accessibleBy,
  createPrismaAbility,
  type Model,
  type PrismaQueryOf,
  type Subjects,
} from '@casl/prisma/runtime';
import type {
  Prisma,
  SessionParticipant,
  Student,
  TrialCase,
} from '../generated/prisma/client';

export { accessibleBy, createPrismaAbility };

export type PrismaQuery<T extends Model<object, string> = Model<object, string>> =
  PrismaQueryOf<Prisma.TypeMap, T>;

export type AppSubjects = Subjects<{
  Student: Student;
  TrialCase: TrialCase;
  SessionParticipant: SessionParticipant;
}>;

export type AppAbility = Ability<['read' | 'update', AppSubjects], PrismaQuery>;
