# Notificações do Sportstates

O sino de cada partida adiciona o jogo à lista de acompanhamento do navegador.
O sino da navegação abre as preferências. Sem conta, os cards funcionam com
até dez jogos de um esporte. Com conta, é possível acompanhar até 30 jogos
de vários esportes e sincronizar as preferências de alerta.

## Alertas com o navegador minimizado

1. Entre na conta, abra o sino da navegação e selecione **Ativar neste dispositivo**.
2. Autorize as notificações do navegador. Em iPhone e iPad, adicione o
   Sportstates à Tela de Início e abra-o por esse ícone.
3. Ao acompanhar um jogo, escolha **Ativar notificações deste jogo**.
   **Receber apenas cards neste site** mantém esse jogo fora do envio em segundo plano.
4. **Enviar teste** verifica o envio para este dispositivo. Para revogar a inscrição,
   use **Desativar neste dispositivo**.

O Web Push usa o serviço do navegador e o sistema operacional controla a
entrega. O som do push usa a configuração do dispositivo. Os tons escolhidos
no Sportstates são reproduzidos pelos cards com o site aberto. A implementação
é para o site no navegador e para sua versão instalada na Tela de Início.

## Configuração do ambiente

- Use HTTPS, um banco Neon com permissão para criar as tabelas de push e as
  variáveis da seção Web Push de `.env.example`. Gere as chaves com
  `npx web-push generate-vapid-keys` e mantenha a chave privada no servidor.
- Configure um agendador para chamar `GET /api/push/monitor` a cada minuto,
  com o cabeçalho `Authorization: Bearer <CRON_SECRET>`. Para Vercel Cron,
  o agendamento é `* * * * *` no plano Pro ou superior. O plano Hobby exige
  um agendador externo para essa frequência. O projeto não inclui uma regra
  automática no `vercel.json`, pois ela impediria o deploy no plano Hobby.
- Depois da publicação, confira se o monitor responde 200 e se o campo
  `failed` fica em zero. Use **Enviar teste** em um aparelho e, com o
  navegador minimizado, acompanhe uma partida real para verificar a entrega
  de lances pelo agendador. O botão de teste confirma a aceitação pelo
  serviço de push e a confirmação visual depende do aparelho.

O monitor agrupa partidas entre dispositivos, consulta até 12 partidas por
execução e tenta entregar até 30 mensagens enfileiradas por ciclo. A primeira
amostra é a referência. Depois de cinco minutos sem uma amostra nova, a
referência é reconstruída. A fila evita duplicação de lances durante a janela
de entrega, descarta inscrições expiradas e tenta reenviar falhas transitórias.
A entrega depende da cobertura da partida, do agendamento e da capacidade
disponível na fila. Inscrições sem atualização por 30 dias expiram.

Com o site aberto, o monitor local continua consultando os detalhes a cada
30 segundos. Os dois fluxos usam as mesmas regras para detectar gols, pontos,
cartões, início, fim e mudanças de período. A experiência em segundo plano
exige chaves, banco e monitor configurados no ambiente publicado.
