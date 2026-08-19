#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

import { loadConfig } from './config.js';
import { parseArgs } from './cli-args.js';
import { upsertPullRequestComment } from './github.js';
import { formatReport } from './report.js';
import { applyFix, scanProject } from './workflow.js';

async function publishScanComment(report, env, errorOutput) {
  if (env.GITHUB_EVENT_NAME !== 'pull_request' || !env.GITHUB_EVENT_PATH || !env.GITHUB_REPOSITORY || !env.GITHUB_TOKEN) {
    return;
  }

  try {
    const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
    const issueNumber = event.pull_request?.number;
    if (!Number.isInteger(issueNumber)) return;
    await upsertPullRequestComment({
      repository: env.GITHUB_REPOSITORY,
      token: env.GITHUB_TOKEN,
      issueNumber,
      body: `<!-- knipci-report -->\n${formatReport(report, 'markdown')}`
    });
  } catch (error) {
    errorOutput.write(`KnipCI warning: unable to publish PR comment: ${error.message}\n`);
  }
}

export async function main(
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  output = process.stdout,
  errorOutput = process.stderr,
  env = process.env
) {
  try {
    const options = parseArgs(argv);
    const config = await loadConfig(cwd, options.configPath);
    if (options.build) config.build = options.build;
    if (options.test) config.test = options.test;
    if (options.maxDependencyRemovals) config.maxDependencyRemovals = options.maxDependencyRemovals;

    if (options.command === 'scan') {
      const report = await scanProject({ cwd });
      output.write(formatReport(report, options.format));
      await publishScanComment(report, env, errorOutput);
      return report.status === 'findings' ? 1 : 0;
    }

    const report = await applyFix({
      cwd,
      config,
      apply: Boolean(options.apply),
      createPr: Boolean(options.createPr)
    });
    output.write(formatReport(report, 'markdown'));
    return report.status === 'blocked' ? 1 : 0;
  } catch (error) {
    errorOutput.write(`KnipCI: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main();
}
