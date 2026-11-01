# Cache de dados

Para evitar consumir a cota de gravações do Runtime Cache, a aplicação guarda os
valores em um LRU limitado a 300 entradas por instância. O Runtime Cache da
Vercel mantém somente a geração compartilhada usada para detectar invalidações;
não recebe cada resposta dos provedores. Respostas públicas saudáveis usam a
CDN da Vercel, com TTL curto para placares ao vivo e do dia e com a tag
`sportstates-api-v2`.

| Recurso                                        | Validade antes de consultar novamente a fonte               |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Classificações e fases eliminatórias           | 5 minutos                                                   |
| Lista de times cadastrados                     | 1 hora                                                      |
| Perfil do time e suas competições              | 5 minutos                                                   |
| Perfil com partida ao vivo                     | 30 segundos                                                 |
| Catálogo de esportes e competições na CDN      | 24 horas                                                    |
| Partida ao vivo                                | 30 segundos                                                 |
| Partida agendada                               | 1 minuto                                                    |
| Partida recém-encerrada                        | 15 minutos                                                  |
| Partida encerrada, iniciada há mais de 6 horas | 6 horas                                                     |
| Agenda diária com jogos ao vivo                | 15 segundos na CDN                                          |
| Agenda diária sem jogo ao vivo                 | 1 minuto na CDN                                             |
| Agenda diária com mais de 2 dias               | 6 horas, exceto se a fonte indicar jogo ao vivo             |
| Agenda mensal de mês passado                   | 6 horas, exceto se houver jogo ao vivo ou cobertura parcial |

A validade da CDN desconta a idade dos dados no LRU local; os prazos não se
somam. Respostas com erro, cobertura parcial ou dados antigos por falha da fonte
não recebem cache na CDN. A tolerância limitada para servir dados antigos durante
indisponibilidade continua identificada pelo campo `stale`.

O LRU e a deduplicação de consultas simultâneas funcionam por instância. Cold
starts e escalabilidade horizontal podem repetir chamadas aos provedores; a CDN
reduz repetições para respostas públicas idênticas, mas não equivale a um cache
compartilhado de dados entre funções.

## Invalidação

`POST /api/admin/cache` exige a autenticação administrativa já existente (Neon
Auth ou chave administrativa). O botão **Limpar cache** está no topo do painel,
acima das abas Jogos do dia e Times. A limpeza descarta os LRUs da instância
atual, atualiza a geração compartilhada e purga respostas da CDN com a tag
`sportstates-api-v2`. Não apaga cadastros, destaques, usuários ou arquivos
estáticos.

Salvar um perfil também faz a invalidação automaticamente. Uma falha na limpeza
é informada separadamente do sucesso do cadastro, permitindo tentar pelo botão.
As abas abertas no mesmo navegador recebem uma notificação para recarregar os
dados. Outras instâncias detectam a geração nova na próxima consulta.

O marcador de geração não tem TTL e fica fora da tag purgada. Se for removido por
evicção, cada instância descarta seus dados locais quando detectar a mudança.
Se o Runtime Cache estiver indisponível, a API ainda consulta a fonte, mas não
retém valores locais que uma invalidação remota não conseguiria alcançar.

## Alternativas avaliadas

| Opção                          | Plano grátis / consideração                                                                                                                                                                                               | Decisão                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Vercel CDN + LRU por instância | Sem novo provedor ou credencial; não oferece compartilhamento do LRU entre funções.                                                                                                                                       | Adotada para evitar cobrança inesperada e parar gravações de respostas no Runtime Cache. |
| Upstash Redis REST             | Free: US$ 0, 250 MB, 10 GB de tráfego e 500 mil comandos/mês. GETs e SETs contam; o plano Pay as You Go custa US$ 0,20 por 100 mil comandos. A cota precisa ser comparada com leituras e gravações reais antes de migrar. | Alternativa futura se métricas justificarem um cache compartilhado.                      |
| Cloudflare Workers KV          | Free: 1.000 gravações e 100.000 leituras por dia. O volume atual de 200 mil gravações/mês equivale a cerca de 6.700/dia, acima da cota grátis.                                                                            | Não adotada para este volume sem orçamento aprovado.                                     |
| Neon/Postgres                  | Já usado para perfis, mas transformar cada consulta de cache em operação no banco pode aumentar compute e carga.                                                                                                          | Não adotada sem medir custo e impacto no banco.                                          |

O Runtime Cache da Vercel é regional e efêmero. A estratégia foi alterada para
reduzir gravações sem adicionar serviço pago ou credenciais. Acompanhe também o
tráfego da CDN e as chamadas às fontes após o deploy; se a carga em instâncias
frias ficar alta, compare métricas antes de escolher um cache compartilhado.

## Referências

- [Vercel Runtime Cache](https://vercel.com/docs/caching/runtime-cache)
- [Vercel CDN Cache e invalidação por tag](https://vercel.com/docs/caching/cdn-cache/purge)
- [Upstash Redis: preços](https://upstash.com/pricing/redis)
- [Cloudflare Workers KV: preços](https://developers.cloudflare.com/kv/platform/pricing/)
- [upstash/redis-js](https://github.com/upstash/redis-js): cliente Redis via HTTP para runtimes serverless.
- [upstash/redis-examples](https://github.com/upstash/redis-examples): exemplos públicos de Redis serverless; repositório arquivado, útil apenas como referência.
- [cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk): Wrangler e ferramentas abertas para Workers; usar KV exige hospedar no ecossistema Cloudflare.
