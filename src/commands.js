import { spawn } from 'node:child_process';

export function runCommand(command, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      shell: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal, stdout, stderr }));
  });
}
