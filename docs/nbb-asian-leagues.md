# NBB, Japão e Coreia — verificação em 05/11/2026

## NBB

A URL `/partida/basketball/nbb/4849265` falhava porque a rota de detalhes
encaminhava um identificador 365Scores para a ESPN (HTTP 404; API pública do
Sportstates retornava 502). O feed que originou o calendário respondeu HTTP 200
para este jogo, `sportId=2`, `competitionId=5787`: Bauru Basket x Minas.

Detalhes e mídia agora compartilham uma consulta ao feed de basquete. A identidade
do jogo, esporte e competição é validada. Cache de 30 segundos, deduplicação de
requisições simultâneas, dados anteriores por até cinco minutos e pausa de cinco
minutos após falha usam o orquestrador existente. Não há tentativa na ESPN.
Estatísticas detalhadas, lances e vídeos não são importados por esta alteração;
a resposta informa essa limitação. Pontuação por quarto ausente permanece vazia.

Fontes verificadas:

- [Página oficial do jogo na LNB](https://lnb.com.br/partidas/nbb-2026-2027-bauru-basket-x-minas-storm-05112026-1930/).
- [Agenda oficial LNB da semana](https://lnb.com.br/noticias/onde-assistir-ao-nbb-caixa-2026-27-agenda-de-transmissoes-da-semana-3/): confirma YouTube NBB CAIXA e Xsports para Bauru x Minas.
- [Programação Xsports](https://www.xsports.com.br/): contém o confronto, além de jogos selecionados do NBB, Bundesliga e Série B. A navegação geral do site não comprova direitos ou transmissão de cada jogo.
- Canal YouTube NBB: `https://www.youtube.com/user/NBBoficial`, vinculado pela LNB.

Os nomes `Xsports`, `Youtube Xsports` e `Youtube NBB` são reconhecidos quando
informados para o Brasil no feed da partida, com deduplicação. O guia de liga
sozinho não confirma todos os confrontos. O vídeo enviado pelo usuário não pôde
ser consultado pelo leitor web e não foi cadastrado como transmissão confirmada.
Sofascore e Flashscore não foram integrados: não foi verificado um endpoint
estável e apropriado para esta alteração. Não há extração ou bypass desses sites.

## Futebol asiático

- `jpn.1`: scoreboard ESPN verificado (HTTP 200, Japanese J.League). Rotas locais,
  com fontes reais: classificação com 20 equipes; calendário de novembro com
  41 jogos, `partial=false`.
- `kor.1`: scoreboard ESPN recusado (HTTP 400); não repetir tentativas automáticas
  nessa rota. Adaptador 365Scores usa competição 618, futebol, classificação e
  calendário diário com datas explícitas `DD/MM/AAAA`. A classificação real
  retornou dois grupos de seis equipes; o calendário local de novembro retornou
  14 jogos, `partial=true`.

O feed coreano pode retornar resultados globais e truncados apesar do filtro.
Filtramos a competição, removemos duplicatas e marcamos o calendário como parcial.
Consulta diária faz uma chamada e tem cache de 30 segundos. Calendário mensal faz
no máximo cinco consultas sequenciais de sete dias, dentro do cache existente;
não percorre paginação ilimitada. Não há fallback ESPN para calendário coreano.
Catálogo e filtros por país incluem ambas as competições. Isso não importa
automaticamente perfis de clubes no Neon, nem habilita rankings de jogadores
sem uma fonte de estatísticas verificada.

Nenhuma migração, carga de banco ou alteração de produção foi executada.
