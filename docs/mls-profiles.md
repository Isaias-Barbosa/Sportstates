# Clubes da MLS — 2026

Revisão de 28/10/2026. A [lista da ESPN fornecida pelo usuário](https://www.espn.com.br/futebol/times/_/liga/usa.1)
e o [diretório oficial da MLS](https://www.mlssoccer.com/clubs/) contêm 30 clubes.
O snapshot `data/mls-profiles-2026.json` inclui somente os 28 que faltavam.
Atlanta United (18418) e Inter Miami (20232) foram cadastrados pelo usuário e
ficam explicitamente fora da importação, sem preencher nem substituir campos.

## Fontes

- IDs, nomes, cores e escudos: catálogo público ESPN `soccer/usa.1/teams`.
- Cidade, estádio, site e estreia na MLS: [guia oficial MNUFC 2026](https://images.mlssoccer.com/image/upload/v1777668287/assets/min/media/2026_MNUFC_MediaGuide_avbiup.pdf),
  páginas 247–274 do arquivo, com links para a página de cada clube. Os números
  impressos diferem da posição no PDF. O guia contém os 29 adversários; para
  Minnesota, foram conferidos o [Allianz Field](https://www.mnufc.com/stadium/),
  o próprio guia e a página histórica do clube.
- Nomes atuais conferidos nos sites dos clubes: [ScottsMiracle-Gro Field](https://www.columbuscrew.com/stadium/),
  [Sporting Park](https://www.sportingkc.com/stadium/) e [Energizer Park](https://www.stlcitysc.com/stadium/).
- NYCFC usa Yankee Stadium e Citi Field em 2026; o novo estádio não foi antecipado.
- Resumos originais em pt-BR. Referências individuais acompanham os perfis e são
  exibidas na aba Sobre. Não foram importadas fotos de estádio sem imagem verificada.
- Títulos principais conferidos nas páginas de cada clube em português e no guia;
  [Philadelphia Union](https://en.wikipedia.org/wiki/Philadelphia_Union#Honors)
  teve o Supporters’ Shield de 2020 e 2025 conferido em inglês. MLS Cup e
  Supporters’ Shield são competições distintas. Reservas, categorias de base,
  rivalidades amistosas e posições de conferência não viram títulos da MLS Cup.
- As conquistas são uma seleção verificada, não um inventário exaustivo. Um
  campo vazio significa que nenhum título dessa seleção foi importado.

## Importação e preservação

`scripts/sync-mls-profiles.mjs` roda depois do build somente em produção, ou
explicitamente por `npm run db:mls` com a conexão autorizada em `.env.local`.
Local e preview não escrevem no banco. O snapshot não contém credenciais.

O script exige que os dois perfis do usuário já existam na MLS, valida os IDs e
interrompe diante de conflitos de esporte/liga. Os 28 inserts usam `ON CONFLICT
(id) DO NOTHING`: qualquer cadastro existente, inclusive um feito durante o
build, é preservado integralmente. Não há UPDATE ou DELETE de perfis.

Os inserts e o marcador da revisão são gravados em uma transação. Uma revisão
já aplicada não roda novamente. Ao terminar, os 30 IDs são conferidos na MLS.
As páginas, escudos, navegação, notícias, jogos, elenco e última escalação usam
a estrutura existente de Times e a cobertura disponível na ESPN.
