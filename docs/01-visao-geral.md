# 1. Visão geral e escopo

## 1.1 Objetivo do produto

O KnipCI reduz o risco operacional de manter dependências npm sem uso em projetos JavaScript e TypeScript. Ele transforma um diagnóstico do Knip em um fluxo controlado:

1. analisar o repositório;
2. normalizar os achados;
3. aplicar somente a política permitida;
4. atualizar o lockfile;
5. executar instalação, build e testes;
6. validar o diff;
7. criar uma Pull Request reversível, quando solicitado.

O valor entregue no MVP é uma PR de limpeza que pode ser revisada e mesclada pelo time do cliente. O KnipCI não faz deploy e não altera diretamente a branch principal.

## 1.2 Problema atendido

Dependências diretas não utilizadas aumentam o custo de instalação, o tamanho do lockfile, a superfície de manutenção e a quantidade de componentes que precisam ser avaliados em auditorias. A remoção manual costuma ser postergada porque exige investigação, alteração de manifesto, atualização do lockfile e validação do projeto.

O KnipCI automatiza esse trabalho com limites explícitos e rollback quando uma etapa falha.

## 1.3 Relação com o Knip

O KnipCI usa o pacote oficial `knip@6.32.2` como dependência externa. A integração segue estas regras:

- o KnipCI chama a CLI do Knip com reporter JSON;
- não importa módulos internos do Knip;
- não altera o código do Knip;
- usa o auto-fix documentado do Knip com `--fix --fix-type dependencies`;
- atualizações da versão do Knip devem passar por Pull Request e pelos testes de compatibilidade;
- a licença ISC e o aviso de copyright do Knip são preservados em [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md);
- KnipCI é um produto independente e não deve ser apresentado como produto oficial do Knip.

## 1.4 Escopo implementado no MVP

| Capacidade | Situação |
| --- | --- |
| Scan local com JSON ou Markdown | Implementado |
| Detecção de dependências, arquivos e exports pelo Knip | Implementado via relatório |
| Auto-fix de dependências diretas não utilizadas | Implementado |
| Allowlist de pacotes | Implementado |
| Limite máximo de remoções | Implementado |
| Atualização de `package-lock.json` | Implementado |
| Instalação, build e testes de validação | Implementado |
| Rollback em falha | Implementado |
| Verificação do diff permitido | Implementado |
| Branch e Pull Request via API do GitHub | Implementado |
| Comentário atualizado em Pull Request de análise | Implementado |
| npm | Implementado |
| pnpm, Yarn e Bun | Rejeitados no MVP |
| Remoção automática de arquivos e exports | Report-only |
| Monorepo com auto-fix de manifests internos | Fora do MVP |
| Dashboard, backend, histórico e billing | Roadmap |

## 1.5 Não objetivos do MVP

O KnipCI não pretende:

- substituir o Knip;
- remover manualmente arquivos internos de `node_modules`;
- garantir ausência de CVEs;
- executar código não confiável com permissões de escrita;
- enviar o código-fonte para um servidor próprio;
- publicar um pacote npm público;
- fornecer um dashboard ou cobrança antes da validação comercial;
- suportar todas as combinações de package manager, monorepo ou bundler.

## 1.6 Público e posicionamento

O primeiro público é formado por times pequenos e médios que usam JavaScript/TypeScript, npm e GitHub Actions e desejam automatizar manutenção sem introduzir um serviço que receba o código-fonte.

O posicionamento correto é:

> **KnipCI powered by Knip: Pull Requests verificadas para higiene de dependências.**

Essa frase não implica parceria, endosso ou propriedade conjunta com os mantenedores do Knip.
