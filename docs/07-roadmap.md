# 7. Roadmap e modelo de sustentabilidade

## 7.1 Roadmap de produto

| Fase | Entrega | Gate de avanço |
| --- | --- | --- |
| 0 | nome, licença, relação com upstream e entrevistas | 15 entrevistas e 3 potenciais usuários |
| 1 | CLI `scan` e parser do reporter JSON | fixtures com achados e falsos positivos |
| 2 | `fix --dry-run` e limites de segurança | nenhuma alteração fora do escopo |
| 3 | build, testes, branch e Pull Request | qualquer falha impede a PR |
| 4 | GitHub Action pública | instalação externa sem suporte manual |
| 5 | adoção em 3–5 repositórios reais | pelo menos 3 PRs úteis aceitas |
| 6 | histórico, políticas organizacionais e cobrança opcional | demanda comprovada por equipes |
| 7 | pnpm, monorepos, exports e arquivos | demanda e fixtures suficientes |

O Knip continua sendo uma dependência upstream; a camada de política e workflow permanece independente dele.

## 7.2 Possível monetização futura

O núcleo open-source pode continuar gratuito. Serviços pagos, se houver demanda, poderiam incluir:

- políticas organizacionais centralizadas;
- histórico de economia e alterações;
- dashboard;
- suporte e SLA;
- execução self-hosted gerenciada;
- integrações empresariais;
- auditoria e retenção de evidências.

Não construir dashboard, billing ou backend antes de obter adoção recorrente e evidência de que esses recursos resolvem uma necessidade real.

## 7.3 Métricas de validação

Medir por repositório:

- dependências removíveis;
- tempo de instalação;
- tamanho do lockfile;
- tempo de build;
- tamanho do artefato quando mensurável;
- quantidade de PRs aceitas;
- regressões e rollbacks;
- execuções repetidas sem duplicação.

Critérios de continuidade:

- pelo menos 60% dos repositórios têm achado acionável;
- 3 de 5 pilotos mesclam uma PR;
- zero regressão crítica;
- o benefício é mensurável para os usuários.

Se os critérios não forem atingidos, o projeto deve ser mantido como ferramenta de portfólio ou reduzido para “higiene de dependências e PR automatizada”.
