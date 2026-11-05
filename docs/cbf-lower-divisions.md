# Séries C e D de 2026

O catálogo contém 20 clubes e 216 partidas da Série C, e 96 clubes e 610 partidas da Série D. As partidas vêm da rota pública usada pelo calendário da CBF. Rodadas com o mesmo número em grupos ou fases diferentes permanecem separadas pelo ID oficial da partida.

O placar é marcado como encerrado quando há súmula oficial e placares válidos para os dois clubes. A coleta não transforma a data passada em confirmação de resultado. A versão coletada contém súmulas para todas as 826 partidas.

Os participantes, cidades e estádios foram cruzados com as tabelas da Wikipédia. Os vínculos usam nomes, IDs CBF e estado do mando de campo para distinguir homônimos. As páginas de clube mostram as referências da CBF e da Wikipédia. O Maringá preserva o cadastro 17715. Os clubes do piloto da Copa do Brasil preservam os IDs associados às partidas ESPN já revisadas.

## Coleta e publicação

Execute `python scripts/collect-cbf-lower-divisions.py c` ou `d`. O coletor exige Python com lxml. Cada execução consulta no máximo 19 rodadas na Série C ou dez na Série D, além da página da Wikipédia. O arquivo só deve substituir a versão publicada depois da revisão dos vínculos e dos jogos.

O site consulta os JSONs locais para agenda, jogos por liga, detalhe de partida, histórico de confrontos e calendário dos clubes. Essa cobertura é da temporada 2026. Uma temporada futura exige nova coleta.

## Classificação e estatísticas

`collect-cbf-lower-statistics.py c` e `d` produzem snapshots separados de classificação e artilharia. A Série C tem 20 clubes na primeira fase e dois grupos de quatro na segunda; a Série D tem 16 grupos de seis na primeira fase. Os IDs e a ordem vêm da CBF, incluindo pontos, jogos, vitórias, empates, derrotas, gols, saldo e cartões. Não se recalculam posições ou punições. A interface permite selecionar a fase e alternar para as eliminatórias: dois jogos da final da C e 130 jogos nas sete fases eliminatórias da D. Essas consultas usam arquivos locais e não acessam ESPN ou a CBF em cada abertura.

A artilharia publicada contém 79 atletas e 175 gols na C, e 167 atletas e 320 gols na D. Os placares cadastrados somam respectivamente 488 e 1.389 gols. Por isso o ranking exibe um aviso de cobertura parcial; não representa uma auditoria completa de todos os gols da temporada. Não há ranking de assistências ou cartões individuais sem fonte verificada. O endpoint de artilheiros anuncia sete páginas para 79 atletas e 16 para 167; uma página adicional verificada contém os nove/sete restantes. O coletor confere o total de atletas, permite no máximo uma página além da anunciada e interrompe se houver duplicação, formato alterado ou coleta incompleta. Usa cache temporário de 24 horas, intervalo entre consultas e uma única repetição para HTTP 502/503/504. Nenhuma foto ou URL de foto de atleta é gravada nos snapshots.

Os detalhes de uma partida consultam somente a página oficial correspondente a um ID já cadastrado. O parser lê JSON embarcado na página sem executar scripts e valida competição, ano, data, horário, clubes, placar, súmula, titulares e soma dos gols. Fornece escalações, substituições, gols, cartões de atletas e artilheiros da partida. Cartões de pessoas fora da escalação não entram nos totais de atletas. Tipos de evento desconhecidos, dados divergentes ou existência de adendo mantêm apenas o resultado e exibem aviso de revisão. Não se presume que o adendo já tenha sido aplicado aos dados da página.

Os detalhes usam cache limitado a 128 partidas por instância, validade de seis horas, reutilização de cache antigo por até 30 dias adicionais em caso de falha, deduplicação simultânea por partida, duas consultas em paralelo e no máximo oito consultas novas por minuto por instância. Três falhas consecutivas abrem o circuit breaker por cinco minutos. As requisições têm timeout de sete segundos, limite de 2 MB e rejeitam redirecionamentos. Esses controles são locais à instância; não constituem uma cota global distribuída. Os resultados cadastrados continuam disponíveis durante falhas da fonte.

Essa etapa não grava estatísticas de partidas consultadas nos rankings persistidos de jogadores do Neon. Essa carga exige revisão dos eventos e correções das súmulas, seguindo o fluxo já utilizado nos pilotos. Não há migration nova nem agendamento novo nesta etapa.

## Recuperação pela Wikipédia

As duas páginas de 2026 indicadas pelo usuário agora fornecem snapshots alternativos completos das tabelas de pontos (três grupos/fases da C e 16 grupos da D) e os recortes de artilheiros publicados (oito na C e dez na D). O coletor `collect-wikipedia-lower-statistics.py` confere título/ano, grupos, posições, totais e vínculos dos clubes pela URL da página individual. Lê células com rowspan, remove referências das estatísticas e normaliza sinais negativos. Não deduz IDs CBF de atletas pelo nome: os artilheiros alternativos têm IDs independentes. Os snapshots contêm URL, hash, data, atribuição e licença CC BY-SA 4.0, exibidas na interface.

`collect-cbf-lower-statistics.py` tenta a CBF e, se a coleta falhar ou for inválida, tenta a Wikipédia. A troca usa tabelas e rankings inteiros, preservando a origem; não mistura valores de fontes divergentes. As eliminatórias podem preservar o arquivo anterior da CBF com sua data separada, pois não foram importadas da Wikipédia. Se ambas as fontes falharem, o snapshot anterior validado é preservado com `stale: true`, data original e aviso. Sem snapshot válido, a coleta falha em vez de produzir números vazios ou inventados. Execute para um arquivo temporário e revise antes de substituir o JSON publicado; não redirecione a saída sobre o snapshot anterior durante a coleta.

As rotas de classificação e artilharia continuam servindo arquivos locais, por isso não precisam que a CBF esteja online em cada acesso. Também selecionam o snapshot independente da Wikipédia se a seção primária não passar pela validação de edição e estrutura. A disponibilidade e cobertura dos detalhes por partida continuam sendo as da CBF: a Wikipédia não fornece escalações/substituições para todas as 826 partidas. Uma falha nesses detalhes mantém o resultado e o cache, com aviso; não usa estatísticas de outro jogo como substituição.

Os links do Flashscore foram verificados em 2026-11-05. As páginas e abas públicas de classificação das duas divisões retornaram HTML sem as linhas da tabela (apenas controles “Mostrar mais jogos”). Não há adaptador ativo para o Flashscore nem endpoint interno presumido. Os fragmentos `#/...` dos links são navegação do cliente e não identificam, sozinhos, um feed verificável.

`sync-lower-division-teams.mjs` cadastra os 116 clubes no Neon no build de produção. Pode ser executado manualmente com `--apply`. Os campos já preenchidos no admin são preservados. O preview acrescenta os perfis de referência ao catálogo para permitir a revisão antes da carga de produção.

## Diferença entre fontes

A página da Wikipédia da Série C consultada informa 215 partidas no resumo. A CBF retornou 216 IDs únicos com súmulas e resultados. O cadastro mantém as 216 partidas oficiais. A Wikipédia foi usada para informações dos clubes, enquanto o calendário e os placares usam a CBF.

Fontes:

- https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-c/2026
- https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-d/2026
- https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_C
- https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_D
