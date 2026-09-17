import { AbilityBuilder } from '@casl/ability';
import {
  createPrismaAbility,
  type AppAbility,
} from './casl-prisma';
import type { AuthenticatedUser } from './session-guard';

export type { AppAbility } from './casl-prisma';
export { accessibleBy } from './casl-prisma';

export function createAbilityFor(user: AuthenticatedUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  if (user.role === 'admin') {
    can('read', 'Student', { ownerAdminId: user.id });
    can('read', 'TrialCase', { student: { ownerAdminId: user.id } });
    can('update', 'TrialCase', { student: { ownerAdminId: user.id } });
  }

  if (user.role === 'teacher') {
    can('read', 'SessionParticipant', {
      session: { assignedTeacherId: user.id },
    });
    can('update', 'SessionParticipant', {
      session: { assignedTeacherId: user.id },
    });
  }

  return build();
}
