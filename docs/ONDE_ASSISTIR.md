# Onde assistir — links oficiais

O recurso aparece apenas quando o estado da partida é `live`: na seção de destaque, num atalho na linha da Central de jogos e na página de detalhes. O atalho abre o bloco `#onde-assistir`; links externos abrem em nova aba com `noopener noreferrer`.

## Precisão do que é mostrado

O feed ESPN pode devolver emissoras dos EUA mesmo com `region=br`. Portanto `broadcast` nunca é convertido automaticamente em uma indicação de transmissão brasileira. O backend usa o catálogo `server/watch.mjs`, revisado em 25/10/2026, com `country: BR`, `scope: competition` e `confirmedForMatch: false`.

A interface informa que as plataformas são opções da competição e que é necessário confirmar o jogo na programação. Não há uma API de grade brasileira por evento integrada nesta versão. Não inventamos links de vídeo nem afirmamos que toda partida está em todos os serviços listados. Direitos, planos e restrições territoriais variam. Sem destino conhecido, a interface informa a ausência. Para ligas com direitos fragmentados, usamos o diretório oficial de emissoras, sem adivinhar um detentor.

## Fontes consultadas

| Competição                                      | Destinos / referência oficial                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Brasileirão A                                   | https://premiere.globo.com/ e Prime Video, conforme https://www.aboutamazon.com.br/noticias/entretenimento/nba-no-modo-prime-voltou-com-nova-programacao-e-comentarista-para-a-temporada-2026-27 |
| Brasileirão B, Premier League, Serie A italiana | Catálogo ESPN do Disney+: https://www.disneyplus.com/pt-br/browse/page-15961e0d-00e3-4ff5-90b1-eb71a0f9457c                                                                                      |
| LaLiga                                          | https://www.laliga.com/en-GB/where-to-watch-laliga-easports                                                                                                                                      |
| Bundesliga                                      | https://www.bundesliga.com/en/bundesliga/info/broadcasters/                                                                                                                                      |
| Ligue 1                                         | https://ligue1.com/en/international-broadcasters                                                                                                                                                 |
| Champions League                                | https://help.hbomax.com/br/Answer/Detail/000002560                                                                                                                                               |
| NBA                                             | https://www.nba.com/league-pass-purchase, catálogo Disney+ e comunicado Prime Video acima                                                                                                        |
| WNBA                                            | https://www.wnba.com/leaguepass                                                                                                                                                                  |
| NFL                                             | https://www.dazn.com/pt-BR/l/nfl-game-pass e https://www.nfl.com/international/ways-to-watch/brazil                                                                                              |
| MLB                                             | https://www.mlb.com/tv e catálogo Disney+                                                                                                                                                        |
| NHL                                             | https://www.nhl.com/info/how-to-watch-by-country                                                                                                                                                 |

## Manutenção e segurança

Atualize catálogo, fontes e `WATCH_REVIEWED_AT` quando houver alteração de direitos ou revisão de temporada. O campo de atualização é exibido nos detalhes. O catálogo é estático; não se trata de confirmação automática da transmissão da partida. Não usa chaves adicionais nem chamadas externas por jogo.

Destinos de navegação são HTTPS e limitados a hosts oficiais exatos. Não há embeds, proxies de vídeo, URLs M3U8/DRM ou extração de streams. A autenticação e eventual assinatura acontecem diretamente no serviço escolhido.

## Canais nos cards (26/10/2026)

Cards de jogos ao vivo e próximos exibem selos de texto e links oficiais. Selos são identificadores visuais, não logos de marcas copiados.

A normalização admite canais específicos apenas se o registro de transmissão da partida declarar explicitamente região `br`, com nome reconhecido. ESPN numerada não é deduzida por competição ou idioma da consulta. A lista conhecida inclui ESPN e ESPN 2–6, Disney+, Premiere e Prime Video. Registros estrangeiros, sem país ou desconhecidos são ignorados.

