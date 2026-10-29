# Transmissões: tênis, WTT e copas locais

Revisão em 29/10/2026. Apenas links de destinos oficiais; nenhuma URL de reprodução privada, IPTV ou tentativa de contornar restrições regionais.

- Tênis masculino: ESPN/Disney+ Premium conforme ESPN Brasil; programação oficial ATP. O canal ESPN 1–6 não é deduzido pelo esporte. Tennis TV só aparece quando o nome do torneio identifica ATP 250/500/1000, Masters 1000 ou ATP Finals; não aparece para Slams, Challenger, Davis ou Laver Cup.
- WTT: corrige `watch: null` no normalizador e publica os guias na home e na página da partida. CazéTV para Grand Smash, Champions, Star Contender, Contender, Mundial e Copa do Mundo conforme acordo ITTF 2025–2028. Feeder e Finals usam guia WTT e canal WTT Global, com aviso de disponibilidade territorial; não se estende automaticamente o acordo a categorias ausentes do anúncio.
- Copas locais: Copa do Rei espanhola, FA Cup e Carabao Cup recebem ESPN/Disney+ como guia da competição, com referências oficiais ESPN. Agenda ge reconhece também Copa do Rei e Copa da Itália para confirmação por confronto.
- GOAT: guia da Liga Saudita confirmado no diretório SPL. Parser da página oficial `/transmissoes/` lê somente cards de competições masculinas seniores reconhecidas (Saudita, Série B e Bundesliga). Vincula por competição, dois times e horário até 30 minutos, rejeitando ambiguidades. Links vão para a página oficial da transmissão. A versão atual da agenda estava sem próximos jogos; a página histórica forneceu 11 cards elegíveis, sem que isso confirme jogos de hoje. Não transforma direitos da Liga Saudita em direitos da copa saudita.

Direitos de competição e anúncio por partida continuam separados. A imagem enviada é uma pista, não uma confirmação atual. Futebol feminino, base e futsal não foram adicionados. Lista vazia/falha da agenda mantém outras fontes e nunca declara indisponibilidade de transmissão no Brasil. Agenda GOAT tem cache de cinco minutos, timeout de quatro segundos, coleta em paralelo com ge/Cazé e não consulta uma página por partida.

## Pesquisa de APIs e GitHub

- https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/sports/tennis.md documenta o endpoint `/events/{event}/competitions/{competition}/broadcasts`. Mantemos o consumo dos dados de transmissão já presentes no scoreboard e exigimos país BR; `region=br` sozinho não comprova direitos locais. Não foi adicionado um fan-out de requisições por jogador/partida.
- https://github.com/RohanG27/thesportsdbLibrary/blob/main/docs/THESPORTSDB-API-BEHAVIOUR.md documenta TV por evento e diferenças de respostas vazias/limites.
- https://www.thesportsdb.com/docs_api_guide oferece `lookuptv.php` e `eventstv.php`, mas o nível gratuito limita resultados. Não se adotou como fonte completa de confirmação nem se criaram chaves pagas.
- Sportradar oferece canais/países em sua Tennis API, mas é serviço comercial: https://developer.sportradar.com/sportradar-updates/changelog/tennis-api-country-info-for-broadcast-channels

## Fontes primárias

https://brazil.espnpressroom.com/press-releases/2026/03/casa-do-tenis-no-brasil-espn-e-disney-ampliam-cobertura-da-modalidade-com-novos-torneios-challenger/
https://www.atptour.com/en/tournaments/tv-schedule
https://www.tennistv.com/live-atp-streaming
https://www.ittf.com/2025/09/17/ittf-and-wtt-sign-four-year-broadcast-deal-with-cazetv-in-brazil/
https://www.worldtabletennis.com/livevideo
https://brazil.espnpressroom.com/press-releases/2026/02/espn-e-disney-transmitem-semifinal-da-copa-do-rei-entre-barcelona-e-atletico-de-madrid/
https://brazil.espnpressroom.com/press-releases/2026/01/final-da-supercopa-da-espanha-e-wild-card-da-nfl-marcam-a-semana-da-espn-e-do-disney/
https://www.spl.com.sa/en/news/where-to-watch
https://canalgoat.com.br/transmissoes/

Validação: testes de guias, restrições Tennis TV, WTT normalizado, país dos canais, segurança de links e associação estrita da agenda GOAT. Build e suíte completos antes de publicar.
