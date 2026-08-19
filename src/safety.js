import { access, constants } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { isAbsolute, relative, resolve } from 'node:path';

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function detectPackageManager(cwd) {
  const unsupported = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lockb', 'bun'],
    ['bun.lock', 'bun']
  ];

  for (const [filename, name] of unsupported) {
    if (await exists(resolve(cwd, filename))) {
      throw new Error(`Unsupported package manager: ${name}`);
    }
  }

  if (await exists(resolve(cwd, 'package-lock.json')) || await exists(resolve(cwd, 'npm-shrinkwrap.json'))) {
    return 'npm';
  }

  throw new Error('No npm lockfile found; KnipCI currently requires package-lock.json');
}

/** @internal */
export function assertPathInside(root, candidate) {
  const rootPath = resolve(root);
  const candidatePath = resolve(candidate);
  const pathDifference = relative(rootPath, candidatePath);
  if (pathDifference.startsWith('..') || isAbsolute(pathDifference)) {
    throw new Error(`path is outside repository: ${candidate}`);
  }
  return true;
}

export function assertCleanWorkspace(cwd) {
  let status;
  try {
    status = execFileSync('git', ['status', '--porcelain'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    throw new Error(`unable to inspect git workspace: ${error.message}`);
  }
  if (status.trim() !== '') throw new Error('git workspace must be clean');
  return true;
}

export function changedFiles(cwd) {
  const output = execFileSync('git', ['status', '--porcelain'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replaceAll('\\', '/'));
}
