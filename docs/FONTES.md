# Pesquisa de fontes esportivas

Consulta em 25/10/2026. Preços, limites e cobertura devem ser revalidados antes de contratar.

| Fonte                                                        | Acesso / utilidade                                                                                                       | Decisão                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| ESPN Site API v2                                             | Feed público sem chave, não oficial. Scoreboard e summary para vários esportes. Campos e disponibilidade variam.         | Adaptador inicial para estudo; normalização no backend, timeout e cache.                                                   |
| [Liga Nacional de Basquete](https://lnb.com.br/nbb/equipes/) | Diretório oficial e páginas dos clubes do NBB.                                                                           | Fonte complementar para nomes, páginas e escudos dos perfis; placares e calendários usam a ESPN.                           |
| football-data.org                                            | API documentada de futebol; plano gratuito limitado a 10 requests/minuto, cobertura e funcionalidades dependem do plano. | Alternativa para calendário e resultados de futebol; não substitui automaticamente o detalhe atual nem os outros esportes. |
| SerpApi Google Sports                                        | Serviço de terceiros que extrai resultados das páginas Google Sports. Usa conta/chave e condições próprias.              | Não integrado: adiciona dependência de extração de buscas e não é uma API oficial gratuita do Google.                      |

Não localizei uma API oficial pública do Google que entregue o conjunto de placares e lances solicitado. Os serviços encontrados como “Google Sports API” são provedores de extração de resultados, como SerpApi. Não é necessário fazer scraping do Google neste projeto.

## Documentação e repositórios consultados

- ESPN, referência comunitária e exemplos: https://github.com/pseudo-r/Public-ESPN-API
- Referência adicional de endpoints ESPN: https://github.com/DanielTomaro13/sportsdata-mcp/blob/main/documentation/ESPN.md
- Exemplo de extração de resultados Google (terceiro): https://github.com/ScrapingBee/google-sports-results-api
- football-data.org, políticas: https://docs.football-data.org/general/v4/policies.html
- SerpApi Google Sports: https://serpapi.com/google-sports-api

Repositórios são referências de endpoints e abordagens. Não são garantia de estabilidade, completude, licença dos dados ou substitutos de um provedor com contrato.

## Verificação realizada

Foi consultado o scoreboard de `soccer/eng.1` para 2026-10-25 e o summary da partida `401879252`, com Manchester United e Bournemouth. As respostas continham placar, comentários, estatísticas e escalações. O backend também foi testado agregando as competições configuradas. A existência desses campos em uma partida não garante a mesma cobertura em todas.

## NBB e judô

- ESPN fornece o catálogo NBB com 16 IDs de equipes e o endpoint de calendário usado nos perfis. A lista de equipes pode variar ou estar desatualizada; confira os nomes e escudos no diretório oficial da LNB.
- A LNB é a fonte oficial complementar para os perfis publicados: https://lnb.com.br/nbb/equipes/.
- Judô está no catálogo do Sportstates, mas ainda não há uma fonte integrada de placares.
