import { AbilityBuilder, PureAbility } from '@casl/ability';

// Define actions and subjects for the application
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'approve';
export type Subject =
  | 'Risk'
  | 'Control'
  | 'Asset'
  | 'Assessment'
  | 'User'
  | 'Framework'
  | 'AuditLog'
  | 'all';

export type AppAbility = PureAbility<[Action, Subject]>;

/**
 * Define abilities based on user role
 */
export function defineAbilitiesFor(role: string): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility);

  switch (role) {
    case 'ADMIN':
      // Admin can do everything
      can('manage', 'all');
      break;

    case 'MANAGER':
      // Managers can manage most resources
      can('read', 'all');
      can('create', ['Risk', 'Control', 'Asset', 'Assessment']);
      can('update', ['Risk', 'Control', 'Asset', 'Assessment']);
      can('delete', ['Risk', 'Control', 'Asset']);
      can('approve', 'Assessment');
      // Cannot manage users or delete assessments
      cannot('manage', 'User');
      cannot('delete', 'Assessment');
      break;

    case 'ANALYST':
      // Analysts can read everything, create and update most things
      can('read', 'all');
      can('create', ['Risk', 'Control', 'Asset', 'Assessment']);
      can('update', ['Risk', 'Control', 'Asset', 'Assessment']);
      // Cannot delete anything or approve assessments
      cannot('delete', 'all');
      cannot('approve', 'Assessment');
      cannot('manage', 'User');
      break;

    case 'VIEWER':
      // Viewers can only read
      can('read', 'all');
      // Cannot create, update, delete, or approve anything
      cannot('create', 'all');
      cannot('update', 'all');
      cannot('delete', 'all');
      cannot('approve', 'all');
      cannot('manage', 'User');
      break;

    default:
      // Unknown roles get no permissions
      break;
  }

  return build();
}

/**
 * Check if user can perform an action on a subject
 */
export function can(role: string, action: Action, subject: Subject): boolean {
  const ability = defineAbilitiesFor(role);
  return ability.can(action, subject);
}
