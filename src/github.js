const API_ROOT = 'https://api.github.com';

/** @internal */
export function parseRepository(repository) {
  const parts = String(repository).split('/');
  if (parts.length !== 2 || parts.some((part) => part.length === 0)) {
    throw new Error('repository must use the owner/repository format');
  }
  return { owner: parts[0], name: parts[1] };
}

async function githubRequest({ token, path, method = 'GET', body, fetchImpl = fetch }) {
  const response = await fetchImpl(`${API_ROOT}${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const detail = typeof data === 'string' ? data : data?.message;
    throw new Error(`GitHub API ${response.status}: ${detail ?? 'request failed'}`);
  }
  return data;
}

export async function findOpenPullRequest({ repository, token, branch, fetchImpl = fetch }) {
  const { owner, name } = parseRepository(repository);
  const headQuery = encodeURIComponent(`${owner}:${branch}`);
  const existing = await githubRequest({
    token,
    path: `/repos/${owner}/${name}/pulls?state=open&head=${headQuery}`,
    fetchImpl
  });
  return Array.isArray(existing) && existing.length > 0 ? existing[0] : null;
}

export async function createPullRequest({
  repository,
  token,
  branch,
  base,
  title,
  body,
  fetchImpl = fetch
}) {
  const existing = await findOpenPullRequest({
    repository,
    token,
    branch,
    fetchImpl
  });
  if (existing) return existing;

  const { owner, name } = parseRepository(repository);

  return githubRequest({
    token,
    path: `/repos/${owner}/${name}/pulls`,
    method: 'POST',
    body: { title, head: branch, base, body },
    fetchImpl
  });
}

export async function upsertPullRequestComment({
  repository,
  token,
  issueNumber,
  body,
  marker = '<!-- knipci-report -->',
  fetchImpl = fetch
}) {
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    throw new Error('issueNumber must be a positive integer');
  }

  const { owner, name } = parseRepository(repository);
  const comments = await githubRequest({
    token,
    path: `/repos/${owner}/${name}/issues/${issueNumber}/comments?per_page=100`,
    fetchImpl
  });
  const existing = Array.isArray(comments)
    ? comments.find((comment) => typeof comment.body === 'string' && comment.body.includes(marker))
    : null;

  if (existing) {
    return githubRequest({
      token,
      path: `/repos/${owner}/${name}/issues/comments/${existing.id}`,
      method: 'PATCH',
      body: { body },
      fetchImpl
    });
  }

  return githubRequest({
    token,
    path: `/repos/${owner}/${name}/issues/${issueNumber}/comments`,
    method: 'POST',
    body: { body },
    fetchImpl
  });
}
