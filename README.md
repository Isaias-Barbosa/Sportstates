# Sportstates

Central esportiva **somente leitura**, em português, com React + TypeScript + Vite e backend Node.js e Python. Projeto de estudo criado para acompanhar jogos do dia, placares, lances e transferências sem expor credenciais ao navegador.

## Rodar localmente

Requer Node.js 22.9+ (recomendado: Node 24) e Python 3.12 ou 3.13.

```bash
npm install
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
npm run dev
```

No Windows, ative o ambiente com `.venv\Scripts\activate`. Se o executável Python for diferente, defina `PYTHON` no `.env`.

Abra http://localhost:3000. O servidor Node inicia o serviço Python local e encaminha `/api/market` para ele; o navegador usa sempre a mesma origem. Não é necessário banco de dados nem chave para os placares ESPN.

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
- Seção **Ao Vivo Agora** em destaque abaixo do banner, com escudos, nomes completos, placar e acesso aos lances.
- Menu Futebol → Transferências, com Transfermarkt integrado ao servidor e API-Football selecionável.
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

## Transfermarkt integrado ao servidor

O pacote `transfermarkt-api==5.0.0` do repositório [felipeall/transfermarkt-api](https://github.com/felipeall/transfermarkt-api) roda numa **Python Function da própria Vercel** (`api/transfermarkt.py`). Não depende de Docker nem de `localhost:8000` em produção e não usa o servidor público de demonstração do autor.

- Abra **Transferências**, escolha um clube popular ou busque por nome e selecione um dos resultados.
- Cada página consulta o histórico de até 6 jogadores do elenco atual, com no máximo 3 consultas de jogadores simultâneas por requisição e limite de concorrência do SDK.
- Usamos o leitor de elenco de baixo nível do mesmo pacote porque `club_players()` v5 consulta o histórico de todo o elenco internamente. Nosso adaptador pagina antes de buscar os históricos.
- Apenas transferências que envolvem o ID do clube selecionado entram no resultado. Não mostramos o histórico de outros clubes como se fosse mercado deste clube.
- **Cobertura parcial por definição:** jogadores que já saíram do elenco atual podem ficar de fora. A página não é um levantamento completo de todas as entradas/saídas ou rumores. A ordenação por data é por página, não global.
- `clubFrom`, `clubTo`, `transferType`, `fee` e `marketValue` seguem o contrato v5. Valores monetários são exibidos em EUR. Zero é preservado; `null` significa não informado. Uma transferência sem custo pode ter taxa numérica ausente na fonte.
- Cache em memória limitado a 512 entradas: busca por 1 hora; elenco e históricos por 6 horas. Cache HTTP de 1 hora somente para respostas bem-sucedidas sem avisos. Falhas parciais são sinalizadas e não recebem cache HTTP.
- Timeout por acesso à origem: 12 segundos; orçamento total da requisição: 90 segundos; limite da função: 120 segundos. Bloqueio da fonte retorna 503; timeout retorna 504.
- Os dados vêm de uma API interna do Transfermarkt por meio do SDK, sem SLA. A disponibilidade pode variar e os termos dos dados precisam ser respeitados.

`TRANSFERMARKT_API_URL` é **opcional**. Deixe vazia para usar o SDK integrado. Para uma REST API v5 própria, informe sua URL acessível pelo servidor. O `docker-compose.yml` é apenas uma alternativa local. Não coloque uma URL localhost na Vercel.

API-Football permanece no seletor **Fonte**, usando `API_FOOTBALL_KEY` no servidor. Os IDs não são intercambiáveis; não fazemos fallback silencioso que possa misturar clubes. Nunca prefixe a chave com `VITE_`.

## Deploy na Vercel

Projeto publicado em https://sportstates.vercel.app/.

1. Use a raiz do repositório, framework Vite, Node 24, build `npm run build`, saída `dist` e instalação `npm ci`.
2. A Vercel instala `requirements.txt` para a Python Function; `.python-version` seleciona Python 3.12.
3. `/api/market` é direcionado para a função Python; as demais rotas de dados continuam na função Node. As páginas React usam `index.html`.
4. Transfermarkt funciona sem chave de API. Para a alternativa API-Football, configure `API_FOOTBALL_KEY` e faça um novo deploy.

Validação adicional do backend Python:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
```

## Estrutura

```text
src/                 interface, rotas, tipos, hook de atualização
server/catalog.mjs   esportes e ligas permitidas
server/data.mjs      normalização dos dados externos
server/cache.mjs     cache limitado + deduplicação + stale sinalizado
server/api.mjs       rotas de leitura e integrações
server/index.mjs     servidor local e produção Node
api/index.mjs        função Node Vercel
api/transfermarkt.py função Python Vercel
server/market.py      adaptador do SDK Transfermarkt, cache, paginação e contrato
server/market_server.py serviço Python local iniciado por npm run dev/start
tests/              testes automatizados (node:test)
docs/                pesquisa de fontes e plano de evolução
```

## Contrato da API

| GET              | Parâmetros                                                               | Retorno                                              |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `/api/scores`    | `date=AAAA-MM-DD` (opcional, hoje em Brasília)                           | matches, sports, warnings, stale, fetchedAt          |
| `/api/match`     | sport, league, id                                                        | match, events, statistics, lineups, stale, fetchedAt |
| `/api/market`    | `operation=search&q=nome&page=1` ou `operation=transfers&tmid=ID&page=1` | busca de clubes ou histórico paginado do elenco      |
| `/api/transfers` | team (ID API-Football)                                                   | configured, transfers, fetchedAt                     |

Rotas rejeitam outros métodos. Validação de data, ID e catálogo evita construção de URLs externas arbitrárias. O backend consulta duas datas UTC separadas e filtra por dia em Brasília, para incluir partidas da noite sem perder jogos após 00:00 UTC.

## Cache e limites reais

- Cache de placares por liga/data: 60 segundos; detalhes: 30 segundos; transferências: 6 horas.
- Deduplicação de requisições concorrentes e máximo de 300 entradas por processo.
- Timeout externo de 12 segundos. Se houver uma falha, placares antigos podem ser usados por até 15 minutos adicionais, detalhes por até 5 minutos, sempre com aviso e horário original da consulta.
- Respostas saudáveis têm cache compartilhado HTTP de 30 segundos e stale-while-revalidate de 30 segundos. Isso pode acrescentar atraso; **não é transmissão instantânea**.
- Em serverless, memória não é compartilhada nem durável. Cold starts e múltiplas instâncias fazem novas consultas. O cache não garante a cota diária do plano.
- O backend é público e não tem autenticação nem rate limit distribuído. **Antes de escalar:** cache Redis/KV compartilhado, rate limit por cliente, orçamento diário persistente para APIs pagas e monitoramento. Não use o plano gratuito como fonte de live polling de alta frequência.

## Fontes e limites

ESPN usa feeds públicos **não oficiais**, sem SLA. O projeto comunitário documenta endpoints, mas não concede licença para redistribuir dados. Para ESPN, o projeto implementa um adaptador próprio; Transfermarkt usa o SDK Python como dependência. Para produto comercial, confirme termos de uso e direitos de dados e escudos e contrate uma fonte adequada.

Comentários e algumas estatísticas podem chegar em inglês e são exibidos no idioma original; não há tradução automática. Algumas partidas não oferecem minuto a minuto ou escalações. Veja a comparação e os links em [docs/FONTES.md](docs/FONTES.md) e o [roteiro de estudo](docs/ROADMAP.md).
