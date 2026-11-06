# Estatísticas da J1 e K League 1 — 06/11/2026

As páginas das competições reutilizam a seção recolhível Estatísticas: gols,
assistências, cartões amarelos e vermelhos. Cada linha apresenta jogador, clube
quando informado pela fonte e o valor da categoria. A edição japonesa é exibida
como 2026/2027; a coreana, 2026.

## Fonte verificada

`https://webws.365scores.com/web/stats/`, com `appTypeId=5`, `langId=31`,
`sports=1`, `withSeasons=true`, `userCountryId=21` e
`timezoneName=America/Sao_Paulo`:

| Competição | competition | seasonNum | Edição retornada |
| --- | --- | --- | --- |
| J1 League | 147 | 67 | 2026/2027 |
| K League 1 | 618 | 43 | 2026 |

A edição é solicitada explicitamente e conferida nos metadados. As tabelas
precisam pertencer à competição solicitada. Tipos de estatística verificados:
gols 1, assistências 2, amarelos 3, vermelhos 4. A ordem das tabelas não é usada
para identificar categorias.

Os oito pares liga/categoria responderam HTTP 200 pela rota local do projeto,
com 20 atletas válidos por categoria. Esse é o recorte disponibilizado pelo feed,
não uma garantia de lista completa de todos os atletas. Há aviso visível na seção.

O endpoint ESPN `jpn.1/seasons/2026/types/1/leaders` também respondeu durante a
investigação. A integração usa o 365Scores nas duas ligas para manter os recortes
de temporada explícitos e obter nomes e clubes na mesma resposta, sem consultas
individuais adicionais. Nenhuma rota ESPN da K League é chamada.

## Proteções e atualização

- Uma consulta por competição/edição atende as quatro categorias; os resultados
  são compartilhados entre consultas simultâneas e guardados por uma hora.
- Cache anterior utilizável por até 12 horas adicionais, com indicação de dados
  em cache. Falhas sem resultado utilizável ativam pausa de cinco minutos.
- No máximo 20 registros são processados por categoria. IDs inválidos,
  duplicados, valores negativos/fracionários e atletas de outra competição são
  omitidos, com aviso de cobertura parcial. Não criar valores ausentes.
- Categoria ausente retorna indisponibilidade, não ranking inventado. Liga ou
  métrica não configurada é rejeitada antes de consultar a fonte.
- IDs de atletas têm prefixo da fonte e competição. Esses rankings não cadastram
  jogadores no Neon nem criam vínculos indevidos com perfis de outra API.

Fontes de consulta: [J1](https://www.365scores.com/en-us/football/league/j1-league-147/stats)
e [K League 1](https://www.365scores.com/en-us/football/league/k-league-1-618/stats).
Trata-se do feed público não oficial do 365Scores, identificado na interface.

Não há migração, nova rotina agendada ou gravação no banco. A Levain Cup não foi
incluída em rankings sem uma verificação própria da cobertura de estatísticas.
