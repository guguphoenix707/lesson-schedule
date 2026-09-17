// Check that handwritten source filenames and directories are kebab-case.
//
// Purpose: fail CI/local check when a source file or folder uses uppercase
// or separators other than hyphens.
// Preconditions: run from anywhere; paths are resolved from the repo root.
// Input: none. Scans fixed source trees listed below.
// Side effects: prints violating paths to stderr and exits 1 if any exist.

import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const sourceRoots = [
  'frontend/src',
  'frontend/tests',
  'backend/src',
  'backend/scripts',
  'backend/tests',
  'db/seed',
  'eval/cases',
  'scripts',
];

const skippedDirectoryNames = new Set(['generated', 'node_modules']);
const skippedFileNames = new Set(['README.md']);

const fileNamePattern =
  /^(?:\.[a-z0-9]+(?:-[a-z0-9]+)*|[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)+)$/;
const directoryNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function walk(absoluteDir, violations) {
  let entries;
  try {
    entries = readdirSync(absoluteDir);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const name of entries) {
    const absolutePath = join(absoluteDir, name);
    const stats = statSync(absolutePath);
    const relativePath = relative(repoRoot, absolutePath);

    if (stats.isDirectory()) {
      if (skippedDirectoryNames.has(name)) {
        continue;
      }
      if (!directoryNamePattern.test(name)) {
        violations.push(`${relativePath}/`);
      }
      walk(absolutePath, violations);
      continue;
    }

    if (skippedFileNames.has(name)) {
      continue;
    }

    if (!fileNamePattern.test(name)) {
      violations.push(relativePath);
    }
  }
}

const violations = [];
for (const sourceRoot of sourceRoots) {
  walk(join(repoRoot, sourceRoot), violations);
}

if (violations.length > 0) {
  console.error('Filenames must be kebab-case with no uppercase letters:');
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exitCode = 1;
}
