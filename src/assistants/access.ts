import type { EntUser } from '../ent/session.service';

export interface Assistant {
  name: string;
  ownerId: string;
  uai: string;
  /** Empty means the whole school. */
  classes: string[];
  published: boolean;
  model: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Owner; or published, in one of the user's schools, and aimed at the
 * whole school or at one of the user's classes.
 */
export function canSee(user: EntUser, assistant: Assistant): boolean {
  if (assistant.ownerId === user.userId) return true;
  return (
    assistant.published &&
    user.uai.includes(assistant.uai) &&
    (assistant.classes.length === 0 ||
      assistant.classes.some((c) => user.classes.includes(c)))
  );
}

/** Teacher and owner. */
export function canEdit(user: EntUser, assistant: Assistant): boolean {
  return user.role === 'teacher' && assistant.ownerId === user.userId;
}
