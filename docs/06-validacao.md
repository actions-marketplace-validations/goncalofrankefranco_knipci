# 6. Testes e validação

## 6.1 Suíte automatizada

O projeto usa `node --test`, sem framework adicional. A validação básica é:

```bash
npm ci --ignore-scripts
npm test
npm run lint
```

Resultado registrado para o MVP:

- instalação limpa: aprovada;
- suíte: 27 testes aprovados, 0 falhas;
- verificação sintática: aprovada.

## 6.2 Teste prático controlado

O procedimento reproduzível está em [`docs/superpowers/plans/2026-07-23-knipci-local-effectiveness-test.md`](superpowers/plans/2026-07-23-knipci-local-effectiveness-test.md). Ele usa um projeto npm descartável fora deste repositório, com:

- `is-number` usado pelo código;
- `left-pad` declarado, mas não utilizado;
- Git inicializado e workspace limpo;
- execução do CLI por caminho local.

Resultados:

| Cenário | Resultado |
| --- | --- |
| Scan | encontrou exatamente `left-pad`; `is-number` não foi reportado |
| Precisão/recall do fixture | 100%/100%, com 1 verdadeiro positivo e 1 verdadeiro negativo |
| Dry-run | não alterou manifest, lockfile ou Git |
| Apply aprovado | removeu somente `left-pad`; install, build e test passaram |
| Limite do diff | somente `package.json` e `package-lock.json` foram alterados |
| Idempotência | novo scan ficou `clean` |
| Build falho | resultado `blocked`, rollback executado e `test` não iniciado |

A precisão e o recall acima são métricas do fixture controlado, não uma estimativa de acurácia para todos os repositórios.

## 6.3 Validações adicionais

As seguintes verificações também foram realizadas:

- pnpm, Yarn e Bun foram rejeitados com mensagem explícita;
- scan em monorepo encontrou a dependência interna, mas o auto-fix bloqueou o diff fora do manifesto raiz;
- achados de arquivo permaneceram report-only;
- uma dependência carregada por importação dinâmica pôde ser protegida com `allowPackages`;
- cinco scans do próprio repositório KnipCI ficaram `clean`, com tempos de 1.090 ms a 1.935 ms e mediana de 1.233 ms.

## 6.4 Limitações da evidência

Os testes não comprovam:

- segurança para qualquer configuração de bundler;
- segurança de remoção de exports ou arquivos;
- suporte a auto-fix em monorepos;
- suporte a pnpm, Yarn ou Bun;
- ausência de vulnerabilidades;
- comportamento de uma integração GitHub real com token e remote;
- performance em repositórios grandes ou em runners concorrentes.

O teste GitHub deve ser feito em um repositório de piloto, com permissões mínimas e revisão humana da PR.

## 6.5 Critério de aprovação operacional

Uma execução pode ser considerada bem-sucedida somente quando:

1. o scan concluiu;
2. a política permitiu os achados;
3. o lockfile foi atualizado;
4. install, build e test passaram;
5. o diff contém somente arquivos permitidos;
6. a PR, quando solicitada, foi criada ou reutilizada;
7. nenhum secret apareceu no output.

Se qualquer etapa falhar, o resultado é bloqueado e não deve ser mesclado automaticamente.
