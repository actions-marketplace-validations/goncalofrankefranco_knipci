import assert from 'node:assert/strict';
import test from 'node:test';

import { createPullRequest, parseRepository, upsertPullRequestComment } from '../src/github.js';

test('parses an owner/repository identifier', () => {
  assert.deepEqual(parseRepository('acme/example'), { owner: 'acme', name: 'example' });
  assert.throws(() => parseRepository('example'), /owner\/repository/);
});

test('does not create a duplicate open Pull Request', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify([{ number: 42, html_url: 'https://github.com/acme/example/pull/42' }]), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const result = await createPullRequest({
    repository: 'acme/example',
    token: 'token',
    branch: 'knipci/cleanup-abcdef1',
    base: 'main',
    title: 'chore: cleanup',
    body: 'body',
    fetchImpl
  });

  assert.equal(result.number, 42);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /state=open/);
  assert.match(requests[0].url, /head=acme%3Aknipci%2Fcleanup-abcdef1/);
});

test('creates a Pull Request after confirming no duplicate exists', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (requests.length === 1) {
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ number: 43 }), {
      status: 201,
      headers: { 'content-type': 'application/json' }
    });
  };

  const result = await createPullRequest({
    repository: 'acme/example',
    token: 'token',
    branch: 'knipci/cleanup-abcdef1',
    base: 'main',
    title: 'chore: cleanup',
    body: 'body',
    fetchImpl
  });

  assert.equal(result.number, 43);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    title: 'chore: cleanup',
    head: 'knipci/cleanup-abcdef1',
    base: 'main',
    body: 'body'
  });
});

test('updates the existing KnipCI PR comment instead of duplicating it', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (requests.length === 1) {
      return new Response(JSON.stringify([{ id: 9, body: '<!-- knipci-report --> old' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ id: 9 }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  await upsertPullRequestComment({
    repository: 'acme/example',
    token: 'token',
    issueNumber: 7,
    body: '<!-- knipci-report --> new report',
    fetchImpl
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[1].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    body: '<!-- knipci-report --> new report'
  });
});

test('creates the marked PR comment on the first scan', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (requests.length === 1) {
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ id: 10 }), {
      status: 201,
      headers: { 'content-type': 'application/json' }
    });
  };

  await upsertPullRequestComment({
    repository: 'acme/example',
    token: 'token',
    issueNumber: 7,
    body: '<!-- knipci-report --> first report',
    fetchImpl
  });

  assert.equal(requests[1].options.method, 'POST');
  assert.match(requests[1].url, /\/issues\/7\/comments$/);
});
