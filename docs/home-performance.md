# Carregamento progressivo da home

## Diagnóstico em 29/10/2026

O backend consultava todas as ligas de todos os esportes e só entregava `/api/scores` depois de `Promise.all` e da busca de transmissões. Uma fonte lenta, especialmente uma consulta WTT com múltiplos lotes, retinha os jogos dos provedores rápidos. No cliente, todas as páginas eram importadas no arquivo inicial, incluindo o painel administrativo e suas dependências de autenticação.

Medição HTTP anterior em produção, neste ambiente:

| Recurso | TTFB | Total |
| --- | ---: | ---: |
| HTML da home, primeira execução | 6,05 s | 6,07 s |
| Agenda completa, primeira execução | 7,19 s | 7,62 s |
| HTML da home, segunda execução | 5,17 s | 5,17 s |
| Agenda completa, segunda execução | 6,26 s | 6,44 s |

Na segunda execução, a negociação TLS consumiu aproximadamente 5,10 s em ambas as requisições. Assim, esses tempos totais não podem ser atribuídos somente ao aplicativo nem tratados como LCP de um usuário real. O intervalo entre TLS e primeiro byte da agenda foi cerca de 1,16 s. O payload da agenda completa observado foi 418.246 bytes. Fontes com timeout podem aumentar o tempo em consultas sem cache.

## Alterações

- `GET /api/scores?date=AAAA-MM-DD&sport=...` consulta somente o esporte solicitado. A rota sem `sport` preserva o comportamento para consumidores existentes e o admin. Identificadores inválidos são rejeitados antes de consultar provedores.
- A home inicia consultas independentes por esporte. Cada resposta entra na tela assim que chega, sem aguardar todas. O indicador identifica os esportes ainda pendentes. Não depende de suporte a streaming do navegador ou de uma conexão WebSocket.
- Cada esporte tem seu próprio ciclo: 15 s quando reporta partidas ao vivo ou dados stale, 60 s nos demais casos. Os intervalos começam após a conclusão de cada consulta. O cache existente das fontes continua sendo reutilizado; não se ampliou a validade de placares ao vivo.
- Uma falha não apaga os outros esportes. Placar antigo retido após falha recebe `liveUnverified`, retirando a indicação de ao vivo. Novas tentativas usam 10, 20, 40 e no máximo 60 segundos. Uma consulta sem resposta é cancelada após 45 s.
- Pausa de polling em abas ocultas; retomada ao voltar para a aba ou recuperar conexão. Apenas uma requisição por esporte fica em andamento. Atualização manual preserva dados existentes. Mudança de data cancela as consultas e impede respostas antigas de entrarem na nova agenda.
- Durante a carga parcial, a reconciliação de filtros não remove uma competição apenas porque sua fonte ainda não respondeu.
- Cards de partidas usam memoização; atualizar um esporte não obriga a recalcular os cards dos demais cujos dados e favoritos permanecem iguais.
- Páginas internas são carregadas sob demanda com React.lazy e Suspense. O JavaScript inicial passou de 604,91 KB para aproximadamente 329 KB, cerca de 46% menor. Compactado com gzip, passou de 184,21 KB para aproximadamente 105 KB, cerca de 43% menor. O código do admin passou para um chunk separado de cerca de 176 KB.

## Limites e validação

A divisão aumenta o número de requisições pequenas ao próprio backend por rodada inicial. Ela não faz cada rodada consultar todos os provedores novamente: cada rota consulta apenas seu esporte, e os ciclos independentes evitam atualizar esportes estáveis no ritmo dos jogos ao vivo. Não foi adicionado serviço pago, cron ou processo permanente.

Não se promete que uma fonte individual ficou mais rápida, nem um percentual de melhora do tempo total em aparelhos reais. O ganho comprovado é a redução do JavaScript inicial e a retirada da dependência entre esportes no carregamento e nas atualizações.

Testes em `tests/scores-loader.test.mjs` cobrem respostas fora de ordem, progressão, falhas e recuperação, dados antigos, timeout, deduplicação, cancelamento, aba oculta, intervalos e isolamento dos provedores. A suíte completa e o build verificam a integração. A conferência visual nesta sessão ficou limitada pelo bloqueio de uso do navegador; medições HTTP e testes de código não substituem uma medição de LCP no dispositivo do usuário.
