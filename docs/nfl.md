# NFL: perfis e detalhes de jogos

## Fontes verificadas em 28/10/2026

| Fonte | Cobertura e decisão |
|---|---|
| ESPN Site v2 | Mantida como fonte principal, já integrada ao projeto: `https://site.api.espn.com/apis/site/v2/sports/football/nfl`. `/teams`, `/teams/{id}/roster`, `/teams/{id}/schedule`, `/scoreboard`, `/summary?event={id}`. Consultas testadas sem chave. Feed público não documentado oficialmente; disponibilidade e cobertura podem variar. |
| [Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/sports/football.md) e [Public-NFL-API](https://github.com/pseudo-r/Public-NFL-API) | Referências comunitárias dos endpoints. Não são APIs oficiais nem garantem disponibilidade. A implementação usa HTTP no Node e verifica os payloads retornados. |
| [nflverse / nflreadr](https://github.com/nflverse/nflreadr) | Dados públicos de jogadores, elencos, campanhas, estatísticas e play-by-play. Muito útil para histórico e análise; a [agenda de atualização](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html) inclui atualizações noturnas e em momentos específicos dos dias de jogos. Não foi usado como substituto silencioso do lance a lance ao vivo. Licenças variam por conjunto de dados. |
| [BALLDONTLIE NFL](https://nfl.balldontlie.io/) | API documentada com chave obrigatória e cobertura/restrições por plano. Não adicionamos assinatura, cobrança ou exigência de chave à entrega atual. |

O link do Google foi tratado como referência funcional. A busca não oferece aqui uma API de placares; a página funciona com os dados do provedor esportivo, sem depender do HTML do Google.

## Perfis

`data/nfl-profiles-2026.json` tem os 32 participantes atuais. Catálogo, IDs, escudos e cores vêm da ESPN; sites oficiais foram conferidos no [diretório NFL](https://www.nfl.com/teams/). Estádio e município vêm do estádio mais frequente nos jogos **em casa do calendário atual**, para não adotar uma sede internacional temporária. Fotos de estádio não são inferidas. As descrições são resumos factuais em português; títulos históricos não são inventados.

Nomes que poderiam parecer antigos foram conferidos em fontes atuais: [Reliant Stadium](https://www.houstontexans.com/stadium/) e [Arrowhead Stadium](https://www.chiefs.com/news/chiefs-and-g-e-h-a-announce-return-of-arrowhead-stadium-branding-beginning-with-2026-season). A mudança de nome em 2026 é confirmada pelos próprios clubes.

Chaves internas `football-nfl-{id}` isolam a NFL de NBA, WNBA e futebol. Consultas ESPN recebem somente o ID numérico original. Busca administrativa, links nos escudos, classificação, calendário, notícias e aba Competições seguem essa identidade. As URLs existentes dos outros esportes ficam preservadas.

`sync-nfl-profiles.mjs` aplica uma revisão única em transação, apenas em produção ou com `npm run db:nfl`. Insere cadastros ausentes com `ON CONFLICT DO NOTHING`. A revisão v2 corrige apenas o valor incorreto `Duke University` importado como cidade de Giants/Jets pela v1; a descrição só é corrigida se ainda for exatamente o texto da v1. Todas as demais edições são preservadas. East Rutherford foi conferida no [endereço oficial do MetLife Stadium](https://www.metlifestadium.com/stadium/contact-us).

## Página da partida

- Placar por quarto, total e todas as prorrogações informadas, com a mesma tabela usada pelo basquete. Zero é mantido e campos ausentes aparecem como `—`.
- Resumo: líderes em jardas de passe, corrida e recepção, preservando empates. Somente os números deste jogo são usados; não entram atletas DNP.
- Jogadas de pontuação: touchdowns, field goals, safety e conversões conforme o feed. O placar é o publicado pela fonte, em ordem mandante–visitante. Não calculamos pontos extras a partir do texto.
- Jogadores: passes, corridas, recepções, defesa, interceptações, fumbles, retornos e chutes, conforme as categorias disponíveis. Colunas são associadas pelas chaves do provedor. Totais oficiais ficam separados dos números individuais: jardas líquidas da equipe podem descontar sacks.
- Campanhas: equipe, resultado, jogadas, jardas e tempo. A posse atual só recebe destaque se a partida estiver ao vivo e a fonte identificar a campanha corrente.
- Lance a lance: usa `drives.previous/current.plays` quando `/summary` não tem `plays` no topo. Há deduplicação por ID e ordenação por sequência, sem inverter o relógio regressivo.
- Situação de descida e posse só aparece ao vivo se vier explicitamente no payload; não é deduzida de um jogo encerrado.
- Elencos da NFL ficam no perfil do time, com posições próprias da modalidade (Center/Guard, sem usar a tradução de basquete) e os grupos retornados pela fonte: ataque, defesa, especialistas, reserva/indisponíveis e equipe de treino. A lista completa não é rotulada como os 53 atletas ativos. O boxscore não informa uma escalação equivalente ao quinteto de basquete; não rotulamos jogadores como titulares por terem estatísticas.

Rótulos principais são em pt-BR, e o relato preserva o português disponibilizado pela ESPN. O cache, as mensagens de cobertura parcial e a atualização a cada 30 segundos existentes continuam aplicados.

## Validação

Testes cobrem isolamento de IDs, os 32 perfis, quartos/prorrogação/zeros, totais líquidos vs. individuais, colunas fora de ordem, líderes empatados, DNP, pontuações, relógio regressivo, campanhas duplicadas, dados parciais e jogos futuros. Também são executados todos os testes existentes e o build TypeScript/Vite, com conferência de um payload real da NFL.
