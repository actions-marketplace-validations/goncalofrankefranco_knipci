import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { loadConfig } from '../src/config.js';
import { detectPackageManager, assertPathInside } from '../src/safety.js';
import { normalizeKnipReport, selectDependencyFindings, formatReport } from '../src/report.js';
import { parseArgs } from '../src/cli-args.js';

test('normalizes Knip JSON into the public KnipCI report', () => {
  const report = normalizeKnipReport({
    issues: [
      {
        file: 'package.json',
        dependencies: [{ name: 'lodash' }],
        files: [],
        exports: []
      },
      {
        file: 'src/legacy.js',
        dependencies: [],
        files: [{ name: 'src/legacy.js' }],
        exports: [{ name: 'unusedExport', line: 3 }]
      }
    ]
  }, '6.32.2');

  assert.equal(report.schema, 1);
  assert.equal(report.status, 'findings');
  assert.deepEqual(report.engine, { name: 'knip', version: '6.32.2' });
  assert.deepEqual(report.findings, [
    { kind: 'unused-dependency', name: 'lodash', manifest: 'package.json' },
    { kind: 'unused-file', name: 'src/legacy.js', manifest: 'src/legacy.js' },
    { kind: 'unused-export', name: 'unusedExport', manifest: 'src/legacy.js', line: 3 }
  ]);
});

test('reports clean when Knip returns no issues', () => {
  const report = normalizeKnipReport({ issues: [] }, '6.32.2');
  assert.equal(report.status, 'clean');
  assert.deepEqual(report.findings, []);
});

test('selects only allowed dependency findings and honors the removal limit', () => {
  const report = normalizeKnipReport({
    issues: [{
      file: 'package.json',
      dependencies: [{ name: 'lodash' }, { name: 'react' }, { name: 'chalk' }]
    }]
  }, '6.32.2');

  const selected = selectDependencyFindings(report, {
    allowPackages: ['react'],
    maxDependencyRemovals: 2
  });
  assert.equal(selected.blocked, false);
  assert.deepEqual(selected.findings.map(({ name }) => name), ['lodash', 'chalk']);

  const blocked = selectDependencyFindings(report, {
    allowPackages: [],
    maxDependencyRemovals: 2
  });
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.reason, 'max-dependency-removals-exceeded');
});

test('formats a report as JSON or readable Markdown', () => {
  const report = normalizeKnipReport({
    issues: [{ file: 'package.json', dependencies: [{ name: 'lodash' }] }]
  }, '6.32.2');

  assert.deepEqual(JSON.parse(formatReport(report, 'json')), report);
  assert.match(formatReport(report, 'markdown'), /unused-dependency/);
  assert.match(formatReport(report, 'markdown'), /lodash/);
});

test('loads defaults and merges a valid .knipci.json', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'knipci-config-'));
  await writeFile(join(cwd, '.knipci.json'), JSON.stringify({
    test: 'npm run test:ci',
    maxDependencyRemovals: 3,
    allowPackages: ['react']
  }));

  const config = await loadConfig(cwd);
  assert.equal(config.install, 'npm ci --ignore-scripts');
  assert.equal(config.test, 'npm run test:ci');
  assert.equal(config.maxDependencyRemovals, 3);
  assert.deepEqual(config.allowPackages, ['react']);
});

test('rejects invalid configuration values', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'knipci-config-invalid-'));
  await writeFile(join(cwd, '.knipci.json'), JSON.stringify({ maxDependencyRemovals: 0 }));
  await assert.rejects(loadConfig(cwd), /maxDependencyRemovals/);
});

test('detects npm and rejects unsupported package managers', async () => {
  const npmCwd = await mkdtemp(join(tmpdir(), 'knipci-npm-'));
  await writeFile(join(npmCwd, 'package-lock.json'), '{}');
  assert.equal(await detectPackageManager(npmCwd), 'npm');

  const pnpmCwd = await mkdtemp(join(tmpdir(), 'knipci-pnpm-'));
  await writeFile(join(pnpmCwd, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
  await assert.rejects(detectPackageManager(pnpmCwd), /Unsupported package manager: pnpm/);
});

test('rejects a path outside the repository root', () => {
  assert.equal(assertPathInside('C:/repo', 'C:/repo/package.json'), true);
  assert.throws(() => assertPathInside('C:/repo', 'C:/other/package.json'), /outside repository/);
});

test('parses safe scan and fix command options', () => {
  assert.deepEqual(parseArgs(['scan', '--format', 'json']), {
    command: 'scan',
    format: 'json',
    configPath: '.knipci.json'
  });

  assert.deepEqual(parseArgs([
    'fix', '--apply', '--create-pr', '--build', 'npm run build', '--test', 'npm test'
  ]), {
    command: 'fix',
    apply: true,
    createPr: true,
    build: 'npm run build',
    test: 'npm test',
    configPath: '.knipci.json'
  });
});

test('rejects conflicting or unsafe CLI options', () => {
  assert.throws(() => parseArgs(['fix', '--dry-run', '--apply']), /cannot be combined/);
  assert.throws(() => parseArgs(['fix', '--create-pr']), /requires --apply/);
  assert.throws(() => parseArgs(['scan', '--format', 'xml']), /format/);
});
