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
