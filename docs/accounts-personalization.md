# Contas, favoritos e Resumo Diário

Implementação inicial das cinco prioridades antes do aplicativo nativo. Usa Neon Auth já configurado no projeto, sem criar outro provedor de identidade nem armazenar senhas no Sportstates.

## Entrar e cadastrar

`/conta` oferece cadastro com nome/e-mail/senha, login e recuperação por código de e-mail do Neon Auth. Envio de e-mails e exigência de verificação seguem a configuração do provedor. A conta administrativa mantém sua validação separada; uma conta comum não vira administradora. A sessão fica nos cookies geridos pelo SDK. JWTs são obtidos antes das chamadas privadas e não são persistidos em localStorage. O servidor valida assinatura, emissor, audiência, expiração e identidade; a chave administrativa de recuperação não autentica usuários comuns.

## Dados por conta

`GET /api/me` retorna a identidade verificada e preferências. `POST /api/me` recebe ações explícitas para seguir/deixar de seguir times e partidas, esportes e configuração de alertas. O usuário da gravação vem do JWT, nunca de parâmetros ou do corpo. Cada linha em `sport_user_preferences` pertence ao ID do Neon Auth, com JSON e versão. Atualizações usam compare-and-swap e repetição limitada para preservar alterações simultâneas de dispositivos diferentes. Limites: 50 times e 200 partidas favoritas. RLS é habilitado sem políticas públicas; somente o backend com o papel proprietário da tabela consulta esses dados.

O script `scripts/setup-user-preferences.mjs` prepara a tabela no build de produção (ou execução explícita com `--apply`). Não altera `neon_auth`, não apaga times existentes e não muda usuários do administrador.

A estrela nos jogos sincroniza com a conta. A página do time oferece Seguir time. `/favoritos` reúne equipes e partidas. Visitantes continuam com favoritos locais; copiar favoritos anteriores para a conta exige o botão explícito em Minha conta. Nenhum favorito de visitante é copiado silenciosamente para uma conta diferente. Login, logout e mudanças de conta limpam os dados privados visíveis no cliente; respostas antigas são descartadas.

## Home e transmissões

Times e partidas favoritos aparecem primeiro. O botão Para você filtra por esportes escolhidos, times seguidos e jogos salvos; a agenda completa continua acessível. O filtro Com transmissão confirmada considera apenas anúncios por confronto, mantendo a diferença entre direitos de competição e transmissão do jogo. O Resumo Diário também reúne onde assistir com confirmação disponível, preservando links oficiais e as fontes já existentes.

## Resumo Diário

Link no navbar e no menu, rota `/resumo-diario`. Visitantes veem convite para cadastro, sem conteúdo pessoal. `GET /api/me/summary` exige autenticação no servidor e usa `private, no-store`, sem cache CDN. Lê preferências e consulta os esportes de interesse para hoje e ontem no horário de Brasília, reutilizando o cache público das fontes. Inclui ao vivo, próximos jogos, resultados, transmissões e notícias no radar. É uma composição factual, sem geração por IA, números inventados ou notícias integrais copiadas. Fontes indisponíveis geram indicação de cobertura parcial. O botão Atualizar faz nova consulta; não promete acompanhamento ao vivo nessa página.

## Notificações e sons

Configurações no sino e em Minha conta: todos os eventos selecionados, momentos importantes ou somente início e resultado; gols/pontos, cartão vermelho, prorrogação/pênaltis e mudança de set/período podem ser selecionados. Mantém a comparação entre snapshots consecutivos e recentes, sem notificações retroativas. Visitantes acompanham um esporte e até dez jogos; usuários cadastrados até trinta jogos de vários esportes neste navegador. As preferências de eventos/sons sincronizam; jogos acompanhados e permissões do sistema são por conta e navegador, em armazenamento separado do visitante.

Três sons originais sintetizados com Web Audio, volume e botão de teste. Áudio só começa após interação; não há áudio automático no carregamento. Deduplicação e intervalo entre sons evitam rajadas e repetição em abas. Sem login, as escolhas ficam no navegador. O som personalizado requer o site aberto e áudio liberado. Notificações do sistema usam as regras do aparelho; não é possível forçar um toque personalizado no navegador móvel. Esta etapa continua sem Web Push com o site fechado. Isso exige um emissor central e infraestrutura própria na próxima etapa; não é simulado com timers em segundo plano.

## Verificação

Testes de assinatura/issuer/audience/expiração, rejeição de chave admin e visitantes nas rotas privadas, favoritos idempotentes e limitados, isolamento por identidade, conflito entre dispositivos, recortes do resumo, distinção de canais confirmados, modos de eventos e áudio sem autoplay. Build TypeScript/Vite. Conferência das páginas públicas e da resposta 401 das APIs privadas em produção. Cadastro/login com senha e validação de e-mail precisam ser exercidos pelo titular em um dispositivo real; os testes não criam contas artificiais nem enviam códigos para terceiros.
