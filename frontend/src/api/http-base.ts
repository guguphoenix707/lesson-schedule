import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';

const nestDefaultMessages = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Conflict',
  'Internal Server Error',
]);

export const httpBase = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

httpBase.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isGetSessionUnauthorized(error)) {
      return emptySessionResponse(error);
    }
    return Promise.reject(toRequestError(error));
  },
);

function isGetSessionUnauthorized(
  error: unknown,
): error is AxiosError {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    isRequestPath(error, '/auth/get-session')
  );
}

function emptySessionResponse(error: AxiosError): AxiosResponse<null> {
  return {
    data: null,
    status: 200,
    statusText: 'OK',
    headers: error.response?.headers ?? {},
    config: error.config ?? { headers: axios.AxiosHeaders.from({}) },
  };
}

function toRequestError(error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message.length > 0) {
      return error;
    }
    return new Error('请求失败，请稍后重试');
  }

  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new Error('请求超时，请稍后重试', { cause: error });
    }
    return new Error('无法连接服务，请稍后重试', { cause: error });
  }

  const { status } = error.response;
  const serverMessage = readServerMessage(error);

  if (status === 401) {
    if (isRequestPath(error, '/auth/sign-in/email')) {
      return new Error('邮箱或密码不正确', { cause: error });
    }
    return new Error('请先登录', { cause: error });
  }

  if (status === 403) {
    return new Error(usableMessage(serverMessage, '没有权限'), { cause: error });
  }

  if (status === 404) {
    return new Error(usableMessage(serverMessage, '找不到该资源'), {
      cause: error,
    });
  }

  if (status === 409) {
    return new Error(usableMessage(serverMessage, '当前不能完成该操作'), {
      cause: error,
    });
  }

  if (status === 400) {
    return new Error(usableMessage(serverMessage, '请求无效'), { cause: error });
  }

  if (status >= 500) {
    return new Error(
      usableMessage(serverMessage, '服务暂时不可用，请稍后重试'),
      { cause: error },
    );
  }

  return new Error(usableMessage(serverMessage, '请求失败，请稍后重试'), {
    cause: error,
  });
}

function isRequestPath(error: AxiosError, path: string): boolean {
  const { url } = error.config ?? {};
  return typeof url === 'string' && url.includes(path);
}

function readServerMessage(error: AxiosError): string | undefined {
  const { data } = error.response ?? {};
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string' &&
    data.message.length > 0
  ) {
    return data.message;
  }
  return undefined;
}

function usableMessage(message: string | undefined, fallback: string): string {
  if (!message || nestDefaultMessages.has(message)) {
    return fallback;
  }
  return message;
}
