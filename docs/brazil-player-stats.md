# Estatísticas de jogadores

A aba Estatísticas e a página do atleta consultam o Neon. A ESPN entra na importação de elencos e partidas, fora da navegação. O identificador ESPN conecta elenco, súmula e perfil.

## Premier League, LaLiga e Bundesliga

As ligas `eng.1`, `esp.1` e `ger.1` usam as mesmas tabelas e comandos. Uma temporada como 2026/27 é armazenada com o ano inicial 2026. A Bundesliga tem 18 clubes, enquanto as outras duas têm 20.

Depois de publicar, importe os elencos e as partidas encerradas a partir do início da temporada. Crie um agendamento por liga usando `/api/player-stats/sync?league=eng.1`, `esp.1` ou `ger.1` com o mesmo cabeçalho de autenticação descrito abaixo.

## Carga inicial

Aplique primeiro a migração com a conexão do servidor, usando o papel do Neon proprietário das tabelas. Ela cria as três tabelas e os índices em uma transação. Pode ser executada novamente e preserva os registros existentes.

```powershell
node --env-file-if-exists=.env.local scripts/setup-brazil-players.mjs --apply
```

Em um ambiente com `DATABASE_URL` apontando para o Neon escolhido, rode uma vez por divisão:

```powershell
node --env-file-if-exists=.env.local scripts/sync-brazil-players.mjs rosters bra.1
node --env-file-if-exists=.env.local scripts/sync-brazil-players.mjs rosters bra.2
```

Importe os jogos já disputados em janelas de até 31 dias. Este exemplo cobre um mês, então repita para os meses desejados e para a outra divisão:

```powershell
node --env-file-if-exists=.env.local scripts/sync-brazil-players.mjs matches bra.1 2026-10-01 2026-10-31
```

A importação grava uma linha por partida e divisão. Rode novamente para tentar jogos sem cobertura. Use `--force` para atualizar uma partida salva após correção da fonte. Os totais representam as partidas importadas. Campos ausentes aparecem como traço.

O perfil também separa Copa do Brasil (`bra.copa_do_brazil`) e Copa Libertadores (`conmebol.libertadores`). Importe as partidas dessas competições com o comando `matches` e configure um agendamento por competição no mesmo sincronizador. As copas usam os elencos já identificados e os atletas das partidas, sem uma carga separada de elencos.

## Atualização dos jogos encerrados

Configure um cron por divisão, alternando os horários para distribuir as consultas. Use GET em `/api/player-stats/sync?league=bra.1` e `/api/player-stats/sync?league=bra.2` com o cabeçalho `Authorization: Bearer <CRON_SECRET>`. Cada execução verifica hoje e ontem no horário de Brasília, pula partidas já salvas e tenta até duas por dia. A resposta informa atualizações, partidas sem cobertura e fila restante. Reimporte a data pelo script se a pendência ultrapassar essa janela. Reexecute a carga de elencos após mudanças de inscrição.

## Dados complementares

A página mostra clubes encontrados nas partidas importadas e aceita histórico adicional, prêmios e estimativas de mercado com fonte. Para publicar dados revisados, rode `node --env-file-if-exists=.env.local scripts/sync-brazil-players.mjs profile <id-espn> <arquivo.json>`. O arquivo pode conter `previousClubs` e `awards` como listas de objetos com `name` e `source`. O campo `marketValue` usa `amount`, `currency`, `date` e `source`. Importe o conjunto completo ao atualizar um perfil.

Use `teamHonours` para títulos em que a participação do jogador foi confirmada. Cada registro tem `name`, `team`, `season` e `source`. Use `portrait` para uma foto com direito de uso confirmado, com `url`, `source`, `credit` e `licenseUrl`. O site exibe o crédito e o link da licença. Os dados revisados de Kaio Jorge estão em `data/player-profile-references.json`.

Use `transfers` para movimentações confirmadas. Cada item contém `date` (AAAA-MM-DD), `from`, `to`, `kind` (`transfer`, `loan` ou `return`) e `source`. As datas em anúncios podem diferir da data efetiva no registro do clube. Consulte a fonte antes de importar. A API-Football documenta `/transfers?player=...` e `/players/teams`; uma importação em lote exige chave e correspondência revisada entre IDs ESPN e API-Football.

A cobertura de estatísticas por partida foi verificada na ESPN para [Athletico-PR x Vasco](https://www.espn.com.br/futebol/partida/_/jogoId/401841306) e uma [partida da Série B](https://www.espn.com.br/futebol/partida/_/jogoId/401860413). O [cadastro da CBF](https://www.cbf.com.br/futebol-brasileiro/atletas/campeonato-brasileiro/serie-a/2026) pode servir para conferência de inscrições. Os [termos do Transfermarkt](https://www.transfermarkt.com/intern/anb) restringem coleta automatizada, por isso os valores dependem de uma fonte autorizada e verificável.
