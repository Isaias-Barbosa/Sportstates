# Tênis de mesa masculino

A integração utiliza a documentação pública de leitura da World Table Tennis:
https://mobileappapi.worldtabletennis.com/index.html

Circuitos cadastrados: WTT Grand Smash, Champions, Star Contender, Contender, Feeder, Finals, Mundial ITTF e Copa do Mundo ITTF. Apenas simples masculino sênior; não mistura feminino, duplas, juvenil, paradesporto ou torneios por equipes. Não cria ligas fictícias na ESPN nem cadastra atletas como times no Neon.

O calendário é lido por `GetAllEventsOnlyWithEventName`, incluindo o intervalo de datas publicado no nome. IDs duplicados do mesmo evento são normalizados. Os metadados são consultados pelo endpoint de leitura `POST GetAllEventsWithIds`. A agenda vem de `GetEventSchedule/{eventId}`. Resultados oficiais de `GetOfficialResult` têm prioridade sobre cards intermediários antigos, evitando manter partidas encerradas como ao vivo. Placares vêm de `POST MatchCards`, com documentos oficiais de 42 caracteres e lotes de até 100. Esses POSTs são consultas de leitura documentadas; não criam nem alteram registros na WTT. Rotas de serviços mobile que exigiram autenticação não foram usadas.

Ranking: `GetRankingIndividuals?TopN=100&SubEventCode=MS&CategoryCode=SEN`, inclusive a resposta codificada como string JSON pelo servidor com `Accept: application/json`. Exibe nome, posição, posição anterior, pontos e país publicados. Não inventa fotos ou idades. O ranking é mundial, compartilhado entre os circuitos, e não uma classificação de pontos exclusiva de cada evento.

Os resultados preservam pontos por set e sets vencidos, removendo os sets futuros 0–0 do placar. O estado ao vivo exige indicação explícita da fonte; o horário sozinho não transforma uma partida em jogo ao vivo. Fases incluem 16 avos, oitavas, quartas, semifinal e final, quando publicadas.

Horários: prioridade para `matchDateTime.startDateUTC`. A agenda local só é convertida usando um fuso conhecido do país da sede, com horário de verão via Intl. Sedes com fusos ambíguos e sem UTC são omitidas até a fonte publicar um horário confiável; partidas com adversários indefinidos também são omitidas. A home agrupa pelo dia em Brasília. Não há promessa de todos os torneios ou ponto a ponto universal.

Cache: calendário/metadados 6h; ranking 1h; eventos ao vivo 15s; outros eventos atuais 1min; eventos antigos 6h. O cache existente e o botão de limpeza do admin continuam válidos. Rotas públicas: `/api/table-tennis-athletes`, `/api/match?sport=table-tennis&league=...&id=...`, `/api/standings?...` e `/api/league-games?...`.

O esporte aparece no menu, filtros, jogos, ranking, atletas e detalhes por sets. Os atletas são exibidos na própria página `/times?sport=table-tennis` (assim como ATP em `/times?sport=tennis`), com os demais filtros de esporte preservados; a rota antiga `/atletas` redireciona para essa seleção. O sino existente também acompanha pontos e sets de tênis de mesa, respeitando o limite de um esporte para visitantes.

Na home, cada competição é um `details` aberto inicialmente, com `summary`, contagem e seta. Pode ser recolhida por mouse ou teclado, independentemente das outras. Mudar de página/filtros pode remontar a seção aberta, sem gravar uma preferência permanente.

Testes cobrem catálogo, categorias, calendário, IDs estáveis, fusos/horário de verão, resultados, sets, estado ao vivo, ranking e integração das rotas com respostas da WTT. As consultas reais foram conferidas com Montpellier e Chennai em 29/10/2026 e com o ranking publicado pela WTT.
