# Detalhes das partidas de tênis masculino

Revisão: 29/10/2026. A página mantém ESPN como fonte do placar por sets e carrega os detalhes adicionais separadamente por `/api/tennis-insights?id=...`. O tempo de resposta do placar não depende da página de estatísticas, das fotos ou dos vídeos.

## Dados adicionais

O HTML público do Tennis.com disponibiliza objetos JSON de placares e estatísticas. O parser Flight existente lê esses objetos como dados, sem executar scripts. Primeiro identifica a partida no índice diário `https://www.tennis.com/?date=AAAA-MM-DD`; depois consulta apenas o endereço da partida encontrado nesse índice. Não adivinha IDs de Sportradar nem usa APIs privadas.

A associação exige nomes completos dos dois atletas, simples masculino, nome oficial do torneio, horário até seis horas de diferença e resultado único. Inversão de mandante/visitante remapeia estatísticas, perfis, ponto atual e histórico. Nunca aplica números de um confronto antigo entre os mesmos atletas. Históricos são explicitamente um recorte fornecido pela fonte, sem total de vitórias inventado.

Dados aceitos: aces, duplas faltas, primeiro saque, pontos ganhos no primeiro/segundo saque, break points salvos/convertidos, games de serviço/devolução ganhos e pontos de devolução. Valores ausentes permanecem ausentes; zero e 0/0 não viram campos vazios. Perfis podem mostrar país, ranking de simples, melhor ranking, altura, mão dominante e ano de profissionalização. Pontos e servidor são opcionais; a seção informa a fonte, a hora da consulta e o placar da fonte, pois ela pode atualizar em momento diferente da ESPN. O sinal de dados ao vivo pendentes do Tennis.com é exibido.

Índice diário: cache de dois minutos. Detalhes: 30 segundos ao vivo, cinco minutos antes, uma hora após o jogo. Falhas não impedem o placar nem inventam estatísticas. Não altera os placares de outros esportes.

## Fotos

MediaWiki pt.wikipedia.org, identidade de tenista e título exato do atleta, depois metadados do arquivo em commons.wikimedia.org. Só aceita imagens de hosts Wikimedia, licença CC BY/CC BY-SA/CC0/domínio público e página de origem válida. Mostra autoria, licença e link da imagem. Não trata qualquer foto encontrada na web como domínio público. Cache de sete dias; falhas retornam iniciais. Fotos de terceiros sem licença verificada não são usadas como fallback.

## Vídeos

Libera Lances da Partida e o fragmento #videos no tênis. Feeds oficiais ESPN Brasil e Tennis TV (canal UCbcxFkd6B9xUU54InHv4Tig, conferido no próprio YouTube). Busca adicional nos vídeos públicos das notícias ESPN dos dois atletas; só aceita os que identificam ambos, torneio e janela de publicação. Canais brasileiros têm prioridade. Filtros rejeitam anos diferentes, WTA, duplas, previews e retrospectivas. Não incorpora um duelo antigo por compartilhar os mesmos adversários. A cobertura é parcial e os feeds fornecem apenas vídeos recentes; quando não há um clipe encontrado, ficam disponíveis buscas nos canais oficiais. Restrições de região e de embed continuam sendo respeitadas.

## Pesquisa de APIs e referências

- https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/sports/tennis.md — placar, atletas, competições. No confronto analisado a ESPN retornou estatísticas vazias; não é uma garantia de aces para todos os jogos.
- https://github.com/glad94/infotennis — referência de pesquisa para estatísticas ATP/Infosys. Depende de IDs de torneio/partida de outra fonte; não se implementou enumeração de IDs nem contorno do bloqueio do site ATP.
- https://github.com/livetennisapi/livetennisapi-mcp — integração com serviço que exige chave e planos distintos; estatísticas detalhadas têm plano específico. Nenhuma conta paga foi criada.
- https://github.com/serve-and-volley/atp-world-tour-tennis-data — arquivos históricos e scrapers antigos, insuficientes para confirmar o jogo atual.
- https://www.tennis.com/tournaments/swiss-indoors-basel/matches/n-djokovic-vs-j-struff-2026-10-29 — dados públicos conferidos para o exemplo. O fixture de testes é um recorte factual dessa resposta, não um inventário de partidas.

Validação: identidade, data e competição, inversão de atletas, valores zero, orientações do saque, licença/host das fotos e rejeição de vídeos de outras edições. Revisão React: componente isolado, carregamento independente, cancelamento por useApi, imagens com dimensões/fallback, tabela com cabeçalhos e rolagem em telas pequenas.
