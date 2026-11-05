# Complemento de jogadores pela CBF

O piloto coleta a página oficial de um jogo da Copa do Brasil de 2026 e produz JSON para revisão. Não escreve nas tabelas de jogadores. Execute `python scripts/collect-cbf-player-stats.py <id-cbf>`.

As duas partidas verificadas foram Porto-BA x Serra Branca (832713) e Maguary x Laguna (832714), em 18/02/2026. A página fornece nomes completos, IDs CBF, titulares, substituições, gols e cartões. Assistências ficam nulas. O coletor exige súmula publicada, valida o campeonato, o ano, os titulares, as referências de substituição e o total de gols contra o placar. Rejeita formatos de eventos ainda não verificados, incluindo gol contra.

## Resultado do piloto

- Porto-BA x Serra Branca tem 32 participantes, três gols, seis amarelos e duas expulsões no JSON da página.
- Maguary x Laguna tem 31 participantes, um gol, seis amarelos e nenhuma expulsão no JSON da página.
- A súmula do primeiro jogo descreve duas expulsões diretas, enquanto a página as classifica como segundo amarelo. O JSON preserva o valor bruto de cada cartão para revisão e conta apenas o total de vermelhos.

Cada coleta contém a URL da página, a URL da súmula e o SHA-256 do HTML. O campo `requiresReview` fica verdadeiro. Os identificadores pertencem ao namespace CBF. Antes da integração, revisar a identidade dos jogadores e clubes com os registros ESPN, comparar as substituições com a súmula e guardar o vínculo. Um nome abreviado ou semelhante não autoriza a união de jogadores.

Fontes verificadas:

- https://www.cbf.com.br/futebol-brasileiro/jogos/copa-do-brasil/profissional/2026/porto-sport-club-x-serra-branca-esporte-clube/832713
- https://conteudo.cbf.com.br/sumulas/2026/42412se.pdf
- https://www.cbf.com.br/futebol-brasileiro/jogos/copa-do-brasil/profissional/2026/maguary-x-laguna/832714
- https://conteudo.cbf.com.br/sumulas/2026/42413se.pdf
