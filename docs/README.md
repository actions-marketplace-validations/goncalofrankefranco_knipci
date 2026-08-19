# Documentação formal — KnipCI

Esta documentação descreve o MVP open-source do KnipCI e suas fronteiras técnicas. O projeto é independente do Knip e não é oficial, afiliado ou endossado por seus mantenedores.

| Campo | Valor |
| --- | --- |
| Produto | KnipCI |
| Versão documentada | 0.1.0 |
| Status | MVP open-source |
| Motor | Knip 6.32.2 |
| Ambiente inicial | Node.js 22+, npm, Git e GitHub Actions |
| Licença | MIT para o código do KnipCI; ISC para o Knip |

## Finalidade

O KnipCI é um wrapper sobre o [Knip](https://github.com/webpro-nl/knip) para detectar dependências não utilizadas e, quando autorizado, propor uma Pull Request com a remoção validada.

O Knip continua sendo o motor de análise. O KnipCI acrescenta operação em CI/CD, política de alteração, validação, controle de segurança e integração com GitHub.

## Índice

- [Visão geral e escopo](01-visao-geral.md)
- [Arquitetura técnica](02-arquitetura.md)
- [Guia operacional](03-operacao.md)
- [Configuração](04-configuracao.md)
- [Segurança e distribuição](05-seguranca.md)
- [Testes e validação](06-validacao.md)
- [Roadmap e modelo comercial](07-roadmap.md)

## Convenções

- **Implementado** significa comportamento coberto pelo código atual e pelos testes existentes.
- **Report-only** significa que o KnipCI pode exibir o achado, mas não altera o projeto automaticamente.
- **Bloqueado** significa que uma política ou validação impediu a alteração ou a criação da PR.
- Qualquer capacidade não descrita como implementada deve ser tratada como planejamento, não como promessa do MVP.

## Fontes de verdade

Em caso de divergência, a ordem de precedência é:

1. código-fonte e testes;
2. configuração e contrato da Action;
3. esta documentação;
4. README resumido.

Alterações de comportamento devem atualizar os testes e esta documentação na mesma mudança.
