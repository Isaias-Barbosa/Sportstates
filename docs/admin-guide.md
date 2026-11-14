# Administração do Sportstates

Entre com a conta administrativa e acesse `/admin`. Configure `DATABASE_URL`, `ADMIN_EMAIL` e `NEON_AUTH_BASE_URL` no ambiente da aplicação. O Neon precisa permitir a criação da tabela `sport_admin_studio` no primeiro uso. Evite compartilhar as credenciais do ambiente.

## Dados e fontes

A página `/admin/apis` mostra funções das fontes atuais e o resultado da consulta de placares. Os números da Visão geral contam jogos e competições observados, sem representar requisições faturadas pelos serviços externos.

- **ESPN** alimenta placares, classificações e detalhes nas competições compatíveis. Veja `server/api.mjs`, `server/catalog.mjs` e `server/data.mjs`.
- **ge** entra na contingência da Série A quando habilitado e também publica a agenda de transmissões. Veja `server/ge-rounds.mjs` e `server/ge-broadcasts.mjs`.
- **365Scores e LNB** atendem ao NBB na ordem configurada pelo código. O 365Scores também atende competições complementares. Veja `server/365scores.mjs` e `server/lnb.mjs`.
- **CBF** complementa calendários, transmissões e dados de competições brasileiras. Veja `server/cbf-broadcasts.mjs` e `server/cbf-lower-divisions.mjs`.

### Publicar dados de uma API sem editar código

1. No painel Vercel, abra Settings → Environment Variables. Em `SPORTSTATES_SOURCE_ORIGINS`, cadastre apenas origens HTTPS de provedores confiáveis, sem caminho, separadas por vírgula. Exemplo `https://api.exemplo.com,https://dados.exemplo.org`. Em desenvolvimento, configure as mesmas variáveis no ambiente local. Faça um novo deploy após alterar o ambiente da Vercel.
2. Para autenticação Bearer, crie `SPORTSTATES_SOURCE_EXEMPLO_TOKEN` com o segredo e `SPORTSTATES_SOURCE_EXEMPLO_ORIGIN` com a origem exata. Informe apenas `SPORTSTATES_SOURCE_EXEMPLO_TOKEN` no painel. URLs ficam no cadastro administrativo, por isso use parâmetros de consulta para filtros e mantenha segredos nas variáveis do servidor.
3. Em APIs personalizadas, cadastre o URL completo, o nome da seção e o destino. Em Classificações, selecione a competição. A resposta deve ser JSON com uma lista. Para o exemplo abaixo, use `items` em Lista, `name` em Título, `stats.points` em Valor e `url` em Link do item.

```json
{"items":[{"name":"Equipe A","stats":{"points":42},"url":"https://exemplo.com/equipes/a"}]}
```

4. Teste a fonte e confira a amostra. Marque **Publicar** e salve. A seção mostra até 24 registros. Ela usa GET, com timeout de seis segundos, sem seguir redirecionamentos. O cache local por instância preserva a última resposta válida por até uma hora após o vencimento e espera um minuto entre falhas. Uma instância nova depende de uma consulta bem-sucedida.

### Conectar um provedor aos placares ou às tabelas principais

Crie um adaptador em `server/` que valide a resposta externa e converta IDs, datas, estados e nomes para o formato do portal. Use `server/365scores.mjs` e `server/data.mjs` como referência. Identifique a competição no catálogo, componha a fonte na rota correspondente de `server/api.mjs` e use `server/source-manager.mjs` e `server/cache.mjs` para a contingência. Para transmissões, use território Brasil e confirmação por partida. Valide com `npm test` e `npm run build`.

## Jogadores e Customizações

Em `/admin/jogadores`, procure pelo nome ou ID ESPN. Para editar um perfil público já existente, carregue o identificador usado em `/jogadores/<id>`. Descreva clubes anteriores e premiações com uma referência HTTPS para cada registro. O código ESPN serve para completar campos disponíveis de identificação, nacionalidade, posição e clube. O histórico e as premiações podem ser preenchidos manualmente.

Em `/admin/customizacoes`, defina o fundo nos temas claro e escuro e ordene as competições. A home prioriza ligas que têm jogos no filtro atual. Classificações aplica a prioridade dentro do esporte e grupo selecionados. Use Restaurar para voltar à cor original e remova uma liga da lista para devolver sua posição à ordem padrão.

## Prioridade por liga

Em **Admin → Ligas → Fontes**, escolha a competição, o ano inicial da temporada e os provedores na ordem de consulta. Em **APIs e fontes**, confira se as chaves dos adaptadores estão configuradas.

| Provedor | Variável na Vercel | Como descobrir o código |
| --- | --- | --- |
| [API-Football](https://www.api-football.com/documentation-v3) | `API_FOOTBALL_KEY` | Consulte `GET /leagues` com o cabeçalho `x-apisports-key` e copie `league.id`. |
| [football-data.org](https://docs.football-data.org/general/v4/competition.html) | `FOOTBALL_DATA_KEY` | Consulte `GET /v4/competitions` com `X-Auth-Token` e copie o código da competição, como `PL`. |

Em Vercel → Settings → Environment Variables, adicione as chaves ao ambiente usado e faça um novo deploy. Escolha Jogos ou Classificação para cada fonte e use **Testar cobertura** antes de salvar. Reavalie o ano na troca de temporada. Para restaurar a ordem padrão, remova os provedores e salve. Os resultados passam a alimentar a Home, o calendário e a tabela conforme a configuração. Copas com chave eliminatória mantêm o fluxo atual da classificação. Estatísticas de partida podem aparecer no detalhe do API-Football quando o plano e a partida cobrem o recurso. Rankings de jogadores usam os adaptadores existentes.

Quando a fonte prioritária falha, o portal tenta manter a última resposta válida por até uma hora depois do vencimento do cache. Se ela não estiver disponível, tenta a próxima fonte e, por fim, o fluxo original da liga. O calendário é consultado por mês para compartilhar respostas entre a Home e a página da liga. A tabela fica em cache por dez minutos.

API-Football, football-data.org e [Sportmonks](https://www.sportmonks.com/football-api/coverage/) são provedores com documentação própria. [Sportradar](https://developer.sportradar.com/getting-started/docs/get-started) e [Opta](https://www.statsperform.com/opta/) oferecem feeds comerciais multiesportivos, incluindo dados obtidos em parcerias oficiais conforme a competição e o contrato. Valide cobertura, limites e direitos de publicação antes de escolher um plano. Cada formato adicional exige um adaptador antes de entrar na prioridade do portal.
