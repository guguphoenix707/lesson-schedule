import axios from 'axios';

type ErrorBody = {
  message?: string;
};

export const httpBase = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

export function isHttpUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function getHttpErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message.length > 0) {
      return error.message;
    }
    return fallback;
  }

  const { data } = error.response ?? {};
  if (
    isErrorBody(data) &&
    typeof data.message === 'string' &&
    data.message.length > 0
  ) {
    return data.message;
  }

  return fallback;
}

function isErrorBody(data: unknown): data is ErrorBody {
  return typeof data === 'object' && data !== null;
}
