# Eventos e vídeos oficiais

Atualização de 26/10/2026.

- O backend classifica gol de futebol, amarelo, vermelho e segundo amarelo a partir do evento estruturado, com fallback textual PT/EN. Gols anulados não recebem a bola de gol. Eventos de pontuação em outros esportes não recebem bola de futebol.
- `/api/media?sport=...&league=...&id=...` reaproveita o resumo validado/cacheado da partida. A consulta é independente e paralela ao detalhe, sem bloquear placar ou lances.
- Consulta feeds públicos recentes de emissoras, clubes e ligas, IDs verificados pela identidade do próprio feed. A lista inclui CazéTV, ESPN Brasil, Canal GOAT, TNT Sports Brasil, ge tv, Liverpool, Manchester United, Bournemouth, Bundesliga, Serie A, Ligue 1, NBA, NBA Brasil, NFL e NHL. Canais de clubes/ligas são filtrados pela competição e IDs dos times da partida, mantendo no máximo oito consultas paralelas por jogo, timeout de 6 segundos e cache de 10 minutos por canal. Não requer chave YouTube.
- Só considera vídeo de canal permitido com os dois nomes das equipes/aliases explícitos e publicação entre o início da partida e 72 horas depois. Melhores momentos exigem partida encerrada, título “melhores momentos”/“highlights”/“compacto” e publicação ao menos 70 minutos após o início. Pré-jogo e simulação são rejeitados.
- Clipes oficiais de gols com ambos os times e data compatível são mostrados na aba Vídeos mesmo sem minuto no título. Ligação ao minuto a minuto exige minuto ou nome do autor que identifique um único gol. Se um jogador marca mais de um gol, os clipes sem minuto ficam na galeria. Também são aceitos títulos “GOOOOL”.
- Feeds têm janela curta (observados 15 vídeos por canal). Isso não cobre todo o arquivo do YouTube. Ausência no feed não significa ausência de vídeo; a seção oferece busca restrita aos canais oficiais. Não há garantia de replay instantâneo nem de melhores momentos em todos os jogos.
- Vídeos YouTube usam iframe oficial no domínio youtube-nocookie.com, após clique, sem autoplay. O vídeo não é baixado, copiado, reeditado nem retransmitido pelo servidor. Há link permanente para abrir no YouTube caso incorporação ou acesso regional sejam restritos.
- Documentação: https://developers.google.com/youtube/player_parameters

## Localização e caso Barcelona x Real Madrid

A aba Vídeos e o atalho abaixo do placar dão acesso aos vídeos sem percorrer toda a timeline. A fonte CazéTV confirmou no feed os vídeos de 25/10/2026: melhores momentos `kzIDaLa6sks`, compacto `FT4D91jNSCo`, gols `GeZ9xi_QPaE`, `frcNwNpltBM`, `dlqDqTFNuH8`. O caso usa a mesma descoberta automática dos outros jogos, sem inclusão manual de IDs no catálogo. Raphinha foi associado unicamente ao gol de 61 minutos; os dois gols de Mbappé ficam na galeria sem minuto atribuído.

## Diagnóstico de bloqueio e player oficial

Em 26/10/2026, o iframe de `kzIDaLa6sks` exibiu neste navegador de teste: “O vídeo não foi disponibilizado em seu país pelo usuário que fez o envio”. Esse resultado é territorial no ambiente de teste e não comprova a localização ou o erro do navegador do usuário.

O player agora usa a API oficial IFrame do YouTube para receber onError, informa a origem real da página e mantém Referrer-Policy strict-origin-when-cross-origin. Erro 153 informa falha de identificação; 101/150 informa restrição do player ou região; 100 informa indisponibilidade do vídeo. O botão de abrir no canal oficial fica destacado quando há erro. Não há proxy de mídia nem promessa de desbloqueio.

Referências: https://developers.google.com/youtube/iframe_api_reference e https://developers.google.com/youtube/terms/required-minimum-functionality

## Cobertura ampliada para jogos encerrados

- O feed curto das emissoras não contém todo o arquivo. A consulta a canais de clubes e ligas reduz essa limitação. Nomes alternativos são explícitos (Man Utd, Cherries, Brighton, FC Bayern) e, em esportes americanos, apelidos dos times são aceitos. Títulos de categorias de base e futebol feminino não são confundidos com os campeonatos masculinos cobertos.
- O resumo ESPN também pode fornecer vídeos associados diretamente ao evento. Eles aparecem em “Mais vídeos oficiais desta partida”, sem classificá-los automaticamente como melhores momentos ou gol. Somente URLs públicas MP4 de hosts ESPN conhecidos e página de origem ESPN HTTPS são aceitas; links de autenticação e hosts arbitrários são rejeitados. Reprodução é direta pelo navegador, após clique, sem proxy, download no servidor ou extração de URLs do YouTube. Se falhar, o link da publicação oficial permanece disponível.
- Os cards de jogos encerrados têm atalho para #videos. Trata-se de consulta de disponibilidade, não garantia de vídeo para todo confronto.
- Verificação real de 26/10/2026: Manchester United x Bournemouth (401879252) retornou 2 resumos oficiais dos clubes; Liverpool x Brighton (401878765), 2 resumos do Liverpool e 6 vídeos associados ESPN; Freiburg x Bayern (401884759), 2 resumos e 1 clipe da Bundesliga.
- Não existe cobertura completa de todo o arquivo histórico nem garantia de replay individual para cada gol. A ausência de vídeo continua explícita.

## Compatibilidade de incorporação

O player padrão usa youtube.com/embed; a opção “Modo de privacidade” usa youtube-nocookie.com/embed, ambos documentados pelo YouTube. O iframe é configurado com origem real, enablejsapi, política de referência e permissões antes da primeira requisição, e depois conectado à API oficial. O código de erro aparece no aviso. A alternância é manual, sem repetição automática de requisições ou alteração de localização. Nenhum desses modos garante remover restrição territorial, etária ou de incorporação do canal.
