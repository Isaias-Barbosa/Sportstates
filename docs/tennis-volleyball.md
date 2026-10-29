# Tênis e vôlei masculinos

## Cobertura inicial

- Tênis: ATP, apenas simples masculino. Jogos, placar por sets/games e tie-breaks, fase informada no confronto, ranking ATP e catálogo dos até 150 atletas presentes no ranking ESPN. Duplas, WTA e categorias femininas não são incluídas.
- Vôlei: Superliga Masculina brasileira. Programação da temporada publicada pela CBV, placar em sets e parciais em pontos, classificação oficial, 12 perfis de clubes no Neon e jogadores relacionados pela fonte. Não se presume que o elenco esteja em quadra nem se fabricam estatísticas ou notas.

As novas modalidades aparecem nos filtros e no menu. Tênis usa **Atletas** e **Ranking**, pois é uma modalidade individual. Jogos abrem páginas próprias com **Placar por sets**. Abas sem cobertura da fonte não aparecem para esses esportes.

## Fontes verificadas

ESPN: `https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=20261029&lang=pt&region=br` e `/rankings`. Referência comunitária: [Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API). Eventos de tênis são torneios com `groupings[].competitions[]`: cada confronto de `mens-singles` é normalizado individualmente. Usa-se a data do confronto, não o início do torneio. IDs locais combinam a data UTC e o ID da competição para permitir consultar detalhes diretamente, inclusive por links antigos. As consultas mensais foram verificadas com 420 confrontos em outubro de 2026. O ranking preserva posições, pontuação e data de atualização da fonte, sem recalcular pontos ATP pelo resultado isolado de uma partida.

CBV: [Superliga Masculina](https://cbv.com.br/volei-de-quadra/superliga-a-masculina) e sua [classificação](https://cbv.com.br/volei-de-quadra/superliga-a-masculina/classificacao). A página pública fornece dados Flight JSON com jogos, parciais, elencos e canais específicos. O parser lê JSON sem executar scripts, tem limites de tamanho/profundidade e exige indicação de gênero masculino na programação. Referências a equipes no documento são completadas a partir dos objetos do mesmo documento; não se inferem jogadores titulares. Campos de contato e outros dados desnecessários são descartados antes do cache. Apenas canais explicitamente informados pela CBV confirmam uma transmissão brasileira; não se atribui sportv 2 a todos os confrontos.

A documentação GitHub da ESPN foi conferida contra os endpoints: o identificador `fivb.m` citado em um README não foi adotado; a documentação detalhada de vôlei cobre NCAA e não a Superliga. O repositório `CBV-API` é um sistema antigo de gestão e não foi tratado como feed atual de placares. Não há dependência de chaves pagas, autenticação de terceiros ou proxy para contornar bloqueios.

## Cache e cadastro

Placares: 30 segundos quando há jogos ao vivo, um minuto nos demais casos; classificação CBV cinco minutos; ranking ATP uma hora, com data da avaliação visível. Todas as novas instâncias reutilizam o cache compartilhado e a limpeza administrativa existente.

Os 12 clubes usam IDs `volleyball-superliga-men-{idCBV}`, isolados dos IDs ESPN. Elencos e calendário usam CBV. A importação de produção `sync-volleyball-profiles.mjs` roda uma única vez, em transação, com `ON CONFLICT DO NOTHING`, preservando edições anteriores. Nomes, escudos, cores e ginásios vêm dos dados CBV; o site de cada perfil aponta para sua página de clube na CBV. Títulos e fotos de ginásios não foram inventados.

Limitações: os formatos públicos de ESPN e CBV podem mudar; dados e parciais podem atrasar. O vôlei está limitado à temporada disponibilizada pela página CBV; não existe promessa de histórico anterior, todas as ligas internacionais ou lance a lance. No tênis, a disponibilidade histórica segue os torneios retornados pela ESPN. Vídeos e notas individuais não foram simulados para modalidades sem essa cobertura.
