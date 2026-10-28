# Perfis da Premier League 2026/27

Revisão: 28/10/2026. Snapshot conferido: `data/premier-league-2026-27.json`.

## Dados e fontes

- Os 20 clubes, cidades e sites foram conferidos no [Premier League Handbook 2026/27](https://resources.premierleague.pulselive.com/premierleague/document/2026/10/22/24902579-d9e8-44b3-a9e4-777c7b3d7134/TM2040_PL-Handbook-and-Collateral-2026-27_Digital_21.10.pdf), páginas 6 a 25 do arquivo. Os números impressos no manual diferem da posição no PDF; os links do snapshot usam a posição no arquivo.
- O diretório não tem uma ordem fixa de estádio/rua/cidade. Highbury House (Arsenal) e Lilywhite House (Tottenham) são endereços administrativos. Os estádios foram conferidos nos sites oficiais: [Arsenal](https://www.arsenal.com/news/get-to-emirates-stadium-aErsq4S9pmwx) e [Tottenham](https://www.tottenhamhotspur.com/the-stadium). Liverpool usa Anfield; Anfield Road é o endereço. Manchester United usa Old Trafford; Sir Matt Busby Way é a rua.
- IDs, escudos e cores iniciais: catálogo público da ESPN para `soccer/eng.1`. Foi corrigido o nome de exibição `Conventry City` do catálogo para `Coventry City`, conforme o manual.
- Sobre: resumos originais em pt-BR, com referência à página em português de cada clube e aos dados oficiais do estádio/cidade. Não são cópias integrais dos artigos.
- Títulos: 127 linhas de competições/temporadas conferidas nas seções de títulos da Wikipédia em português. Conquistas de divisões inferiores ficam separadas de títulos da primeira divisão. Vice-campeonatos e acessos por playoffs não são tratados como títulos da liga. Os anos compartilhados da Supercopa são indicados no nome da competição.
- Os títulos de terceira divisão do Hull City foram conferidos no [acervo do clube](https://tigerbase.hullcity.com/tigers-honours.php), corrigindo o intervalo `1932-36` encontrado na página em português para `1932-33`.
- Referências individuais acompanham cada perfil e aparecem na aba Sobre. O snapshot inclui os principais títulos nacionais e continentais, não uma relação exaustiva de torneios regionais, juvenis ou amistosos.

## Pesquisa de APIs

Foram consultadas a documentação oficial do [TheSportsDB](https://www.thesportsdb.com/docs_api_guide) e referências no GitHub, incluindo [api-evangelist/thesportsdb](https://github.com/api-evangelist/thesportsdb) e [RohanG27/thesportsdbLibrary](https://github.com/RohanG27/thesportsdbLibrary). A consulta gratuita de equipes respondeu, mas vários campos `strDescriptionPT` vieram vazios e a consulta de liga retornou uma lista limitada. `lookuphonours.php` documenta honrarias de jogadores; não foi usado como uma lista de troféus dos clubes.

A API direta da Wikipédia retornou HTTP 403 neste ambiente. As páginas públicas em português foram consultadas pela pesquisa web. Por isso, o projeto usa um snapshot revisado e não adiciona uma dependência de consulta à Wikipédia em cada visita.

## Importação no Neon

`scripts/sync-premier-league.mjs` roda depois do build bem-sucedido, somente quando `VERCEL_ENV=production`. Localmente, a execução normal do build não conecta ao banco. Para aplicar explicitamente com uma conexão autorizada configurada, há `npm run db:premier-league`.

- A revisão é registrada em `sport_profile_imports`; novos deploys não reaplicam os dados nem desfazem futuras edições do admin.
- Os 20 registros e o marcador de revisão são gravados em uma transação.
- Nos perfis existentes, atualiza cidade, estádio, site e associação à Premier League.
- Preenche descrição, títulos, escudo e cores somente quando os respectivos campos estão vazios. Não altera imagens de estádio nem remove clubes de outras ligas.
- IDs que já pertençam a outro esporte interrompem a importação.
- O build confirma os 20 IDs na liga após aplicar os dados. Nenhuma credencial é incluída no snapshot ou enviada ao navegador.

Para atualizar dados em uma nova temporada, revise as fontes, o conjunto de participantes e a chave de revisão antes de aplicar outra importação.
