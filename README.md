# Sportstates

Central esportiva **somente leitura**, em português, com React + TypeScript + Vite e backend Node.js. Projeto de estudo criado para acompanhar jogos do dia, placares, lances e transferências sem expor credenciais ao navegador.

## Rodar localmente

Requer Node.js 22.9+ (recomendado: Node 24).

```bash
npm install
cp .env.example .env
npm run dev
```

Abra http://localhost:3000. A aplicação e a API rodam no mesmo servidor. Não é necessário banco de dados nem chave para os placares ESPN.

```bash
npm test        # testes de normalização, datas, cache e validação
npm run build  # TypeScript e bundle de produção
npm start      # serve dist + API, após o build
```

## O que está implementado

- Cards dos esportes com partidas na data, mais o filtro geral.
- Agenda no fuso **America/Sao_Paulo**, data selecionável e busca por time/liga.
- Filtros: todos, ao vivo, próximos e encerrados.
- Detalhes com placar, minuto a minuto, estatísticas e escalações **quando disponíveis na fonte**.
- Atualização da agenda a cada 60 segundos; detalhes a cada 30 segundos, somente com a aba visível.
- Favoritos locais por partida, persistidos no navegador; não há conta nem sincronização.
- Menu Futebol → Transferências, usando API-Football por clube.
- Estados explícitos para carregamento, ausência de dados, falhas parciais, cache antigo e chave ausente.
- Interface responsiva, navegação por teclado, foco visível e respeito a movimento reduzido.

## Cobertura inicial

| Esporte           | Competições                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Futebol           | Brasileirão A/B, Premier League, LaLiga, Serie A italiana, Bundesliga, Ligue 1, Champions League |
| Basquete          | NBA e WNBA                                                                                       |
| Futebol americano | NFL                                                                                              |
| Beisebol          | MLB                                                                                              |
| Hóquei            | NHL                                                                                              |

Não é uma lista de todos os jogos de todos os esportes. A fonte pode omitir jogos e detalhes, e a disponibilidade pode mudar. Adicione competições em `server/catalog.mjs`; use IDs da ESPN. Não há dados mockados substituindo falhas.

## Transferências

1. Crie sua chave em https://dashboard.api-football.com/.
2. Defina `API_FOOTBALL_KEY` no `.env` (local) ou nas variáveis de ambiente do servidor.
3. Reinicie o servidor ou faça um novo deploy.
4. Abra **Transferências**, escolha um clube ou informe o ID **da API-Football**.

IDs de equipes da ESPN não são intercambiáveis com os da API-Football. A página retorna registros de transferências, não rumores. O plano gratuito consultado em 25/10/2026 oferece 100 consultas/dia; confira condições atuais. Consultas por clube ficam em cache por 6 horas no processo. A chave nunca deve usar prefixo `VITE_`, ser commitada ou enviada ao frontend. O erro da API não expõe a chave.

## Deploy na Vercel

1. Importe `Isaias-Barbosa/Sportstates` na Vercel, usando a raiz do repositório.
2. Build: `npm run build`; saída: `dist`; runtime Node 24 (ou compatível).
3. Adicione `API_FOOTBALL_KEY` se quiser habilitar transferências.
4. Faça deploy. `vercel.json` direciona `/api/*` à função Node e as páginas React ao `index.html`.

Não houve deploy automático em uma conta Vercel: o repositório está preparado para importação. Não publique a chave em Issues, logs ou commits.

## Estrutura

```text
src/                 interface, rotas, tipos, hook de atualização
server/catalog.mjs   esportes e ligas permitidas
server/data.mjs      normalização dos dados externos
server/cache.mjs     cache limitado + deduplicação + stale sinalizado
server/api.mjs       rotas de leitura e integrações
server/index.mjs     servidor local e produção Node
api/index.mjs        função serverless Vercel
tests/              testes automatizados (node:test)
docs/                pesquisa de fontes e plano de evolução
```

## Contrato da API

| GET              | Parâmetros                                     | Retorno                                              |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `/api/scores`    | `date=AAAA-MM-DD` (opcional, hoje em Brasília) | matches, sports, warnings, stale, fetchedAt          |
| `/api/match`     | sport, league, id                              | match, events, statistics, lineups, stale, fetchedAt |
| `/api/transfers` | team (ID API-Football)                         | configured, transfers, fetchedAt                     |

Rotas rejeitam outros métodos. Validação de data, ID e catálogo evita construção de URLs externas arbitrárias. O backend consulta duas datas UTC separadas e filtra por dia em Brasília, para incluir partidas da noite sem perder jogos após 00:00 UTC.

## Cache e limites reais

- Cache de placares por liga/data: 60 segundos; detalhes: 30 segundos; transferências: 6 horas.
- Deduplicação de requisições concorrentes e máximo de 300 entradas por processo.
- Timeout externo de 12 segundos. Se houver uma falha, placares antigos podem ser usados por até 15 minutos adicionais, detalhes por até 5 minutos, sempre com aviso e horário original da consulta.
- Respostas saudáveis têm cache compartilhado HTTP de 30 segundos e stale-while-revalidate de 30 segundos. Isso pode acrescentar atraso; **não é transmissão instantânea**.
- Em serverless, memória não é compartilhada nem durável. Cold starts e múltiplas instâncias fazem novas consultas. O cache não garante a cota diária do plano.
- O backend é público e não tem autenticação nem rate limit distribuído. **Antes de escalar:** cache Redis/KV compartilhado, rate limit por cliente, orçamento diário persistente para APIs pagas e monitoramento. Não use o plano gratuito como fonte de live polling de alta frequência.

## Fontes e limites

ESPN usa feeds públicos **não oficiais**, sem SLA. O projeto comunitário documenta endpoints, mas não concede licença para redistribuir dados. Este projeto não copia código desses repositórios: implementa um adaptador próprio. Para produto comercial, confirme termos de uso e direitos de dados e escudos e contrate uma fonte adequada.

Comentários e algumas estatísticas podem chegar em inglês e são exibidos no idioma original; não há tradução automática. Algumas partidas não oferecem minuto a minuto ou escalações. Veja a comparação e os links em [docs/FONTES.md](docs/FONTES.md) e o [roteiro de estudo](docs/ROADMAP.md).
