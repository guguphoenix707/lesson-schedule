import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';
import type { StaffSession } from '../api/auth';

export type AppAction = 'manage' | 'read' | 'update';
export type AppSubject = 'Student' | 'SessionParticipant' | 'all';
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export function createAbilityFor(role: StaffSession['role']): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === 'admin') {
    can('manage', 'all');
    return build();
  }

  can('read', 'SessionParticipant');
  can('update', 'SessionParticipant');
  return build();
}
