import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { main } from '../src/cli.js';

test('CLI scan emits the requested JSON report and CI failure status', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'knipci-cli-'));
  await writeFile(join(cwd, 'package.json'), JSON.stringify({
    name: 'knipci-cli-fixture',
    private: true,
    dependencies: { 'left-pad': '1.3.0' }
  }));
  await writeFile(join(cwd, 'package-lock.json'), '{}');

  let output = '';
  let errors = '';
  const status = await main(
    ['scan', '--format', 'json'],
    cwd,
    { write: (value) => { output += value; } },
    { write: (value) => { errors += value; } },
    {}
  );

  assert.equal(status, 1);
  assert.equal(errors, '');
  assert.equal(JSON.parse(output).status, 'findings');
});
