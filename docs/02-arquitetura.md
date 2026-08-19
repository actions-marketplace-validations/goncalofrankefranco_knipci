# 2. Arquitetura técnica

## 2.1 Princípios

- **Wrapper externo:** o motor permanece no pacote oficial do Knip.
- **Execução no runner:** análise, instalação, build e testes acontecem no ambiente do cliente.
- **Alteração mínima:** o auto-fix inicial pode modificar apenas `package.json` e `package-lock.json`.
- **PR reversível:** alterações aplicadas são entregues em branch separada.
- **Falha fechada:** qualquer falha de política ou validação impede a PR e restaura os arquivos candidatos.
- **Código aberto:** o repositório pode ser auditado, usado e melhorado pela comunidade sob a licença MIT.

## 2.2 Componentes do repositório

| Componente | Responsabilidade |
| --- | --- |
| `src/cli.js` | Entrada do processo, carregamento de configuração, códigos de saída e publicação de comentário de scan |
| `src/cli-args.js` | Validação dos comandos e opções da CLI |
| `src/knip.js` | Localização da instalação do Knip, execução da CLI e leitura da versão |
| `src/report.js` | Normalização do JSON, seleção por política e formatação do relatório |
| `src/config.js` | Defaults e validação de `.knipci.json` |
| `src/safety.js` | Detecção do package manager, workspace Git e limites de caminho |
| `src/workflow.js` | Scan, auto-fix, lockfile, validações, rollback e PR |
| `src/github.js` | Chamadas mínimas à API do GitHub para comentários e Pull Requests |
| `action.yml` | Adaptador para uso em GitHub Actions |
| `test/` | Testes unitários, de integração e fixtures controladas |

## 2.3 Fluxo de análise

```text
CLI ou Action
    │
    ├─ valida argumentos e .knipci.json
    ├─ verifica package-lock.json e rejeita pnpm/Yarn/Bun
    ├─ executa Knip com reporter JSON
    ├─ normaliza dependências, arquivos e exports
    └─ imprime JSON ou Markdown
```

`scan` é somente leitura. Ele retorna `clean` quando não há achados e `findings` quando o Knip reporta itens.

## 2.4 Fluxo de auto-fix

```text
fix --apply
    │
    ├─ exige workspace Git limpo e commit inicial
    ├─ executa scan
    ├─ filtra apenas dependências diretas não allowlisted
    ├─ bloqueia acima de maxDependencyRemovals
    ├─ executa knip --fix --fix-type dependencies
    ├─ atualiza package-lock.json com npm
    ├─ valida install
    ├─ valida build
    ├─ valida test
    ├─ aceita somente package.json/package-lock.json no diff
    └─ opcionalmente cria branch e Pull Request
```

Se a atualização do lockfile, a instalação, o build ou os testes falharem, o resultado é `blocked` e os arquivos candidatos são restaurados a partir de `HEAD`.

## 2.5 Contrato lógico do relatório

O relatório normalizado possui schema `1`:

```json
{
  "schema": 1,
  "status": "clean|findings|blocked",
  "engine": {
    "name": "knip",
    "version": "6.32.2"
  },
  "findings": [
    {
      "kind": "unused-dependency",
      "name": "lodash",
      "manifest": "package.json"
    }
  ]
}
```

Os tipos normalizados são `unused-dependency`, `unused-file` e `unused-export`. Uma linha pode ser incluída em achados de export.

Em um auto-fix bem-sucedido, o objeto interno também registra:

```json
{
  "validation": {
    "install": "passed",
    "build": "passed",
    "test": "passed"
  },
  "metrics": {
    "removedDirectDependencies": 1
  }
}
```

O comando `scan` pode emitir JSON ou Markdown. O comando `fix` emite o resumo Markdown e usa o relatório enriquecido para montar a Pull Request.

## 2.6 Integração com GitHub

No modo de análise, o KnipCI pode atualizar um único comentário marcado com `<!-- knipci-report -->` na Pull Request. No modo de auto-fix, ele:

1. procura uma PR aberta para a branch calculada;
2. reutiliza essa PR quando encontrada;
3. caso contrário, cria a branch `knipci/cleanup-<sha>`;
4. faz commit e push de somente os manifests permitidos;
5. cria a Pull Request contra a branch base.

O `GITHUB_TOKEN` nunca deve ser colocado em arquivos de configuração ou no relatório.
