import { getHttpErrorMessage, httpBase, isHttpUnauthorized } from './http-base';

export type StaffSession = {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher';
};

export const sessionQueryKey = ['session'] as const;

export async function fetchCurrentSession(): Promise<StaffSession | null> {
  try {
    const { data } = await httpBase.get<StaffSession>('/me');
    return data;
  } catch (error) {
    if (isHttpUnauthorized(error)) {
      return null;
    }
    throw new Error(getHttpErrorMessage(error, '无法读取当前登录状态'), {
      cause: error,
    });
  }
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
  remember?: boolean;
}): Promise<void> {
  try {
    await httpBase.post('/auth/sign-in/email', {
      email: input.email,
      password: input.password,
      rememberMe: Boolean(input.remember),
    });
  } catch (error) {
    if (isHttpUnauthorized(error)) {
      throw new Error('邮箱或密码不正确', { cause: error });
    }
    throw new Error(getHttpErrorMessage(error, '登录失败，请稍后重试'), {
      cause: error,
    });
  }
}

export async function signOut(): Promise<void> {
  try {
    await httpBase.post('/auth/sign-out', {});
  } catch (error) {
    throw new Error(getHttpErrorMessage(error, '退出登录失败'), {
      cause: error,
    });
  }
}
