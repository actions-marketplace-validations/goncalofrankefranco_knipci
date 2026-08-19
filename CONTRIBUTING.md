# Contributing to KnipCI

Thanks for helping improve KnipCI. Contributions should keep the project focused on safe, reviewable dependency-cleanup workflows powered by Knip.

## Development setup

Requirements: Node.js 22 or newer, npm, and Git.

```bash
npm ci --ignore-scripts
npm test
npm run lint
```

## Pull Requests

- explain the user-facing behavior or bug being addressed;
- add or update a focused `node:test` test for non-trivial behavior;
- keep changes small and avoid new dependencies when the standard library is sufficient;
- update the formal documentation when behavior or safety boundaries change;
- do not include secrets, credentials, generated `node_modules`, or local reports;
- preserve the boundary between KnipCI logic and Knip internals.

The CI workflow must pass before a Pull Request is merged. Compatibility changes to the Knip version require fixture coverage and an update to `THIRD_PARTY_NOTICES.md` when applicable.

## Scope and relationship with Knip

KnipCI is an independent project. Generic analyzer fixes belong in the upstream Knip project when appropriate; KnipCI should focus on policy, validation, and workflow behavior.
