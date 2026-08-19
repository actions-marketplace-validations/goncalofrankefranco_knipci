# 5. Segurança e distribuição

## 5.1 Classificação do projeto

KnipCI é software open-source sob a licença MIT. O repositório contém implementação, testes, Action e documentação públicos. O projeto não deve ser anunciado como oficial do Knip. A dependência `knip@6.32.2` é licenciada sob ISC; o aviso correspondente está em [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## 5.2 Limite de dados

No MVP:

- o Knip executa localmente no runner;
- o KnipCI não envia código-fonte, manifests ou secrets para um backend próprio;
- npm pode ser acessado pelo comando de instalação do projeto;
- a API do GitHub recebe apenas as operações necessárias para comentário, branch e Pull Request;
- logs de CI podem conter saída dos comandos do projeto e devem seguir a política do usuário.

Não colocar tokens, senhas, conteúdo de `.env` ou credenciais no relatório, no commit ou em mensagens de erro.

## 5.3 Eventos permitidos

### Análise

Pode rodar em Pull Requests com permissões mínimas:

```yaml
permissions:
  contents: read
  pull-requests: write
```

Esse modo não deve modificar o workspace nem fazer push.

### Auto-fix

Deve rodar somente em contexto confiável, como `workflow_dispatch`, agendamento ou push controlado na branch principal:

```yaml
permissions:
  contents: write
  pull-requests: write
```

Não executar código de checkout não confiável com `pull_request_target`. A combinação de token com `contents: write` pode permitir alteração do repositório e exige revisão do workflow.

## 5.4 Ações de contenção

O MVP aplica as seguintes barreiras:

- `scan` não modifica arquivos;
- `--create-pr` exige `--apply`;
- auto-fix exige workspace Git limpo e commit inicial;
- caminhos de configuração fora do repositório são bloqueados;
- package managers não suportados são rejeitados;
- a alteração é limitada a dependências diretas;
- `allowPackages` protege dependências carregadas dinamicamente;
- `maxDependencyRemovals` limita o volume de remoções;
- qualquer arquivo fora de `package.json` e `package-lock.json` bloqueia o fluxo;
- falha no lockfile, install, build ou test restaura o candidato;
- a PR é criada em branch separada;
- PRs abertas para a mesma branch são reutilizadas para evitar duplicação;
- não há deploy automático.

O KnipCI não remove manualmente funções, arquivos ou binários dentro de `node_modules`.

## 5.5 Comandos e scripts

Build e testes são comandos do projeto e podem executar scripts arbitrários. Por isso:

- auto-fix deve usar checkout confiável;
- o conteúdo de `.knipci.json` deve ser revisado;
- secrets devem ser removidos do ambiente quando não forem necessários;
- workflows de análise e auto-fix devem permanecer separados;
- ações de terceiros devem ser fixadas por SHA completo;
- resultados devem ser revisados antes do merge.

O `npm ci --ignore-scripts` padrão reduz execução de lifecycle scripts durante a instalação, mas não transforma build e testes em operações inofensivas.

## 5.6 Gestão da dependência externa

Atualizar Knip exige:

1. alterar a versão fixada em uma branch;
2. executar `npm ci --ignore-scripts`, testes, lint e fixtures;
3. comparar o formato do reporter JSON;
4. confirmar o comportamento do auto-fix e do diff permitido;
5. revisar `THIRD_PARTY_NOTICES.md`;
6. aprovar a Pull Request antes de atualizar a versão de produção.

Correções genéricas devem ser preferencialmente contribuídas ao upstream, sem colocar lógica específica do KnipCI no repositório do Knip.
