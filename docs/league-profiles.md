# Perfis de clubes — seis ligas

Snapshot revisado em 28/10/2026: `data/league-profiles-2026-27.json`.

| Liga                | Temporada | Clubes |
| ------------------- | --------- | ------ |
| Brasileirão Série B | 2026      | 20     |
| Serie A italiana    | 2026/27   | 20     |
| LaLiga              | 2026/27   | 20     |
| Liga Portugal       | 2026/27   | 18     |
| Ligue 1             | 2026/27   | 18     |
| Bundesliga          | 2026/27   | 18     |

São 114 IDs ESPN distintos. Os registros provisórios `TBD Away` (131554) e
`TBD Home` (131556), retornados pela fonte da Série B, foram excluídos.

## Fontes e revisão

- Participantes, IDs, escudos e cores: catálogo público da ESPN
  `https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/teams?limit=1000&lang=pt&region=br`.
- Itália: [diretório da Lega Serie A](https://en.legaseriea.it/team).
- Alemanha: [diretório oficial da Bundesliga](https://www.bundesliga.com/pt/bundesliga/clubes)
  e [guia dos estádios 2026/27](https://www.bundesliga.com/en/bundesliga/news/stadiums-germany-2026-27-munich-dortmund-37962).
- Brasil: [participantes da Série B 2026](https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_B)
  e [guia de estádios do ge](https://ge.globo.com/ce/futebol/brasileirao-serie-b/noticia/2026/03/21/do-castelao-ao-jorjao-conheca-os-estadios-da-serie-b.ghtml).
- Espanha: [participantes e estádios 2026/27](https://pt.wikipedia.org/wiki/La_Liga_de_2026%E2%80%9327),
  páginas dos clubes na LaLiga e sites oficiais.
- Portugal: [diretório da temporada](https://pt.wikipedia.org/wiki/Primeira_Liga#Temporada_2026%E2%80%9327),
  [Liga Portugal](https://www.ligaportugal.pt/) e sites oficiais dos clubes.
- França: [participantes e estádios 2026/27](https://en.wikipedia.org/wiki/2026%E2%80%9327_Ligue_1)
  e sites oficiais dos clubes.
- Sobre: resumos curtos originais em português, a partir da localização, estádio,
  participação na liga e conquistas verificadas. Não há cópia integral de artigos.
- Títulos: seleção de conquistas do futebol profissional masculino conferida nas
  páginas de cada clube em português, com conferência em inglês e fontes oficiais
  quando necessário. Não é um inventário exaustivo de toda competição histórica.
  Bases, feminino, outras modalidades, vice-campeonatos e vitórias em playoffs
  não são apresentados como títulos do time principal.
- O atual Estrela da Amadora tem histórico separado do clube extinto. Não foi
  importada a Taça de Portugal de 1990 nem a Liga Revelação de seu sub-23.
- Corrigida a atribuição de títulos da segunda divisão ao Le Mans encontrada na
  página em português: eram conquistas regionais, conferidas no histórico em inglês.
- Stuttgart: a [quarta Copa da Alemanha](https://www.vfb.de/de/vfb/aktuell/neues/profis/2425/pokalsieg-nummer4/)
  de 2024/25 foi confirmada no site do clube. Paderborn: [lista oficial FLVW](https://archiv.flvw.de/fileadmin/content/medienarchiv/3_Amateurfussball/Dokumente/Alle_Westfalenpokal-Sieger_seit_1982__Stand_2019_.pdf).

Cidade significa a cidade representada pelo clube; municípios diferentes do
estádio aparecem no próprio campo do estádio (Sassuolo/Reggio Emilia,
Lyon/Décines-Charpieu, Lille/Villeneuve-d'Ascq e Espanyol/Cornellà).
Casa Pia representa Lisboa e utiliza o Municipal de Rio Maior. Real Betis usa
temporariamente La Cartuja; Londrina aparece com VGD no catálogo da temporada.
Não foram cadastradas fotos de estádio sem uma imagem verificada.

Cada perfil inclui referências próprias, exibidas na aba Sobre. O servidor usa o
snapshot revisado, sem depender de Wikipedia ou diretórios de liga a cada visita.
Escalações, notícias e partidas continuam vindo da cobertura ESPN existente.

## Importação no Neon

`scripts/sync-league-profiles.mjs` executa após o build, exclusivamente quando
`VERCEL_ENV=production`, ou mediante `npm run db:league-profiles` com conexão
autorizada em `.env.local`. Builds locais e previews não alteram o banco.

- Validação dos 114 clubes, quantidades por liga, campos e URLs antes de acessar o banco.
- Revisão única registrada em `sport_profile_imports`; redeploys preservam edições futuras.
- Todos os perfis e o marcador de revisão são gravados na mesma transação.
- Nos registros existentes, atualiza a liga, cidade, estádio e site oficial.
  Nome manual, descrição, títulos, escudo e cores existentes são preservados;
  campos vazios recebem os dados revisados. `stadium_image` não é alterado.
- Nenhum clube é excluído e IDs já pertencentes a outro esporte interrompem a importação.
- Conferência dos IDs e das seis quantidades após gravar; erros interrompem o build.
- Não há credenciais no JSON ou no navegador.

A Liga Portugal também passa a integrar os filtros de Times, Classificações,
partidas e cadastro de times. Novas temporadas precisam de revisão explícita dos
participantes e de uma nova chave de revisão, sem promover/rebaixar clubes por suposição.
