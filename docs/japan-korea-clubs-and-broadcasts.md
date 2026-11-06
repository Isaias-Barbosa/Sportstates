# Japão, Coreia e consulta de transmissões — 05/11/2026

## O que foi verificado

- Catálogo ESPN `soccer/jpn.1/teams`: 20 clubes; snapshot versionado em
  `data/asian-profiles-2026.json`. Nomes, escudos e IDs são da fonte consultada.
- Classificação 365Scores, competição 618: 12 clubes coreanos. IDs locais
  `365-kor-<id>` evitam colisões com a chave global de clubes ESPN no Neon.
- Classificação 365Scores, competição 147: cruzamento revisado dos 20 clubes
  japoneses com seus IDs ESPN. Aliases como Hiroshima Sanfrecce/Sanfrecce Hiroshima
  estão resolvidos no snapshot, sem busca aproximada durante requisições.
- Levain Cup: competição 619, nome retornado “Copa da Liga do Japão”. Em novembro
  a consulta real retornou oito partidas de quartas de final. Calendário,
  chaveamento e detalhes usam o adaptador com datas explícitas, filtros, cache,
  deduplicação e pausa após falha. Nunca tentar IDs rejeitados da ESPN.

Jogos da Levain Cup usam os IDs dos mesmos clubes cadastrados na J1. Clubes ainda
sem vínculo usam prefixo `365-jpn-` para não se passar por outro clube ESPN.

As páginas dos clubes japoneses reutilizam a integração ESPN existente. As dos
coreanos usam calendário mensal 365Scores compartilhado, no máximo cinco chamadas
sequenciais por atualização, cache de cinco minutos e circuit breaker. A cobertura
é parcial: elenco, notícias e histórico de competições coreanos ainda não foram
integrados. A página informa essa limitação. Não são inventados cidade, estádio,
site oficial, títulos ou valores de mercado ausentes das fontes verificadas.

## Cadastro e Neon

O catálogo versionado disponibiliza os 32 clubes antes da carga, com registros
existentes no Neon tendo prioridade sobre os dados iniciais. A importação
`scripts/sync-asian-profiles.mjs` é idempotente, preserva cadastros existentes e
recusa IDs já associados a outro esporte ou liga.

O build local/preview somente valida; o build de produção aplica a revisão.
Também existe `npm run db:asian-clubs`, que exige DATABASE_URL e `--apply` no
comando configurado. Não é necessária uma nova migração: usa `sport_teams` e o
controle de revisões já existente. Nenhuma gravação no Neon foi executada nesta
etapa de desenvolvimento.

## Transmissões e limites territoriais

- [J.League, anúncio de 2025](https://www.jleague.co/id/news/overseas-broadcasting-of-the-2025-meiji-yasuda-jleague-broadcasting-in-brazil-has-been-newly-added/): confirma GOAT e X Sports para jogos selecionados daquela edição; não prova todos os jogos ou temporadas futuras.
- [Final da Levain Cup de 2025](https://www.jleague.co/leaguecup-final/): GOAT no Brasil; evidência histórica, não confirmação automática de 2026.
- [GOAT, apresentação do próprio canal](https://br.linkedin.com/company/canalgoatbr): inclui J1 e Levain Cup no portfólio. [Agenda oficial atual](https://canalgoat.com.br/programacao/): consultar o confronto e a data.
- [J.League, onde assistir](https://www.jleague.jp/en/j1/where-to-watch/): destino público de consulta; não foi usado como feed de programação.
- [LiveSoccerTV, J1](https://www.livesoccertv.com/pt/competitions/japan/j-league/): a página consultada lista DAZN **Japan** nos jogos; o menu geral também contém canais brasileiros, mas não é evidência de direitos daquela competição. Não foi confirmada disponibilidade da J1 no DAZN Brasil ou ESPN/Disney+.

“Onde assistir” inclui GOAT e consulta oficial para a copa, e GOAT/Xsports/consulta
da liga para J1, sem confirmar cada jogo por direitos de competição.

## LiveSoccerTV

Adicionada seção de consulta complementar para nove competições: J1, Levain Cup,
K League 1, Série A, Série B, Premier League, LaLiga, Bundesliga e Champions.
Todos os destinos foram abertos durante a verificação. O usuário deve selecionar
Brasil e conferir confronto, data e país da emissora. A consulta fica separada
dos links de canais confirmados.

Não foi identificado e validado um feed público estável para importar esses
dados automaticamente. Não há scraping em cada visita, reprodução das tabelas
ou associação automática de DAZN Japan ao Brasil. Classificação e artilharia do
LiveSoccerTV continuam apenas consultáveis externamente; rankings internos só
devem ser habilitados com fonte e identificadores verificados.
