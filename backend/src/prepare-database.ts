import { spawn } from 'node:child_process';
import path from 'node:path';

const backendRoot = path.resolve(__dirname, '../..');

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: backendRoot,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(`${command} ${args.join(' ')} exited with code ${code}`),
      );
    });
  });
}

export async function prepareDatabase(): Promise<void> {
  const prismaCli = path.join(backendRoot, 'node_modules/.bin/prisma');
  await runCommand(process.execPath, [
    path.join(backendRoot, 'scripts/wait-for-postgres.mjs'),
  ]);
  await runCommand(prismaCli, ['migrate', 'deploy']);
  await runCommand(process.execPath, [
    path.join(backendRoot, 'scripts/seed-demo-if-empty.mjs'),
  ]);
}
