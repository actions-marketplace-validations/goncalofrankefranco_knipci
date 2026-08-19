# 4. Configuração

## 4.1 Arquivo `.knipci.json`

O arquivo é opcional e deve ficar dentro do diretório do repositório analisado. Sem ele, o KnipCI usa estes valores:

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

Exemplo completo:

```json
{
  "install": "npm ci --ignore-scripts",
  "build": "npm run build",
  "test": "npm test",
  "maxDependencyRemovals": 10,
  "allowPackages": ["some-runtime-loaded-package"],
  "allowPaths": ["src/generated/**"]
}
```

## 4.2 Campos

| Campo | Tipo | Obrigatório | Função |
| --- | --- | --- | --- |
| `install` | string não vazia | não | comando de instalação usado após a alteração |
| `build` | string não vazia | não | comando de build |
| `test` | string não vazia | não | comando de teste |
| `maxDependencyRemovals` | inteiro positivo | não | máximo de dependências selecionáveis em uma execução |
| `allowPackages` | array de strings | não | pacotes que não podem ser selecionados para auto-fix |
| `allowPaths` | array de strings | não | preparação para política futura de arquivos/exports |

Campos desconhecidos são incorporados ao objeto carregado, mas não possuem efeito no MVP. O arquivo precisa conter um objeto JSON válido e o caminho não pode sair do repositório.

## 4.3 Precedência

Os comandos podem substituir parte da configuração:

```bash
node src/cli.js fix \
  --config .knipci.json \
  --max-dependency-removals 5 \
  --build "npm run build:ci" \
  --test "npm run test:ci" \
  --apply
```

A precedência é:

1. valores da linha de comando;
2. valores de `.knipci.json`;
3. defaults do KnipCI.

## 4.4 Política de seleção

O auto-fix seleciona somente achados `unused-dependency` que não estejam em `allowPackages`. Achados `unused-file` e `unused-export` continuam report-only.

Se a quantidade de dependências selecionáveis for maior que `maxDependencyRemovals`, a execução retorna `blocked` antes de alterar o projeto.

`allowPackages` deve ser usado quando há importação dinâmica, carregamento por configuração, plugin discovery ou outro uso que o analisador estático não consegue inferir.

`allowPaths` é aceito para manter compatibilidade com a política planejada, mas ainda não autoriza nem bloqueia remoções de arquivos/exports no MVP, pois essas remoções não são automáticas.

## 4.5 Comandos executados

Os comandos são strings configuráveis executadas no diretório do repositório. Portanto, `.knipci.json` é configuração com capacidade de execução e deve ser revisado como código.

O fluxo padrão é:

```text
Knip auto-fix
  → npm install --package-lock-only --ignore-scripts
  → install configurado
  → build configurado
  → test configurado
```

O comando de atualização do lockfile é fixo no MVP e usa npm, mesmo quando `install` foi customizado.
