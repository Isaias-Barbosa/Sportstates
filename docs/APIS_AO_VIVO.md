# Fontes para partidas ao vivo

Pesquisa revisada em 26/10/2026. Repositório aberto não garante licença de redistribuição dos dados de terceiros nem disponibilidade do serviço.

| Projeto / API | Cobertura e uso | Avaliação para Sportstates |
| --- | --- | --- |
| [Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API) | Referência comunitária de endpoints ESPN: placares, detalhes, eventos e elencos de vários esportes. Não é API hospedada própria. | Mantida a fonte existente; consultas agora usam `lang=pt&region=br`. Sem contrato de estabilidade. |
| [Public-Sofascore-API](https://github.com/pseudo-r/Public-Sofascore-API) | Documentação comunitária de endpoints SofaScore. | Candidato de estudo; não integrado. Exige avaliar termos, disponibilidade e mapear IDs próprios. |
| [SportMonks/MCP](https://github.com/SportMonks/MCP) | Integração oficial com Football API 3.0. [Documentação livescores](https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/livescores-and-fixtures/livescores). | Para produção usar REST diretamente. Necessita token e verificar cobertura/plano. Não ativado sem credenciais. |
| [API-Football](https://www.api-football.com/) | API documentada de futebol com eventos e escalações; outras APIs esportivas separadas. | Chave já usada no módulo alternativo de transferências. Não consultar todo o catálogo sem avaliar cota; IDs diferentes da ESPN. |
| [football-data.org](https://www.football-data.org/) | Serviço de futebol com resultados, agenda e dados de partidas. | Alternativa documentada; avaliar competições, acesso e atualização contratados. Não substitui cobertura multiesporte sozinho. |

## Implementação atual

- Locale solicitado à ESPN tanto no placar quanto no detalhe. Português real verificado no evento `401879252`, Manchester United x Bournemouth: comentários, rótulos e posições vêm traduzidos pela fonte.
- A disponibilidade do idioma varia por esporte/competição; texto ausente em português pode continuar no idioma original. Sem tradução automática inventada.
- Intervalo identificado pelo código da fonte, nunca deduzido somente do relógio de 45 minutos. Outros intervalos entre períodos e interrupções recebem rótulo próprio.
- Escalações preservam formação, número de posição da fonte, titulares, reservas e entradas/saídas. O campo esquemático usa mapas ESPN inspecionados para 4-2-3-1 e 4-3-3. Outras formações usam os papéis posicionais da fonte e as quantidades declaradas em cada linha; há testes para 4-4-2, 3-5-2, 3-4-3, 4-1-4-1, 4-3-1-2 e 5-3-2. Dados incompletos ou linhas de meio-campo ambíguas mantêm a lista. Números de camisa não são usados para escolher posições.
- Não misturar IDs de jogadores, equipes ou partidas entre fornecedores. Uma migração exige adaptador e reconciliação explícitos.
