# Cache de dados

Em produção usamos o Runtime Cache regional da Vercel, compartilhado entre as
instâncias da API, e respostas públicas na CDN com a tag `sportstates-api-v2`.
Localmente usamos um cache de memória limitado a 300 entradas por serviço.
Não é necessário criar tabelas no Neon nem configurar uma nova credencial.

| Recurso | Validade antes de consultar novamente a fonte |
| --- | --- |
| Classificações e fases eliminatórias | 5 minutos |
| Lista de times cadastrados | 1 hora |
| Perfil do time e suas competições | 5 minutos |
| Perfil com partida ao vivo | 30 segundos |
| Catálogo de esportes e competições na CDN | 24 horas |
| Partida ao vivo | 30 segundos |
| Partida agendada | 1 minuto |
| Partida recém-encerrada | 15 minutos |
| Partida encerrada, iniciada há mais de 6 horas | 6 horas |
| Agenda diária com jogos ao vivo | 30 segundos |
| Agenda diária com mais de 2 dias | 6 horas, exceto se a fonte indicar jogo ao vivo |
| Agenda mensal de mês passado | 6 horas, exceto se houver jogo ao vivo ou cobertura parcial |

A tela continua consultando periodicamente, respeitando esses prazos para tabelas,
times e detalhes de jogos encerrados. Ao retornar à aba, consulta novamente apenas
se o prazo já venceu. O navegador não guarda uma resposta HTTP privada que possa
sobreviver à limpeza feita no servidor. Navegar novamente pode chamar o site,
mas uma resposta válida na CDN ou no Runtime Cache evita outra chamada à API externa.

O TTL da CDN desconta a idade dos dados já guardados no Runtime Cache: os dois
prazos não se somam. Respostas com erro, cobertura parcial ou dados antigos por
falha da fonte não recebem cache na CDN. A tolerância limitada para servir dados
antigos durante indisponibilidade continua identificada pelo campo `stale`.

## Invalidação

`POST /api/admin/cache` exige a autenticação administrativa já existente (Neon
Auth ou chave administrativa). O botão **Limpar cache** está no topo do painel,
acima das abas Jogos do dia e Times. Ele limpa os caches de dados desta aplicação,
incluindo fontes auxiliares de notícias, transmissões e vídeos; não apaga
cadastros, destaques, usuários ou arquivos estáticos.

Salvar um perfil também faz a invalidação automaticamente. Uma falha na limpeza
é informada separadamente do sucesso do cadastro, permitindo tentar pelo botão.
As abas abertas no mesmo navegador recebem uma notificação para recarregar os
dados. Outros visitantes veem os dados novos na próxima consulta após a propagação
da limpeza da CDN; o site não envia uma notificação em tempo real para eles.

Uma geração aleatória compartilhada isola entradas anteriores à limpeza,
inclusive respostas que ainda estavam sendo carregadas em outra instância.
O marcador fica fora da tag purgada; se for removido por evicção, uma nova geração
é criada. O cache é descartável e pode sofrer evicção antes do TTL.

Se o serviço de cache estiver indisponível, a API ainda tenta consultar a fonte.
Não mantém um segundo cache longo em memória em produção, pois ele escaparia da
invalidação feita por outra instância. Requisições simultâneas na mesma instância
compartilham a consulta em andamento.

Referências oficiais:
- https://vercel.com/docs/caching/runtime-cache
- https://vercel.com/docs/caching/cdn-cache/purge
