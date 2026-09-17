import type { Ability } from '@casl/ability';
import {
  accessibleBy,
  createPrismaAbility,
  type Model,
  type PrismaQueryOf,
  type Subjects,
} from '@casl/prisma/runtime';
import type { Prisma, Student } from '../generated/prisma/client';

export { accessibleBy, createPrismaAbility };

export type PrismaQuery<T extends Model<object, string> = Model<object, string>> =
  PrismaQueryOf<Prisma.TypeMap, T>;

export type AppSubjects = Subjects<{
  Student: Student;
}>;

export type AppAbility = Ability<['read', AppSubjects], PrismaQuery>;
