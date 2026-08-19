# KnipCI

[![CI](https://github.com/goncalofrankefranco/knipci/actions/workflows/ci.yml/badge.svg)](https://github.com/goncalofrankefranco/knipci/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Safe dependency-cleanup Pull Requests powered by [Knip](https://github.com/webpro-nl/knip).

KnipCI is an independent open-source wrapper around the official Knip CLI. It turns unused-dependency findings into a conservative, validated workflow with explicit limits, rollback, and optional Pull Request creation.

It is not an official Knip product, and it does not modify Knip internals.

## Status

Open-source MVP. The first release supports Node.js 22+, npm, `package-lock.json`, Git, and GitHub Actions. The project is useful today for local experiments and controlled CI adoption; broader package-manager and monorepo support remain roadmap work.

## What it does

- runs Knip with a machine-readable reporter;
- reports unused dependencies, files, and exports;
- auto-fixes only selected direct dependency findings;
- protects intentionally dynamic dependencies with an allowlist;
- updates the npm lockfile;
- runs install, build, and test validation;
- restores the candidate when validation fails;
- limits the dependency-fix diff to `package.json` and `package-lock.json`;
- creates or reuses a Pull Request on a separate branch when requested.

KnipCI does not claim that static analysis is perfect. Configure Knip correctly, review findings, and treat generated Pull Requests as changes that require normal project review.

## Install from source

```bash
git clone https://github.com/goncalofrankefranco/knipci.git
cd knipci
npm ci --ignore-scripts
npm test
npm run lint
```

Run a scan against the current project:

```bash
node src/cli.js scan --format markdown
node src/cli.js scan --format json
```

The CLI is also exposed as `knipci` when the package is installed locally:

```bash
npx --no-install knipci scan --format json
```

## CLI

```bash
node src/cli.js scan --format json
node src/cli.js fix --dry-run
node src/cli.js fix --apply --build "npm run build" --test "npm test"
node src/cli.js fix --apply --create-pr
```

`scan` never changes files. `fix` requires `--apply` before changing files. `--create-pr` additionally requires a clean Git workspace, an initial commit, and GitHub environment variables with permission to push a branch and open a Pull Request.

## Configuration

Create `.knipci.json` when the defaults do not match the repository:

```json
{
  "install": "npm ci --ignore-scripts",
  "build": "npm run build",
  "test": "npm test",
  "maxDependencyRemovals": 10,
  "allowPackages": [],
  "allowPaths": []
}
```

`allowPackages` protects dependencies loaded dynamically or intentionally retained. `allowPaths` is reserved for the future file/export cleanup policy; those findings remain report-only in this MVP.

## GitHub Actions

Use a full commit SHA when consuming the Action. Replace `<KNIPCI_SHA>` with the reviewed commit you want to run:

```yaml
name: KnipCI analysis

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  knipci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803
      - run: npm ci --ignore-scripts
      - uses: goncalofrankefranco/knipci@<KNIPCI_SHA>
        with:
          command: scan
          format: markdown
```

Use auto-fix only from a trusted workflow such as `workflow_dispatch`, a schedule, or a controlled push to the default branch. Do not use `pull_request_target` with an untrusted checkout:

```yaml
permissions:
  contents: write
  pull-requests: write
```

The Action installs its pinned dependencies on the runner. It does not upload source code to a KnipCI service.

## Documentation

The formal documentation is in [`docs/README.md`](docs/README.md):

- [overview and scope](docs/01-visao-geral.md);
- [technical architecture](docs/02-arquitetura.md);
- [operations](docs/03-operacao.md);
- [configuration](docs/04-configuracao.md);
- [security](docs/05-seguranca.md);
- [validation](docs/06-validacao.md);
- [roadmap](docs/07-roadmap.md).

## Relationship with Knip

KnipCI uses the official `knip@6.32.2` package as an external dependency. It uses public CLI behavior and reporters, does not import Knip internals, and is not endorsed by the Knip maintainers. The external ISC notice is reproduced in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Contributing

Issues, documentation improvements, fixtures, and compatibility fixes are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a Pull Request.

## License

KnipCI source code is available under the [MIT License](LICENSE). The Knip dependency remains under its own ISC License; see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
