# Complemento de jogadores pela CBF

O piloto coleta a página oficial de um jogo da Copa do Brasil de 2026 e produz JSON para revisão. Não escreve nas tabelas de jogadores. Execute `python scripts/collect-cbf-player-stats.py <id-cbf>`.

As duas partidas verificadas foram Porto-BA x Serra Branca (832713) e Maguary x Laguna (832714), em 18/02/2026. A página fornece nomes completos, IDs CBF, titulares, substituições, gols e cartões. Assistências ficam nulas. O coletor exige súmula publicada, valida o campeonato, o ano, os titulares, as referências de substituição e o total de gols contra o placar. Rejeita formatos de eventos ainda não verificados, incluindo gol contra.

## Resultado do piloto

- Porto-BA x Serra Branca tem 32 participantes, três gols, seis amarelos e duas expulsões no JSON da página.
- Maguary x Laguna tem 31 participantes, um gol, seis amarelos e nenhuma expulsão no JSON da página.
- A súmula do primeiro jogo descreve duas expulsões diretas, enquanto a página as classifica como segundo amarelo. O JSON preserva o valor bruto de cada cartão para revisão e conta apenas o total de vermelhos.

Cada coleta contém a URL da página, a URL da súmula e o SHA-256 do HTML. O campo `requiresReview` fica verdadeiro. Os identificadores pertencem ao namespace CBF. Antes da integração, revisar a identidade dos jogadores e clubes com os registros ESPN, comparar as substituições com a súmula e guardar o vínculo. Um nome abreviado ou semelhante não autoriza a união de jogadores.

## Revisão de identidades

Depois da coleta, rode `node scripts/review-cbf-player-identities.mjs <coleta.json> <id-evento-espn>`. O comando valida competição, horário, lados e placar e consulta os dois elencos da ESPN na temporada. Propõe candidatos apenas quando encontra um nome completo normalizado único no clube correspondente. Homônimos e nomes abreviados ficam pendentes. O resultado não grava no banco.

A verificação dos jogos do piloto encontrou:

| Jogo CBF | Evento ESPN | Atletas com participação ou cartão | Candidatos | Pendentes |
| --- | --- | --- | --- | --- |
| 832713 | 401858701 | 34 | 6 | 28 |
| 832714 | 401858703 | 31 | 5 | 26 |

O número inclui reservas advertidos mesmo sem entrar em campo. Os elencos atuais da ESPN não cobrem todos os atletas relacionados em fevereiro. No Laguna, o endpoint devolveu apenas um atleta.

## Cadastro CBF independente

`collect-cbf-player-register.py <id-clube-cbf>` coleta os nomes completos, apelidos e IDs na página oficial de inscrições do clube. O arquivo `data/cbf-player-register-2026.json` contém 62 identidades públicas dos quatro clubes do piloto. Registros com o mesmo ID e nome são deduplicados; nomes conflitantes para o mesmo ID interrompem a coleta.

O perfil aceita `/jogadores/cbf-<id>`, por exemplo `/jogadores/cbf-633319`. A seção Inscrições na CBF informa competição, clube de inscrição e fonte. Esse clube pode diferir do clube atual mostrado pela CBF, então o cadastro não publica associação atual do jogador. Os perfis numéricos ESPN continuam separados até confirmação do vínculo.

Dos 65 jogadores com participação ou cartão no piloto, 36 aparecem nesse cadastro atual. Os demais foram incluídos no registro revisado da partida com identidade CBF. O arquivo `data/cbf-reviewed-player-matches-2026.json` contém as duas partidas revisadas, com hashes dos documentos e os vínculos ESPN confirmados. Execute `node scripts/import-reviewed-cbf-players.mjs --apply` para gravá-las. A transação só insere partidas ainda ausentes e preserva os registros já existentes. Assistências ficam nulas. A carga das duas partidas foi aplicada em produção e repetida para confirmar a deduplicação.

O adendo oficial de Porto-BA x Serra Branca corrige o autor de um gol de Wesllen José Sousa Martins para Breno Eduardo Liborge. A revisão deve considerar esse adendo junto da súmula, pois ele explica a divergência de nome entre os documentos. O adendo foi publicado em 20/02/2026 e está em https://conteudo.cbf.com.br/sumulas/2026/42412ad.pdf.

Fontes verificadas:

- https://www.cbf.com.br/futebol-brasileiro/jogos/copa-do-brasil/profissional/2026/porto-sport-club-x-serra-branca-esporte-clube/832713
- https://conteudo.cbf.com.br/sumulas/2026/42412se.pdf
- https://www.cbf.com.br/futebol-brasileiro/jogos/copa-do-brasil/profissional/2026/maguary-x-laguna/832714
- https://conteudo.cbf.com.br/sumulas/2026/42413se.pdf
