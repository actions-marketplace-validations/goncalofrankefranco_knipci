import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBranchName,
  validateChangedFiles,
  buildPullRequestBody,
  createCleanupPullRequest
} from '../src/workflow.js';

test('creates a deterministic cleanup branch name', () => {
  assert.equal(buildBranchName('abcdef1234567890'), 'knipci/cleanup-abcdef1');
});

test('allows only package manifests and lockfiles in the dependency-fix diff', () => {
  assert.equal(validateChangedFiles(['package.json', 'package-lock.json']), true);
  assert.throws(
    () => validateChangedFiles(['package.json', 'src/index.js']),
    /unexpected files/
  );
});

test('builds a Pull Request body with evidence and safety wording', () => {
  const body = buildPullRequestBody({
    removed: ['lodash'],
    build: 'passed',
    test: 'passed',
    knipVersion: '6.32.2'
  });

  assert.match(body, /KnipCI/);
  assert.match(body, /lodash/);
  assert.match(body, /build.*passed/s);
  assert.match(body, /test.*passed/s);
  assert.match(body, /Knip 6\.32\.2/);
});

test('commits and pushes only the validated dependency diff before opening a PR', async () => {
  const gitCalls = [];
  const pullRequestCalls = [];
  const result = await createCleanupPullRequest({
    cwd: 'C:/fixture',
    report: {
      findings: [{ kind: 'unused-dependency', name: 'lodash' }],
      validation: { build: 'passed', test: 'passed' },
      engine: { version: '6.32.2' }
    },
    removed: ['lodash'],
    env: {
      GITHUB_REPOSITORY: 'acme/example',
      GITHUB_TOKEN: 'token',
      GITHUB_SHA: 'abcdef1234567890',
      GITHUB_DEFAULT_BRANCH: 'main'
    },
    changedFilesFn: () => ['package.json', 'package-lock.json'],
    existingPrFinder: async () => null,
    gitRunner: (_cwd, args) => {
      gitCalls.push(args);
      return '';
    },
    pullRequestCreator: async (options) => {
      pullRequestCalls.push(options);
      return { number: 44 };
    }
  });

  assert.deepEqual(result, { number: 44 });
  assert.deepEqual(gitCalls, [
    ['switch', '-c', 'knipci/cleanup-abcdef1'],
    ['add', '--', 'package.json', 'package-lock.json'],
    ['commit', '-m', 'chore: remove unused dependencies with KnipCI'],
    ['push', '--set-upstream', 'origin', 'knipci/cleanup-abcdef1']
  ]);
  assert.equal(pullRequestCalls[0].branch, 'knipci/cleanup-abcdef1');
  assert.match(pullRequestCalls[0].body, /lodash/);
});

test('reuses an existing PR before touching Git', async () => {
  const gitCalls = [];
  const existing = { number: 45 };
  const result = await createCleanupPullRequest({
    cwd: 'C:/fixture',
    report: { findings: [], validation: {}, engine: { version: '6.32.2' } },
    env: {
      GITHUB_REPOSITORY: 'acme/example',
      GITHUB_TOKEN: 'token',
      GITHUB_SHA: 'abcdef1234567890'
    },
    existingPrFinder: async () => existing,
    changedFilesFn: () => { throw new Error('changed files should not be read'); },
    gitRunner: (_cwd, args) => { gitCalls.push(args); return ''; }
  });

  assert.deepEqual(result, existing);
  assert.deepEqual(gitCalls, []);
});
