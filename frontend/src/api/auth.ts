import { httpBase } from './http-base';

export type StaffSession = {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher';
};

export const sessionQueryKey = ['session'] as const;

type AuthSessionResponse = {
  user?: {
    id: string;
    email: string;
    name: string;
    role?: unknown;
  };
} | null;

export async function fetchCurrentSession(): Promise<StaffSession | null> {
  const { data } = await httpBase.get<AuthSessionResponse>('/auth/get-session');
  return toStaffSession(data);
}

function toStaffSession(data: AuthSessionResponse): StaffSession | null {
  const user = data?.user;
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.name,
    role: user.role,
  };
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
  remember?: boolean;
}): Promise<void> {
  await httpBase.post('/auth/sign-in/email', {
    email: input.email,
    password: input.password,
    rememberMe: Boolean(input.remember),
  });
}

export async function signOut(): Promise<void> {
  await httpBase.post('/auth/sign-out', {});
}
