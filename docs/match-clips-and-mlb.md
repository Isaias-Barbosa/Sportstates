# Lances da Partida, participação e MLB

## Vídeos por lance

A aba Vídeos foi renomeada para **Lances da Partida**. Os cards de gols recebem até duas alternativas de replay quando há associação segura ao evento. O processamento usa os IDs canônicos dos lances ESPN, inclusive quando o minuto a minuto vem do commentary.

Fontes consultadas: vídeos associados ao resumo ESPN, feeds recentes dos canais oficiais YouTube já cadastrados (ge tv, CazéTV, ESPN Brasil, TNT, GOAT, ligas e clubes) e metadados `playsVideos` da página pública do jogo no ge. A página do ge é encontrada pela agenda com competição, mandante, visitante e horário; não se inventam URLs de confrontos. Os scripts são lidos como JSON sem execução.

Os vídeos do ge abrem **na página oficial do jogo**, com miniatura e título do lance. Não foi identificado um embed público documentado para esses clipes; não se simula um player nem se usa proxy de mídia. YouTube e ESPN preservam seus players e links externos. Podem existir restrições territoriais e de incorporação.

Uma associação de gol no ge exige jogador, período e minuto compatíveis, com tolerância de um minuto: ge usa minutos transcorridos enquanto ESPN pode mostrar o minuto iniciado. Converte-se o relógio do segundo tempo para o minuto absoluto. Gols do mesmo jogador sem identificação suficiente permanecem na galeria. Melhores momentos nunca são usados como replay individual. A agenda limita a descoberta do ge a partidas recentes; arquivos mais antigos continuam dependendo de vídeos ESPN associados e dos feeds recentes do YouTube.

Na NBA, a busca reconhece cestas, enterradas, bolas de três e arremessos publicados por canais oficiais. Aceita ambos os times no título ou nome completo do jogador do jogo + adversário, neste último caso dentro de 18 horas do início. O jogador é identificado pelo box score da partida. Quando não há identificação única de uma cesta, o vídeo aparece na seção de lances sem ser atribuído a um evento específico. Não existe garantia de clipe para cada gol ou cesta.

Cache compartilhado: agenda ge/FotMob 5 min; feed YouTube 10 min; clipes ge ao vivo 2 min e encerrados 15 min. Falhas preservam os dados das outras fontes.

## Escalações e notas

Seta verde indica entrada e vermelha saída, incluindo jogadores que entraram e depois saíram. Minuto e contraparte vêm dos campos `subbedInFor`/`subbedOutFor` e plays do resumo ESPN. O desenho mantém a formação inicial e sinaliza titulares substituídos.

Notas reais de 0–10 são expostas com origem. Quando ESPN não fornece, consulta-se o endpoint público FotMob `/api/data/matches` e `/api/data/matchDetails`. A integração confirma competição/país, times, horário e identidade do detalhe, depois associa nome + número de camisa dentro da mesma equipe. IDs ESPN e FotMob não são intercambiáveis. Somente `performance.rating` é aproveitado; `seasonRating` e médias calculadas não substituem a nota da partida. Nota ausente é `—`, com explicação acessível. Nem todas as competições ou jogadores têm avaliações.

O endpoint antigo `/api/matches` respondeu 404; a documentação comunitária [Public-FotMob-API](https://github.com/pseudo-r/Public-FotMob-API) apontou os endpoints atuais, verificados com respostas públicas JSON sem chaves. Cache das avaliações: 2 min ao vivo e 6 h após o jogo. A página oferece o link da fonte FotMob. Erro/timeout não impede a escalação ESPN.

## Times da MLB

30 perfis em `data/mlb-profiles-2026.json`: nome, logo, cidade, estádio, site oficial, cores e descrição breve original em português. Dados cruzados entre [diretório oficial MLB](https://www.mlb.com/team), StatsAPI MLB e ESPN. Nenhuma foto de estádio ou lista de títulos foi inventada.

IDs de página `baseball-mlb-{espnId}` impedem colisões com futebol, NBA/WNBA e NFL. O ID MLB original é registrado separadamente como referência. Elencos, notícias, calendário e resultados reutilizam a integração ESPN por esporte. Foram atualizados os links de escudos/tabelas e busca administrativa.

A importação `scripts/sync-mlb-profiles.mjs` roda uma vez no build de produção, em transação com revisão `mlb-profiles-2026-v1`. `ON CONFLICT DO NOTHING` preserva cadastros existentes; conflito de esporte/liga aborta. A chave da lista de times foi versionada para disponibilizar os novos cadastros. Execução manual: `npm run db:mlb` no ambiente autorizado com Neon configurado.
