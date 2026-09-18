import { existsSync } from 'node:fs';
import path from 'node:path';

export function resolveFrontendDistPath(): string | undefined {
  const candidates = [
    path.resolve(__dirname, '../../../frontend/dist'),
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  return undefined;
}
