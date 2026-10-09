export interface Me {
  userId: string;
  profile: 'Teacher' | 'Personnel' | 'Student' | 'Parent' | 'Super-admin';
  role: 'teacher' | 'user';
  schools: string[];
  classes: string[];
  allowedModels: string[];
}

/** `null` when there is no session. */
export async function fetchMe(): Promise<Me | null> {
  const res = await fetch('/me', { credentials: 'same-origin' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`/me failed: ${res.status}`);
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
}

export interface Assistant {
  name: string;
  ownerId: string;
  uai: string;
  classes: string[];
  published: boolean;
  model: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** Assistants visible to the caller, their own first. */
export async function fetchAssistants(): Promise<Assistant[]> {
  const res = await fetch('/context', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`/context failed: ${res.status}`);
  return res.json();
}
