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
