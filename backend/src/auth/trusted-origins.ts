const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * When the configured frontend is loopback, trust localhost / 127.0.0.1 /
 * [::1] on any port. Vite will pick 5174 if 5173 is taken; production hosts
 * stay exact.
 */
export function authTrustedOrigins(
  ...configured: Array<string | undefined>
): string[] {
  const origins = new Set<string>();

  for (const value of configured) {
    if (!value) {
      continue;
    }
    origins.add(value);
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue;
    }

    if (!LOOPBACK_HOSTS.has(url.hostname)) {
      continue;
    }

    origins.add(`${url.protocol}//localhost:*`);
    origins.add(`${url.protocol}//127.0.0.1:*`);
    origins.add(`${url.protocol}//[::1]:*`);
  }

  return [...origins];
}
