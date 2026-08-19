import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

/** @internal */
export const DEFAULT_CONFIG = Object.freeze({
  install: 'npm ci --ignore-scripts',
  build: 'npm run build',
  test: 'npm test',
  maxDependencyRemovals: 10,
  allowPackages: [],
  allowPaths: []
});

function validateConfig(config) {
  for (const key of ['install', 'build', 'test']) {
    if (typeof config[key] !== 'string' || config[key].trim() === '') {
      throw new Error(`${key} must be a non-empty command string`);
    }
  }

  if (!Number.isInteger(config.maxDependencyRemovals) || config.maxDependencyRemovals < 1) {
    throw new Error('maxDependencyRemovals must be a positive integer');
  }

  for (const key of ['allowPackages', 'allowPaths']) {
    if (!Array.isArray(config[key]) || config[key].some((value) => typeof value !== 'string')) {
      throw new Error(`${key} must be an array of strings`);
    }
  }

  return config;
}

export async function loadConfig(cwd, configPath = '.knipci.json') {
  const absolutePath = isAbsolute(configPath) ? configPath : resolve(cwd, configPath);
  const outside = relative(resolve(cwd), absolutePath);
  if (outside.startsWith('..') || isAbsolute(outside)) {
    throw new Error('config path is outside repository');
  }

  let raw;
  try {
    raw = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { ...DEFAULT_CONFIG };
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid ${configPath}: ${error.message}`);
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${configPath} must contain a JSON object`);
  }

  return validateConfig({ ...DEFAULT_CONFIG, ...parsed });
}
