# Competições no perfil do time

A aba **Competições** carrega `/api/team-competitions?id={id}` somente quando
aberta. O perfil, elenco e notícias mantêm suas consultas independentes.
Não há alteração no Neon nem necessidade de cadastro manual das participações.

## Fontes e descoberta

- ESPN Site v2: `sports/soccer/all/teams/{id}/schedule` traz as competições
  efetivamente disputadas pelo clube. A consulta com `fixture=true` traz próximos
  confrontos. Os dois conjuntos são combinados por ID, filtrando o participante
  e a temporada retornada pela fonte. Amistosos e All-Star ficam fora.
- Cada competição identificada consulta seu `scoreboard` para temporada e logo.
  Apenas ligas consultam `apis/v2/sports/{sport}/{league}/standings` para posição,
  grupo/conferência, pontos e jogos. Não há varredura de todas as ligas.
- Competições fora do catálogo também aparecem quando há partidas do clube na
  fonte (ex.: Recopa e Supercopa). Não são atribuídas por país ou prestígio.
- Cache de um minuto por time e por URL, deduplicação e concorrência limitada.
  Falhas isoladas preservam os outros cards e geram indicação de dados parciais.

## Posição e fase

Posições são as fornecidas na tabela, dentro do grupo/conferência correspondente;
não são recalculadas por ordenação ou por resultados parciais. Uma tabela de
outra temporada não é usada. Se não houver posição, o card informa isso.

Fases usam `seasonType.name`, `season.slug` ou o identificador da fase no calendário
da competição. Nunca usam o status `STATUS_FINAL` da partida ou a fase global
de outro clube para afirmar que o time está na final. Rótulos conhecidos são
traduzidos para português; fases ausentes ficam explicitamente indisponíveis.

Próximos confrontos confirmados e partidas em andamento determinam a fase atual.
Sem um próximo jogo confirmado, a participação fica em uma seção separada com
a **última fase disputada** e a data. Uma ausência no calendário não significa
eliminação. Vencer uma decisão de Taça Rio/Guanabara não torna automaticamente
o clube campeão de todo o estadual.

Eliminação/classificação só é inferida de evidência decisiva de mata-mata:
pênaltis, agregado oficial de uma volta ou soma das duas partidas da mesma fase
e adversário. Um placar empatado no agregado, a vitória na ida ou uma derrota
na fase de grupos não bastam. Nas decisões simples abaixo, o placar final é
decisivo. Sem evidência suficiente, o status permanece a confirmar.

As decisões anuais com formato conferido são:

- Supercopa do Brasil: jogo único, conforme [regulamento CBF 2026](https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_SUPERCOPA_DO_BRASIL_2026_8634b6b9ec.pdf).
- Recopa Sul-Americana: ida e volta, conforme [manual CONMEBOL](https://cdn.conmebol.com/wp-content/uploads/2025/12/CS-2026-Manual-de-Clubes-POR-Fev26.pdf)
  e [confirmação das finais 2026 pela AFA](https://www.afa.com.ar/home/posts/fechas-y-horarios-de-las-finales-recopa-2026-entre-flamengo-y-lanus).
- Campeones Cup: decisão única, conforme [competição MLS](https://www.mlssoccer.com/competitions/campeones-cup/).

Não há inferência de participação a partir dos títulos históricos do clube.
Copas ainda sem calendário ou sem o time identificado podem não aparecer até
a publicação dos confrontos. Os testes cobrem temporadas, conferências, futuros
confrontos, agregado, pênaltis, decisões estaduais, indisponibilidade e IDs inválidos.
