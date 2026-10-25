# Roteiro de estudo e evolução

1. **React e TypeScript:** entender os tipos Match/Detail, filtros derivados, rotas, loading e error; adicionar uma competição ao catálogo e validar seu retorno.
2. **Integração HTTP:** estudar scoreboard versus summary, ids de provedores, métodos GET, timeouts e diferenças entre falha e lista vazia.
3. **Datas:** testar jogos depois da meia-noite UTC, rodadas em fusos distintos e datas sem partidas.
4. **Cache:** medir chamadas evitadas e atraso; substituir a memória por Redis/KV compartilhado, com deduplicação e limite diário persistente para a API-Football.
5. **Provedores:** criar interfaces formais ScoreProvider, MatchProvider e TransferProvider, contratos de testes e IDs internos para migrar sem acoplar a UI.
6. **Escala:** rate limit distribuído, observabilidade de erros/cotas, backoff, fila de atualização, licenciamento e fornecedor com SLA. Somente depois considerar SSE/WebSockets: eles não tornam o dado da origem mais atualizado.
7. **Produto:** favoritos de times e campeonatos, página de time, classificação, filtros de transferências por temporada e mais esportes mediante fonte verificada.
8. **Qualidade:** adicionar regressões visuais e testes de navegador automatizados em CI. Não armazenar chaves ou respostas com dados pessoais em fixtures.

Escopo atual: leitura de dados públicos de partidas e transferências. Sem banco de dados, contas, pagamentos, apostas, publicação de notícias ou escrita em serviços externos.
