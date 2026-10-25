# Validação da primeira versão

- `npm test`: 10 testes passaram (fuso BRT, datas inválidas, mandante/visitante, placar zero, ordem de comentários, cache/deduplicação/expiração, validação, chave ausente e bloqueio de métodos de escrita).
- `npm run build`: TypeScript e bundle de produção aprovados.
- Consulta real do backend em 25/10/2026: 46 partidas, sendo 22 de futebol, 7 de basquete, 12 de futebol americano e 5 de hóquei; sem avisos de fontes nessa consulta. Não havia jogo de beisebol no retorno para a data.
- Summary real Manchester United × Bournemouth: 108 comentários, estatísticas e escalações para os dois times.
- Navegador de prévia: página inicial, busca e navegação para transferências inspecionadas. O estado de chave ausente foi validado visualmente. O servidor isolado de prévia não conseguiu acessar as fontes de placares; a UI exibiu o erro esperado. A consulta direta no ambiente de desenvolvimento funcionou.
- CSS contém breakpoints para telas pequenas, mas a emulação móvel não estava disponível no navegador de QA; validação em dispositivo real ainda pendente.
- API-Football autenticada: pendente de chave do usuário.
- Vercel: configuração entregue; deploy e verificação no ambiente hospedado ainda pendentes.

Essas verificações não garantem estabilidade futura dos endpoints não oficiais nem cobertura de todas as partidas.
