# Notícias

Rota pública: `/noticias`. Endpoint somente leitura: `/api/news`.

## Fontes verificadas em 28/10/2026

| Fonte | Integração | Resultado da consulta |
| --- | --- | --- |
| ESPN | `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/news?lang=pt&region=br&limit=30` | API pública sem chave, não documentada oficialmente; futebol brasileiro e inglês, NBA, NFL, MLB e NHL. |
| ge | `https://ge.globo.com/rss/ge/` | RSS com títulos, datas, resumos e imagens quando fornecidas. |
| UOL Esporte | `https://rss.uol.com.br/feed/esporte.xml` | RSS; trata caracteres Latin-1 e nomes de meses em português. |
| CazéTV | `https://www.youtube.com/feeds/videos.xml?channel_id=UCZiYbVptd3PVPf4f6eR6UaQ` | Feed Atom do canal oficial. Publicações identificadas como vídeos. |
| TNT Sports Brasil | `https://www.youtube.com/feeds/videos.xml?channel_id=UCs-6sCz2LJm1PrWQN4ErsPw` | Feed Atom do canal oficial. Publicações identificadas como vídeos. |

Não foi confirmada uma API pública de notícias da CazéTV ou da TNT Sports. A consulta ao site/RSS web da TNT retornou HTTP 403 neste ambiente; a integração usa o feed público do canal, sem tentar contornar essa restrição.

## Pesquisa de referência

- [Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API): referência comunitária para os endpoints de notícias. Não é uma API mantida pelo repositório, nem uma garantia de suporte da ESPN.
- [brnews](https://github.com/tianjos/brnews): proposta de consulta a feeds brasileiros; o README acessível não documentou um serviço hospedado para este projeto consumir. Foi preferível consultar os feeds originais.
- [news-feed-list-of-countries](https://github.com/yavuz/news-feed-list-of-countries): referência para descoberta de feeds; não é dependência de execução.
- [Central de RSS do ge](https://ge.globo.com/ESP/0,,4870,00.html) e [RSS do UOL](https://rss.uol.com.br/): páginas dos próprios veículos.

## Comportamento

- Consulta no servidor, com URLs fixas; não aceita uma URL arbitrária do navegador.
- Cada feed é consultado em paralelo, com timeout de 10 segundos, cache de 5 minutos e fallback da última resposta por até 1 hora após expirar o cache.
- Falhas são isoladas por fonte. A interface mostra disponibilidade e datas da consulta; sem fontes disponíveis, mostra um estado vazio explícito.
- Títulos e resumos curtos em texto simples (até 200 caracteres), imagem fornecida pelo feed quando disponível e link para o editor/canal. Não busca ou reproduz o corpo completo das matérias.
- Deduplicação por URL e ordenação pela data de publicação. Não inventa datas para itens sem data válida. Remove parâmetros comuns de rastreamento.
- Filtra os artigos para os domínios dos veículos configurados. Vídeos são aceitos apenas se o feed identificar o canal configurado.
- Categoria obtida da API da ESPN ou inferida do assunto/URL para RSS; assuntos não reconhecidos aparecem em Outros esportes.
- Busca e filtros locais por fonte, esporte e tipo; carregamento em lotes de 12. No estado inicial, três publicações mais recentes recebem destaque.
- Conteúdo dos feeds não é tratado como HTML executável; DTD e entidades XML declaradas são rejeitados.

As interfaces e a cobertura podem mudar sem aviso. Uma nova fonte deve ser adicionada em `server/news.mjs`, com normalização, verificação de domínio e testes.
