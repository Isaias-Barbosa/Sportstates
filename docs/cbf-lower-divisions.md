# Séries C e D de 2026

O catálogo contém 20 clubes e 216 partidas da Série C, e 96 clubes e 610 partidas da Série D. As partidas vêm da rota pública usada pelo calendário da CBF. Rodadas com o mesmo número em grupos ou fases diferentes permanecem separadas pelo ID oficial da partida.

O placar é marcado como encerrado quando há súmula oficial e placares válidos para os dois clubes. A coleta não transforma a data passada em confirmação de resultado. A versão coletada contém súmulas para todas as 826 partidas.

Os participantes, cidades e estádios foram cruzados com as tabelas da Wikipédia. Os vínculos usam nomes, IDs CBF e estado do mando de campo para distinguir homônimos. As páginas de clube mostram as referências da CBF e da Wikipédia. O Maringá preserva o cadastro 17715. Os clubes do piloto da Copa do Brasil preservam os IDs associados às partidas ESPN já revisadas.

## Coleta e publicação

Execute `python scripts/collect-cbf-lower-divisions.py c` ou `d`. O coletor exige Python com lxml. Cada execução consulta no máximo 19 rodadas na Série C ou dez na Série D, além da página da Wikipédia. O arquivo só deve substituir a versão publicada depois da revisão dos vínculos e dos jogos.

O site consulta os JSONs locais para agenda, jogos por liga, detalhe de partida, histórico de confrontos e calendário dos clubes. Essa cobertura é da temporada 2026. Uma temporada futura exige nova coleta.

`sync-lower-division-teams.mjs` cadastra os 116 clubes no Neon no build de produção. Pode ser executado manualmente com `--apply`. Os campos já preenchidos no admin são preservados. O preview acrescenta os perfis de referência ao catálogo para permitir a revisão antes da carga de produção.

## Diferença entre fontes

A página da Wikipédia da Série C consultada informa 215 partidas no resumo. A CBF retornou 216 IDs únicos com súmulas e resultados. O cadastro mantém as 216 partidas oficiais. A Wikipédia foi usada para informações dos clubes, enquanto o calendário e os placares usam a CBF.

Fontes:

- https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-c/2026
- https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-d/2026
- https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_C
- https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_D
