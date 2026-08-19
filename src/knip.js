import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);

function knipPackageRoot() {
  const entry = require.resolve('knip');
  return resolve(dirname(entry), '..');
}

export function getKnipVersion() {
  const packageJson = JSON.parse(readFileSync(join(knipPackageRoot(), 'package.json'), 'utf8'));
  return packageJson.version;
}

function knipCliPath() {
  return join(knipPackageRoot(), 'bin', 'knip.js');
}

export function parseKnipOutput(stdout) {
  try {
    return JSON.parse(String(stdout).trim());
  } catch (error) {
    throw new Error(`invalid Knip JSON output: ${error.message}`);
  }
}

export function runKnip(cwd, args = [], options = {}) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [knipCliPath(), ...args], {
      cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (exitCode, signal) => resolveResult({ exitCode, signal, stdout, stderr }));
  });
}
