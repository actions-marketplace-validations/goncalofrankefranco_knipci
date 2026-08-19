import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { applyFix } from '../src/workflow.js';

const config = {
  install: 'npm ci --ignore-scripts',
  build: 'npm run build',
  test: 'npm test',
  maxDependencyRemovals: 10,
  allowPackages: [],
  allowPaths: []
};

async function createRepo() {
  const cwd = await mkdtemp(join(tmpdir(), 'knipci-workflow-'));
  const packageJson = {
    name: 'knipci-workflow-fixture',
    version: '1.0.0',
    private: true,
    dependencies: { 'left-pad': '1.3.0' }
  };
  await writeFile(join(cwd, 'package.json'), JSON.stringify(packageJson, null, 2));
  await writeFile(join(cwd, 'package-lock.json'), JSON.stringify({
    name: packageJson.name,
    version: packageJson.version,
    lockfileVersion: 3,
    requires: true,
    packages: { '': packageJson }
  }, null, 2));
  execFileSync('git', ['init'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd });
  execFileSync('git', ['config', 'user.name', 'KnipCI Test'], { cwd });
  execFileSync('git', ['add', '.'], { cwd });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd, stdio: 'ignore' });
  return cwd;
}

function findingOutput() {
  return JSON.stringify({
    issues: [{ file: 'package.json', dependencies: [{ name: 'left-pad' }] }]
  });
}

function makeKnipRunner() {
  let calls = 0;
  return async (cwd) => {
    calls += 1;
    if (calls === 2) {
      await writeFile(join(cwd, 'package.json'), JSON.stringify({
        name: 'knipci-workflow-fixture',
        version: '1.0.0',
        private: true,
        dependencies: {}
      }, null, 2));
    }
    return { exitCode: 1, stdout: findingOutput(), stderr: '' };
  };
}

test('dry-run finds a dependency without modifying the repository', async () => {
  const cwd = await createRepo();
  const commands = [];
  const result = await applyFix({
    cwd,
    config,
    apply: false,
    knipRunner: makeKnipRunner(),
    commandRunner: async (command) => {
      commands.push(command);
      return { exitCode: 0 };
    }
  });

  assert.equal(result.status, 'findings');
  assert.deepEqual(commands, []);
  assert.match(await readFile(join(cwd, 'package.json'), 'utf8'), /left-pad/);
});

test('applies and validates a dependency cleanup', async () => {
  const cwd = await createRepo();
  const commands = [];
  const result = await applyFix({
    cwd,
    config,
    apply: true,
    knipRunner: makeKnipRunner(),
    commandRunner: async (command) => {
      commands.push(command);
      return { exitCode: 0 };
    }
  });

  assert.equal(result.validation.install, 'passed');
  assert.equal(result.validation.build, 'passed');
  assert.equal(result.validation.test, 'passed');
  assert.equal(result.metrics.removedDirectDependencies, 1);
  assert.deepEqual(commands, [
    'npm install --package-lock-only --ignore-scripts',
    'npm ci --ignore-scripts',
    'npm run build',
    'npm test'
  ]);
  assert.doesNotMatch(await readFile(join(cwd, 'package.json'), 'utf8'), /left-pad/);
});

test('restores the candidate when build validation fails', async () => {
  const cwd = await createRepo();
  const result = await applyFix({
    cwd,
    config,
    apply: true,
    knipRunner: makeKnipRunner(),
    commandRunner: async (command) => ({ exitCode: command === 'npm run build' ? 1 : 0 })
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'build-failed');
  assert.equal(result.validation.build, 'failed');
  assert.match(await readFile(join(cwd, 'package.json'), 'utf8'), /left-pad/);
});
