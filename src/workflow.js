import { execFileSync } from 'node:child_process';

import { runCommand } from './commands.js';
import { createPullRequest, findOpenPullRequest } from './github.js';
import { getKnipVersion, parseKnipOutput, runKnip } from './knip.js';
import { normalizeKnipReport, selectDependencyFindings } from './report.js';
import {
  assertCleanWorkspace,
  changedFiles,
  detectPackageManager
} from './safety.js';

/** @internal */
export function buildBranchName(commitSha) {
  const safeSha = String(commitSha).replace(/[^a-f0-9]/gi, '').slice(0, 7);
  if (safeSha.length < 7) throw new Error('commit SHA must contain at least 7 hexadecimal characters');
  return `knipci/cleanup-${safeSha}`;
}

function runGit(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function hasHead(cwd) {
  try {
    runGit(cwd, ['rev-parse', '--verify', 'HEAD']);
    return true;
  } catch {
    return false;
  }
}

function restoreCandidate(cwd, files) {
  if (!hasHead(cwd) || files.length === 0) return;
  runGit(cwd, ['restore', '--source=HEAD', '--staged', '--worktree', '--', ...files]);
}

export async function scanProject({ cwd, knipRunner = runKnip }) {
  await detectPackageManager(cwd);
  const result = await knipRunner(cwd, [
    '--reporter', 'json',
    '--no-progress',
    '--strict'
  ]);
  const raw = parseKnipOutput(result.stdout);
  return normalizeKnipReport(raw, getKnipVersion());
}

export async function applyFix({
  cwd,
  config,
  apply = false,
  createPr = false,
  knipRunner = runKnip,
  commandRunner = runCommand,
  pullRequestCreator = createCleanupPullRequest
}) {
  await detectPackageManager(cwd);
  assertCleanWorkspace(cwd);
  const report = await scanProject({ cwd, knipRunner });
  const selection = selectDependencyFindings(report, config);

  if (selection.blocked) {
    return { ...report, status: 'blocked', reason: selection.reason, total: selection.total };
  }
  if (selection.findings.length === 0 || !apply) return report;
  if (!hasHead(cwd)) throw new Error('an initial Git commit is required before applying fixes');

  const changedBefore = changedFiles(cwd);
  try {
    const fixResult = await knipRunner(cwd, [
      '--fix',
      '--fix-type', 'dependencies',
      '--no-progress',
      '--strict'
    ]);
    if (fixResult.exitCode > 1) throw new Error(fixResult.stderr || 'Knip auto-fix failed');

    let files = changedFiles(cwd);
    validateChangedFiles(files);

    const lockfile = await commandRunner('npm install --package-lock-only --ignore-scripts', cwd);
    if (lockfile.exitCode !== 0) {
      return restoreAndBlock(cwd, files, report, selection, {
        install: 'failed',
        build: 'not-run',
        test: 'not-run'
      }, 'lockfile-update-failed');
    }

    files = changedFiles(cwd);
    validateChangedFiles(files);
    const install = await commandRunner(config.install, cwd);
    if (install.exitCode !== 0) {
      return restoreAndBlock(cwd, files, report, selection, {
        install: 'failed',
        build: 'not-run',
        test: 'not-run'
      }, 'install-failed');
    }

    const build = await commandRunner(config.build, cwd);
    if (build.exitCode !== 0) {
      return restoreAndBlock(cwd, files, report, selection, {
        install: 'passed',
        build: 'failed',
        test: 'not-run'
      }, 'build-failed');
    }

    const test = await commandRunner(config.test, cwd);
    if (test.exitCode !== 0) {
      return restoreAndBlock(cwd, files, report, selection, {
        install: 'passed',
        build: 'passed',
        test: 'failed'
      }, 'test-failed');
    }

    const result = {
      ...report,
      validation: { install: 'passed', build: 'passed', test: 'passed' },
      metrics: { removedDirectDependencies: selection.findings.length }
    };
    if (createPr) {
      result.pullRequest = await pullRequestCreator({
        cwd,
        report: result,
        removed: selection.findings.map(({ name }) => name)
      });
    }
    return result;
  } catch (error) {
    const files = changedFiles(cwd).filter((file) => !changedBefore.includes(file));
    try { restoreCandidate(cwd, files); } catch { /* preserve the original failure */ }
    throw error;
  }
}

function restoreAndBlock(cwd, files, report, selection, validation, reason) {
  restoreCandidate(cwd, files);
  return {
    ...report,
    status: 'blocked',
    reason,
    validation,
    metrics: { removedDirectDependencies: selection.findings.length }
  };
}

/** @internal */
export async function createCleanupPullRequest({
  cwd,
  report,
  removed,
  env = process.env,
  gitRunner = runGit,
  changedFilesFn = changedFiles,
  existingPrFinder = findOpenPullRequest,
  pullRequestCreator = createPullRequest
}) {
  const repository = env.GITHUB_REPOSITORY;
  const token = env.GITHUB_TOKEN;
  if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required to create a PR');

  const sha = env.GITHUB_SHA || gitRunner(cwd, ['rev-parse', 'HEAD']).trim();
  const branch = buildBranchName(sha);
  const existing = await existingPrFinder({ repository, token, branch });
  if (existing) return existing;

  const files = changedFilesFn(cwd);
  validateChangedFiles(files);
  gitRunner(cwd, ['switch', '-c', branch]);
  gitRunner(cwd, ['add', '--', ...files]);
  gitRunner(cwd, ['commit', '-m', 'chore: remove unused dependencies with KnipCI']);
  gitRunner(cwd, ['push', '--set-upstream', 'origin', branch]);

  const base = env.GITHUB_BASE_REF || env.GITHUB_DEFAULT_BRANCH || 'main';
  return pullRequestCreator({
    repository,
    token,
    branch,
    base,
    title: 'chore: remove unused dependencies with KnipCI',
    body: buildPullRequestBody({
      removed: removed ?? report.findings.filter(({ kind }) => kind === 'unused-dependency').map(({ name }) => name),
      build: report.validation.build,
      test: report.validation.test,
      knipVersion: report.engine.version
    })
  });
}

/** @internal */
export function validateChangedFiles(files) {
  const allowed = new Set(['package.json', 'package-lock.json']);
  const unexpected = files.filter((file) => !allowed.has(file.replaceAll('\\', '/')));
  if (unexpected.length > 0) throw new Error(`unexpected files in dependency fix: ${unexpected.join(', ')}`);
  return true;
}

/** @internal */
export function buildPullRequestBody({ removed, build, test, knipVersion }) {
  const dependencies = removed.length > 0 ? removed.map((name) => `- \`${name}\``).join('\n') : '- None';
  return [
    '## KnipCI cleanup',
    '',
    'KnipCI removed unused direct dependencies using the Knip engine.',
    '',
    '### Removed dependencies',
    dependencies,
    '',
    '### Validation',
    `- build: **${build}**`,
    `- test: **${test}**`,
    `- engine: Knip ${knipVersion}`,
    '',
    'This PR was generated on a separate branch and does not deploy automatically.'
  ].join('\n');
}
