# Sportstates

Central esportiva somente leitura, em português, construída com React, TypeScript, Vite e Node.js. Acompanha placares, calendários, classificações, partidas e páginas de times.

## Executar localmente

Requer Node.js 22.13.0 ou mais recente (Node 24 recomendado).

```bash
npm ci
cp .env.example .env
npm run dev
```

No PowerShell, copie as configurações com `Copy-Item .env.example .env`. Abra
http://localhost:3000. Placares ESPN não exigem chave. As credenciais
administrativas e do banco, quando necessárias, ficam apenas no servidor.

```bash
npm test
npm run build
npm start
```

## Cobertura

| Esporte           | Competições                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Futebol           | Brasileirão A/B, copas estaduais e nacionais, ligas europeias, Libertadores e outras competições do catálogo |
| Basquete          | NBA, WNBA e Novo Basquete Brasil (NBB)                                                                       |
| Futebol americano | NFL                                                                                                          |
| Beisebol          | MLB                                                                                                          |
| Hóquei            | NHL                                                                                                          |
| Judô              | Presente no catálogo; ainda sem fonte integrada de placares                                                  |

O NBB usa o feed público não oficial da ESPN para placares, calendário e dados de equipe. Os perfis usam páginas e escudos da Liga Nacional de Basquete (LNB) quando publicados. Veja [docs/FONTES.md](docs/FONTES.md).

Os 16 perfis disponíveis no catálogo ESPN são sincronizados no Neon pela build de produção. Para importar ou atualizar localmente, configure `DATABASE_URL` e execute `npm run db:basketball`.

## Cache

Valores de provedores ficam em LRU limitado por instância; o Runtime Cache da
Vercel guarda somente o marcador compartilhado de invalidação. Respostas
saudáveis também usam a CDN com prazos curtos para conteúdo atual. A arquitetura,
limites e alternativas públicas estão em [docs/cache.md](docs/cache.md).

## Vercel

Use a raiz do repositório, Node 24, instalação `npm ci`, build `npm run build` e
diretório de saída `dist`. A API roda na função Node; não há função Python.
Configure no ambiente da Vercel apenas as variáveis necessárias listadas em
[.env.example](.env.example), sem prefixar segredos com `VITE_`.

## Estrutura

```text
src/                 interface, rotas, tipos e hooks
server/catalog.mjs   catálogo de esportes e competições
server/data.mjs      normalização dos feeds
server/cache.mjs     LRU local, invalidação e deduplicação
server/api.mjs       rotas e integrações de leitura
api/index.mjs        função Node da Vercel
mobile/              aplicativo React Native/Expo
data/                perfis revisados de equipes
tests/               testes automatizados (node:test)
docs/                fontes, cache e validação
```

Consulte [mobile/README.md](mobile/README.md) para iniciar o app Expo e
[docs/ROADMAP.md](docs/ROADMAP.md) para o roteiro de evolução.

### Importação offline do calendário da CBF

O importador cobre o layouts da tabela detalhada de 2026 da Série A, validados nos
[anexos oficiais das rodadas 31 a 34](https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro/a/cbf-garante-duas-semanas-completas-de-futebol-para-rodadas-33-e-34-do-brasileirao-e-semis-da-copa-do-brasil)
e [35 e 36](https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro-serie-a/a/cbf-divulga-tabela-detalhada-das-rodadas-35-e-36-do-brasileirao-serie-a).
Instale as dependências em um ambiente Python 3.11+ com
`python -m pip install pdfplumber==0.11.9 tzdata`.

Copie `scripts/cbf-serie-a-2026.example.json` para uma pasta de trabalho e
salve o anexo oficial nessa mesma pasta com o nome indicado no manifesto.
Execute `python scripts/import-cbf-calendar.py caminho/manifesto.json caminho/calendario.json`.
A saída registra partidas pela referência da CBF, com a origem de cada versão,
e agrupa as referências por data no fuso de Brasília. A gravação é feita
somente depois de validar todos os documentos.

O manifesto lista as referências e rodadas esperadas de cada tabela.
Inclua publicações novas com o horário, o link direto do anexo oficial
e o SHA-256 dos bytes baixados. O importador aplica as versões em ordem
cronológica. Para uma IMT revisada que adia um jogo sem nova data, registre
`kind: "postponement"` com a referência em `reference` e os mesmos campos de
origem, arquivo e versão de uma tabela. O responsável pela importação deve
conferir a indicação de adiamento no documento. Uma tabela posterior com
nova data para a referência volta a incluir o jogo no índice.

Para importar placares, salve o HTML de uma página oficial de partida na pasta
do manifesto e liste-o em `results` com `file`, `url`, `sha256`, `publishedAt`
(versão observada) e `reference`. O importador exige uma súmula oficial
publicada e confere competição, temporada, referência, rodada, equipes e
horário com o calendário. Foi validado com a
[página oficial de Chapecoense x Mirassol](https://www.cbf.com.br/futebol-brasileiro/jogos/campeonato-brasileiro/serie-b/2026/chapecoense-x-mirassol/832230).
A competição é verificada pelo ID no conteúdo da página.

O processo é manual e executado fora da aplicação. As páginas de resultados
usam o formato atual do site da CBF. Mudanças de formato exigem revisão
do importador. Teste as regras de importação com
`python -B -m unittest discover -s tests -p test_cbf_calendar.py`.
