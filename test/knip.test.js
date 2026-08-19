import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { getKnipVersion, parseKnipOutput, runKnip } from '../src/knip.js';

test('parses the documented JSON reporter output', () => {
  const raw = parseKnipOutput('  {"issues":[]}\n');
  assert.deepEqual(raw, { issues: [] });
});

test('rejects non-JSON Knip output', () => {
  assert.throws(() => parseKnipOutput('not json'), /invalid Knip JSON output/);
});

test('resolves the pinned Knip version and executes the CLI', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'knipci-knip-'));
  await writeFile(join(cwd, 'package.json'), JSON.stringify({
    name: 'knipci-fixture',
    private: true,
    dependencies: { 'left-pad': '1.3.0' }
  }));

  assert.equal(getKnipVersion(), '6.32.2');
  const result = await runKnip(cwd, ['--reporter', 'json', '--no-progress', '--strict']);
  assert.equal(result.exitCode, 1);
  assert.equal(parseKnipOutput(result.stdout).issues[0].file, 'package.json');
});
