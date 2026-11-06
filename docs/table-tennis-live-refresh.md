# Atualização dos placares WTT — 06/11/2026

## Caso observado

`/partida/table-tennis/champions/032522566190507`: Wim Verdonschot x Hugo
Calderano, WTT Champions Frankfurt, evento 3252. A produção devolvia agendado,
13:55 UTC e placares vazios. O endpoint móvel `MatchCards` devolvia STARTLIST,
sequência 1 e `_used_live_cache=true`; `GetOfficialResult` ainda não trazia o jogo.

O vídeo enviado (`72fhtOqBoLY`) foi identificado pelo oEmbed público do YouTube
como transmissão da CazéTV para Bruna Takahashi e Hugo Calderano nas oitavas.
O título de uma transmissão não foi usado como prova de status ou placar.

O JavaScript público do site oficial WTT indicava publicação de cartões JSON em
`matchdata/{eventId}/{documentCode}.json`. Foi verificada a distribuição:

`https://wtt-web-frontdoor-cthahjeqhbh6aqe3.a01.azurefd.net/`

O cartão deste jogo respondeu HTTP 200 com OFFICIAL, sequência 234, início em
14:55 UTC e resultado 3–1: 11–5, 11–9, 7–11 e 13–11. Os IDs dos dois atletas
coincidiram com a agenda original. A integração corrigida recuperou esses dados.
Isso representa o estado observado ao final da investigação, não a afirmação de
que o jogo já estava encerrado no momento do relato do usuário.

O domínio alternativo “withoutcache” retornou HTML, e uma rota alternativa da API
retornou 422; não foram integrados. Nenhuma chave ou endpoint interno foi usado.

## Alteração

- A agenda e os resultados oficiais móveis continuam como base. Cartões recentes
  ainda não finalizados podem ser complementados pela publicação JSON oficial.
- Limite de oito cartões por evento e atualização, dois pedidos simultâneos,
  timeout de seis segundos, cache por cartão de 15 segundos e pausa de cinco
  minutos após falha. Não consultar jogos distantes no futuro ou já finalizados.
- Evento, código canônico da partida, status e IDs dos atletas precisam coincidir.
  Não pesquisar partidas por nomes nem misturar confrontos.
- Não regredir um cartão ao vivo para STARTLIST. Falha mantém a resposta original;
  horário vencido, por si só, nunca transforma um jogo em ao vivo.
- A agenda explicitamente ao vivo prevalece sobre um cartão STARTLIST antigo,
  mas os zeros desse cartão não são apresentados como placar confirmado.
- Cartões ao vivo recuperados de cache após falha ficam marcados como atualização
  pendente. A indicação de dados antigos se propaga para agenda e detalhe.
- A versão do cache do evento foi atualizada para não reutilizar a normalização
  antiga após publicação. A regra se aplica às competições masculinas já
  suportadas pelo adaptador, sem cadastrar manualmente só este confronto.

## Outras fontes

Foram consultadas páginas de Flashscore e resultados de busca do Sofascore para
identificar alternativas. A página Flashscore consultada ainda apresentava o
confronto como agendado; não foi validado um feed estável adicional para esta
alteração. A publicação oficial WTT resolveu o caso sem nova dependência.

Fontes públicas: [evento WTT](https://www.worldtabletennis.com/eventInfo?eventId=3252),
[transmissão CazéTV](https://www.youtube.com/watch?v=72fhtOqBoLY),
[agenda Flashscore consultada](https://www.flashscore.com/player/calderano-hugo/GSJm6R3k/fixtures/).

Nenhuma migração, gravação no banco ou publicação em produção foi executada.