Sem evidência por partida, exibe-se “Guia da competição · confirmar jogo”. Essa alternativa não garante a transmissão do confronto. Nos testes reais, o feed ESPN apresentou transmissões dos EUA ou nenhuma transmissão brasileira, mesmo com `region=br`; portanto não há cobertura garantida de canais exatos para cada jogo.

SofaScore não foi usado como confirmação oficial: a própria [FAQ de programação](https://sofascore.helpscoutdocs.com/article/175-tv-schedule-information?lng=en) explica que os dados combinam contribuições da comunidade e outras fontes. Para cobertura completa será necessário um fornecedor de grade brasileira por evento ou integração com programação das emissoras.

## Agenda da CazéTV e exterior (26/10/2026)

- `server/broadcast-schedule.mjs` consulta a agenda pública https://www.agendacazetv.com.br/ uma vez por instância a cada 5 minutos, com limite de 8 segundos e sem fan-out por partida. Lê metadados de vídeos como dados, sem executar scripts. Uma falha mantém as opções gerais e não declara ausência de transmissão no Brasil.
- Só aceita vídeos do canal CazéTV de ID `UCZiYbVptd3PVPf4f6eR6UaQ`, título AO VIVO, descrição com imagens, dois adversários e data válida. Reprises, melhores momentos e pós-jogo são rejeitados. Equipes (aliases explícitos), mando e horário de pré-jogo até 90 minutos precisam coincidir sem ambiguidade.
- Confrontos verificados na agenda de 26/10: PSG x Lyon (`WHYTOnqWFgE`) e Sevilla x Osasuna (`Q1ccB92YYFA`). A exibição depende do estado e horário recebidos da ESPN; partidas encerradas não exibem opções ao vivo.
- Diretório adicional: ESPN e ESPN 2–6, sportv 1–3, CazéTV, GOAT, ESPN Brasil e TNT Sports no YouTube, Globo, Record, SBT, Band/BandSports, TNT Sports e Xsports. Esses links são para consultar canais oficiais, **não confirmação por jogo**. GOAT e os demais canais não possuem integração automática de agenda nesta versão.
- Transmissões estrangeiras vêm do feed da partida com país explícito diferente de BR. Nomes desconhecidos são informativos, sem inventar URL; os conhecidos têm destinos oficiais. Qazsport/KZ só aparece se recebido na fonte, nunca por suposição a partir do exemplo “Kazan”.
- Opções do exterior são mostradas quando não há transmissão brasileira confirmada. Podem ter assinatura e bloqueio territorial. Nenhum mecanismo de contorno é fornecido.
- `brazilStatus=unknown`: “Ainda não identificamos uma transmissão confirmada deste jogo para o Brasil”. Ausência no feed não significa ausência na televisão. `unavailable` é reservado a uma futura fonte que confirme explicitamente essa condição.
- Teste direto da API SofaScore retornou HTTP 403 com `reason: challenge`; nenhuma tentativa de contornar o bloqueio foi feita e nenhuma integração SofaScore foi ativada.

## Ajustes da home e PSG (26/10/2026)

O menu lateral passa a ser uma gaveta fechada inicialmente em todas as larguras, aberta pelo botão do cabeçalho; fecha por botão, clique externo, seleção de página ou Escape. O foco fica na gaveta enquanto aberta.

O destaque prioriza jogos ao vivo, inclusive quando um filtro de esporte não tem jogo em andamento; filtros permanecem aplicados à lista. “Escolha seu esporte” vem depois do destaque. Na partida, Onde assistir usa details/summary fechado por padrão; links diretos #onde-assistir abrem a seção.

A lista principal da agenda da CazéTV deixou de incluir PSG x Lyon, embora a página https://www.agendacazetv.com.br/watch/WHYTOnqWFgE continue anunciando o jogo. Foi acrescentada essa referência verificada, limitada ao evento ESPN 401876422 e data 26/10/2026. A página é consultada e validada novamente, em paralelo à agenda, com cache de 5 minutos; não é uma confirmação fixa nem aplicada a outras rodadas. Vídeos encontrados em ambas as fontes são deduplicados por ID.
