# Pesquisa de fontes esportivas

Consulta em 25/10/2026. Preços, limites e cobertura devem ser revalidados antes de contratar.

| Fonte                     | Acesso / utilidade                                                                                                                                  | Decisão                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ESPN Site API v2          | Feed público sem chave, não oficial. Scoreboard e summary para vários esportes. Campos e disponibilidade variam.                                    | Adaptador inicial para estudo; normalização no backend, timeout e cache.                                                   |
| API-Football / API-Sports | Chave no servidor. Fixtures, eventos, estatísticas e transferências. Página oficial informa 100 requests/dia no Free, com limitações de temporadas. | Integrado para transferências por clube. Não usar o Free para atualização contínua de todas as partidas.                   |
| football-data.org         | API documentada de futebol; plano gratuito limitado a 10 requests/minuto, cobertura e funcionalidades dependem do plano.                            | Alternativa para calendário e resultados de futebol; não substitui automaticamente o detalhe atual nem os outros esportes. |
| SerpApi Google Sports     | Serviço de terceiros que extrai resultados das páginas Google Sports. Usa conta/chave e condições próprias.                                         | Não integrado: adiciona dependência de extração de buscas e não é uma API oficial gratuita do Google.                      |

Não localizei uma API oficial pública do Google que entregue o conjunto de placares, lances e transferências solicitado. Os serviços encontrados como “Google Sports API” são provedores de extração de resultados, como SerpApi. Não é necessário fazer scraping do Google neste projeto.

## Documentação e repositórios consultados

- ESPN, referência comunitária e exemplos: https://github.com/pseudo-r/Public-ESPN-API
- Referência adicional de endpoints ESPN: https://github.com/DanielTomaro13/sportsdata-mcp/blob/main/documentation/ESPN.md
- Exemplo de extração de resultados Google (terceiro): https://github.com/ScrapingBee/google-sports-results-api
- API-Football, planos: https://www.api-football.com/pricing
- API-Football, documentação: https://www.api-football.com/documentation-v3
- football-data.org, políticas: https://docs.football-data.org/general/v4/policies.html
- SerpApi Google Sports: https://serpapi.com/google-sports-api

Repositórios são referências de endpoints e abordagens. Não são garantia de estabilidade, completude, licença dos dados ou substitutos de um provedor com contrato.

## Verificação realizada

Foi consultado o scoreboard de `soccer/eng.1` para 2026-10-25 e o summary da partida `401879252`, com Manchester United e Bournemouth. As respostas continham placar, comentários, estatísticas e escalações. O backend também foi testado agregando as competições configuradas. A existência desses campos em uma partida não garante a mesma cobertura em todas.

Transferências estão implementadas com o endpoint `GET https://v3.football.api-sports.io/transfers?team=ID` e header `x-apisports-key`. Não foi fornecida chave no ambiente, portanto a consulta autenticada ponta a ponta ainda precisa ser validada com a conta do usuário.
