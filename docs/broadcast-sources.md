# Transmissões por partida

A home e a página do jogo usam a mesma composição de fontes: canais com país BR no feed ESPN, agenda pública do ge e agenda da CazéTV. A programação do ge é armazenada por cinco minutos no cache compartilhado, com invalidação pelo botão administrativo existente. Falhas de rede ou alterações de formato preservam as demais fontes.

A agenda do ge contém `window.dataSportsSchedule.sport`, com competição, participantes, horário de Brasília e `liveWatchSources`. O parser lê apenas JSON, sem executar scripts. Exige competição mapeada, os dois times na ordem correta e horário com tolerância de 30 minutos. Eventos ambíguos, categorias não mapeadas (incluindo base/feminino) e partidas encerradas não recebem confirmação. Cartola é publicidade, não transmissão, e é descartado. Links são resolvidos pelo cadastro permitido de plataformas; URLs arbitrárias do HTML não são usadas. Canais desconhecidos são omitidos.

Quando há anúncio específico, os cards mostram os canais da partida e o dropdown Onde assistir fornece links e fonte. Sem anúncio seguro, permanece o guia da competição, sem afirmar ausência de transmissão no Brasil. Links podem exigir assinatura e ter restrição territorial. A integração usa a agenda pública, sem API contratada ou garantia de estabilidade do formato.

## Pesquisa de fontes (29/10/2026)

| Fonte | Resultado |
| --- | --- |
| [Google: propriedades de catálogo](https://support.google.com/webmasters/answer/10064630?hl=en) | Documenta feeds de parceiros para o Knowledge Graph; não é uma API pública de consulta de transmissões esportivas. Não foi possível identificar o fornecedor exato do painel do Google. |
| [ge: agenda](https://ge.globo.com/agenda/) | Dados públicos por partida com canais brasileiros; fonte integrada. |
| [globoesporte-agenda-futebol-scraping](https://github.com/andersou/globoesporte-agenda-futebol-scraping) | Referência histórica de extração da agenda. Parser próprio para o formato atual, sem copiar o scraper antigo. |
| [sofascore-wrapper](https://github.com/tommhe14/sofascore-wrapper) / [sofascrape](https://github.com/dchumari/sofascrape) | Expõem consulta de canais por evento/país. Endpoint direto respondeu 403 challenge; não integrado nem contornado. [SofaScore informa colaboração da comunidade](https://sofascore.helpscoutdocs.com/article/175-tv-schedule-information?lng=en). |
| [agente-futebol](https://github.com/consultoriacrisante-sudo/agente-futebol) | Pesquisa contextual com API-Football e Tavily; exige chaves e validação das evidências, não é um feed gratuito de direitos. |
| [Watchmode](https://api.watchmode.com/) | A cobertura esportiva anunciada é EUA, Reino Unido, Canadá e Austrália; não resolve Brasil. |

Não se atribuem direitos de transmissão a todos os jogos de uma liga. Disney+ não implica ESPN 1/2; o canal numerado só aparece quando a fonte o informa. Vídeos permanecem em destinos oficiais, sem proxy para contornar bloqueios.
