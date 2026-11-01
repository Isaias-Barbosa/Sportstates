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
