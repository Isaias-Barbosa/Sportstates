# NBA e WNBA

## Fontes verificadas em 28/10/2026

| Fonte | Dados e decisão |
|---|---|
| ESPN site-v2 (`site.api.espn.com/apis/site/v2/sports/basketball/{nba,wnba}`) | Integração principal já usada pelo projeto. `/teams?limit=100`, `/teams/{id}`, `/roster`, `/schedule`, `/summary?event={id}`. Retornou 30 NBA e 15 WNBA, elencos, calendário e boxscores das duas ligas sem chave. Feed público não documentado oficialmente; cobertura e disponibilidade variam. |
| [nba_api](https://github.com/swar/nba_api), [boxscore ao vivo](https://github.com/swar/nba_api/blob/master/docs/nba_api/live/endpoints/boxscore.md) | Cliente aberto do ecossistema NBA. A CDN NBA oferece JSON de boxscore ao vivo; IDs não são os da ESPN. Não misturamos partidas por nomes/data nem adicionamos um fallback que poderia associar jogos incorretos. Alternativa futura para NBA mediante mapeamento explícito de IDs. |
| [hoopR](https://github.com/sportsdataverse/hoopR) e [wehoop](https://github.com/sportsdataverse/wehoop/blob/main/R/espn_wnba_data.R) | Repositórios de referência para endpoints ESPN de basquete, incluindo WNBA. Usamos HTTP no Node, sem instalar runtimes R/Python adicionais. |
| [BALLDONTLIE NBA](https://docs.balldontlie.io/) e [WNBA](https://wnba.balldontlie.io/) | API documentada que exige chave. Boxscores e estatísticas têm restrições por plano; não é necessária para esta entrega e não criamos assinatura ou dependência paga. |

O link de busca do Google foi usado como referência funcional, sem extrair resultados ou depender de uma API de esportes do Google. A página apresenta placar por período, resumo, jogadores, estatísticas de equipes, lance a lance, classificação e vídeos existentes.

## Perfis e identidade

`data/basketball-profiles-2026.json` contém 45 perfis e referências individuais. Nomes, imagens, cores e IDs vêm do catálogo ESPN. Arena e cidade vêm da arena mais frequente nos jogos **em casa do calendário atual**: o campo `franchise.venue` traz arenas antigas para alguns times. Não importamos fotos antigas de arena. Diretórios de conferência: [NBA](https://www.nba.com/teams), [WNBA](https://www.wnba.com/teams). Sites oficiais estão nos perfis. Descrições curtas são textos factuais em português, não biografias copiadas. Títulos não são inferidos.

ESPN reutiliza IDs entre modalidades e entre NBA/WNBA. A chave do perfil é `basketball-nba-{id}` ou `basketball-wnba-{id}`. URLs numéricas existentes de futebol permanecem intactas. `server/team-identity.mjs` separa chave interna e ID do provedor. Elenco, jogos, notícias e classificação consultam o ID original. Links de escudos e classificação resolvem por esporte e liga.

`sync-basketball-profiles.mjs` roda em builds de produção ou via `npm run db:basketball`. A revisão é aplicada uma vez em transação. `ON CONFLICT DO NOTHING` preserva edições existentes; nenhum time de futebol é alterado.

## Partidas

`normalizeBasketball` lê quartos por ID da equipe e inclui todas as prorrogações informadas. Períodos ausentes ficam `—`; zero é preservado. Estatísticas individuais são associadas às chaves/colunas fornecidas pelo boxscore, sem assumir uma ordem fixa. Titulares, reservas e DNP ficam identificados. Líderes são calculados exclusivamente sobre os números deste jogo; empates aparecem e DNP não participa do cálculo. Falhas/ausência da fonte têm estados vazios explícitos. A consulta continua usando o cache e atualização de 30 segundos existentes.

Métricas e rótulos principais são apresentados em pt-BR. Textos de lances preservam a tradução que o provedor disponibiliza; não prometemos tradução automática de todo o relato. A consulta de notícias também respeita a cobertura da fonte.

## Validação

Testes de identidade, catálogo completo, placar por período/prorrogação, zeros, DNP, líderes empatados, colunas em outra ordem, partidas sem dados e consultas com ID correto. Testes completos e build TypeScript/Vite. Conferência de payloads reais de NBA e WNBA e de links entre times/classificação/partida.
