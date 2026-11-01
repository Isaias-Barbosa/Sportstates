# Validação

- `npm run check`: 285 testes passaram; TypeScript e bundle de produção aprovados.
- `npx tsc --noEmit` em `mobile/`: aprovado.
- `npx expo install --check`: dependências compatíveis com o SDK 58. O ambiente local usa Node 22.12.0 e o Expo exige Node 22.13.0 ou mais recente.
- Consulta real do backend em 25/10/2026: 46 partidas, sendo 22 de futebol, 7 de basquete, 12 de futebol americano e 5 de hóquei; sem avisos de fontes nessa consulta. Não havia jogo de beisebol no retorno para a data.
- Summary real Manchester United × Bournemouth: 108 comentários, estatísticas e escalações para os dois times.
- Navegador de prévia: página inicial e busca inspecionadas. O servidor isolado de prévia não conseguiu acessar as fontes de placares; a UI exibiu o erro esperado. A consulta direta no ambiente de desenvolvimento funcionou.
- CSS contém breakpoints para telas pequenas, mas a emulação móvel não estava disponível no navegador de QA; validação em dispositivo real ainda pendente.
- Vercel: configuração entregue; deploy e verificação no ambiente hospedado ainda pendentes.
- A importação dos perfis no Neon não foi executada durante a validação local; a build de produção a executa, ou use `npm run db:basketball` com `DATABASE_URL`.
- A leitura do QR Code em aparelho real e a atualização do Expo Go ainda precisam de validação no dispositivo.

Essas verificações não garantem estabilidade futura dos endpoints não oficiais nem cobertura de todas as partidas.
