# Painel de jogos

- Acesse `/admin/jogos` pelo menu Administração, informe `ADMIN_ACCESS_KEY` e selecione uma data ou esporte.
- Em Opções, clique em Editar e marque Jogo do Dia. Existe um único destaque por dia; marcar outro substitui o atual. Desmarcar o atual remove o destaque.
- A home consulta o destaque por data e o utiliza somente em Todos os esportes. Se não houver seleção válida no placar da data, continua o destaque automático. A escolha pode ser uma partida encerrada, ao vivo ou futura.
- A seleção é armazenada em Blob privado (`featured/AAAA-MM-DD.json`), consultado sem cache no servidor. Atualização no navegador ocorre em até 30 segundos. Autorização é checada no servidor em cada escrita; a chave permanece somente em memória no navegador durante a sessão.
- A variável `ADMIN_ACCESS_KEY` é configurada na Vercel e não é exposta no código. Para recuperá-la localmente, vincule o projeto com `npx vercel link`, depois execute `npx vercel env pull .env.local --environment=production` e consulte a variável em `.env.local` localmente. Nunca compartilhe este arquivo. Para trocar a chave, altere a variável no painel Vercel e faça um novo deploy.
- O token de Blob é provisionado pela conexão do armazenamento. Para rodar o painel localmente, use as duas variáveis do projeto, sem versionar o arquivo `.env`.
- A chave deve ser aleatória e ter no mínimo 32 caracteres. Esta é uma solução de acesso único, sem cadastro individual ou auditoria por usuário. Para vários administradores, implemente autenticação individual e armazenamento com controle de concorrência.
