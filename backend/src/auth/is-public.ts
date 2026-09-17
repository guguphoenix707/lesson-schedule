import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a Nest handler that does not require a session. Prefer the `/api/common` prefix. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export function isPublicApiPath(url: string): boolean {
  const path = url.split('?')[0] ?? '';
  return path === '/api/common' || path.startsWith('/api/common/');
}
