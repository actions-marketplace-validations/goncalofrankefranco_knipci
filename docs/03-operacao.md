# 3. Guia operacional

## 3.1 Pré-requisitos

- Node.js 22 ou superior;
- npm;
- Git;
- um repositório JavaScript/TypeScript com `package-lock.json` ou `npm-shrinkwrap.json`;
- acesso ao repositório público do KnipCI;
- uma instalação aprovada de `knip@6.32.2`.

O MVP rejeita projetos que contenham `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb` ou `bun.lock`.

## 3.2 Instalação interna

A instalação a partir do código-fonte é:

```bash
npm ci --ignore-scripts
```

Para verificar a instalação:

```bash
node src/cli.js scan --format json
```

Não executar `npm publish` nem copiar o diretório para um repositório público.

## 3.3 Comandos da CLI

### Scan

```bash
node src/cli.js scan --format markdown
node src/cli.js scan --format json
```

O scan nunca modifica arquivos. Códigos de saída:

| Código | Significado |
| --- | --- |
| `0` | nenhum achado (`clean`) |
| `1` | achados ou erro de execução |

### Auto-fix em simulação

```bash
node src/cli.js fix --dry-run
```

O comando executa a análise e seleciona a política, mas não passa `--fix` ao Knip. O workspace precisa estar limpo. O código de saída é `0` quando a simulação é concluída, mesmo que existam achados; falhas de política ou execução retornam `1`.

### Auto-fix validado

```bash
node src/cli.js fix \
  --apply \
  --build "npm run build" \
  --test "npm test"
```

O `--apply` é obrigatório para alterar arquivos. O fluxo exige um commit inicial e workspace Git limpo. Uma execução bem-sucedida retorna `0`; uma execução bloqueada retorna `1` e restaura o candidato.

### Criação de Pull Request

```bash
node src/cli.js fix --apply --create-pr
```

`--create-pr` exige `--apply`, workspace limpo, commit inicial, `GITHUB_REPOSITORY` e `GITHUB_TOKEN`. O token deve ter permissão para criar branch, fazer push e abrir PR. A execução deve ocorrer em evento confiável, como `workflow_dispatch`, agendamento ou push controlado na branch principal.

## 3.4 Ordem recomendada de adoção

1. executar `scan --format json` localmente;
2. revisar os achados do Knip e configurar `allowPackages` quando necessário;
3. executar `fix --dry-run`;
4. executar `fix --apply` com build e testes explícitos;
5. revisar o diff e o lockfile;
6. somente depois habilitar `--create-pr` em um workflow confiável.

## 3.5 GitHub Actions

O arquivo `action.yml` é uma Action composite pública. O consumidor deve referenciar uma revisão revisada e fixada por SHA completo:

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
      - uses: actions/checkout@<CHECKOUT_SHA>
      - run: npm ci --ignore-scripts
      - uses: goncalofrankefranco/knipci@6a039f5291e94e9b848cd4e4f56b56dd4a31bd09
        with:
          command: scan
          format: markdown
```

Para auto-fix, use um workflow separado e confiável:

```yaml
name: KnipCI cleanup

on:
  workflow_dispatch:
  schedule:
    - cron: '17 3 * * 1'

permissions:
  contents: write
  pull-requests: write

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<CHECKOUT_SHA>
      - run: npm ci --ignore-scripts
      - uses: goncalofrankefranco/knipci@6a039f5291e94e9b848cd4e4f56b56dd4a31bd09
        with:
          command: fix
          apply: 'true'
          create-pr: 'true'
          build: npm run build
          test: npm test
```

O input `token` da Action usa `${{ github.token }}` por padrão. Não é necessário criar um secret adicional; mantenha as permissões `contents: write` e `pull-requests: write` somente nesse workflow confiável.

A Action pode ser usada diretamente do repositório público; o Marketplace não é necessário para o MVP. Atualize o SHA quando adotar uma versão revisada.

## 3.6 Diagnóstico rápido

| Mensagem | Causa provável | Ação |
| --- | --- | --- |
| `Unsupported package manager: ...` | lockfile de pnpm, Yarn ou Bun | usar npm no MVP ou aguardar suporte futuro |
| `No npm lockfile found` | falta de `package-lock.json`/shrinkwrap | gerar e versionar o lockfile |
| `git workspace must be clean` | há alterações locais | revisar ou commitar antes do auto-fix |
| `an initial Git commit is required` | repositório sem `HEAD` | criar um commit inicial |
| `max-dependency-removals-exceeded` | limite de segurança atingido | revisar achados ou ajustar o limite conscientemente |
| `unexpected files in dependency fix` | Knip alterou algo fora do escopo | não criar PR; investigar a versão/configuração |
| `reason: build-failed` ou `test-failed` | validação do projeto falhou | corrigir o projeto e repetir; o candidato é restaurado |
| `GITHUB_REPOSITORY and GITHUB_TOKEN are required` | contexto de PR não configurado | usar apenas em workflow GitHub autorizado |
