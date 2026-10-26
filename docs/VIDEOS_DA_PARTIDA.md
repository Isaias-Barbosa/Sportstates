# Eventos e vídeos oficiais

Atualização de 26/10/2026.

- O backend classifica gol de futebol, amarelo, vermelho e segundo amarelo a partir do evento estruturado, com fallback textual PT/EN. Gols anulados não recebem a bola de gol. Eventos de pontuação em outros esportes não recebem bola de futebol.
- `/api/media?sport=...&league=...&id=...` reaproveita o resumo validado/cacheado da partida. A consulta é independente e paralela ao detalhe, sem bloquear placar ou lances.
- Consulta feeds públicos recentes de CazéTV, ESPN Brasil, Canal GOAT e TNT Sports Brasil, IDs verificados pela identidade do próprio feed. Quatro consultas paralelas com timeout de 6 segundos e cache de 10 minutos por canal. Não requer chave YouTube.
- Só considera vídeo de canal permitido com os dois nomes das equipes/aliases explícitos e publicação entre o início da partida e 72 horas depois. Melhores momentos exigem partida encerrada, título “melhores momentos”/“highlights”/“compacto” e publicação ao menos 70 minutos após o início. Pré-jogo e simulação são rejeitados.
- Clipes oficiais de gols com ambos os times e data compatível são mostrados na aba Vídeos mesmo sem minuto no título. Ligação ao minuto a minuto exige minuto ou nome do autor que identifique um único gol. Se um jogador marca mais de um gol, os clipes sem minuto ficam na galeria. Também são aceitos títulos “GOOOOL”.
- Feeds têm janela curta (observados 15 vídeos por canal). Isso não cobre todo o arquivo do YouTube. Ausência no feed não significa ausência de vídeo; a seção oferece busca restrita aos canais oficiais. Não há garantia de replay instantâneo nem de melhores momentos em todos os jogos.
- Players usam iframe oficial YouTube no domínio youtube-nocookie.com, após clique, sem autoplay. O vídeo não é baixado, copiado, reeditado nem retransmitido pelo servidor. Há link permanente para abrir no YouTube caso incorporação ou acesso regional sejam restritos.
- Documentação: https://developers.google.com/youtube/player_parameters

## Localização e caso Barcelona x Real Madrid

A aba Vídeos e o atalho abaixo do placar dão acesso aos vídeos sem percorrer toda a timeline. A fonte CazéTV confirmou no feed os vídeos de 25/10/2026: melhores momentos `kzIDaLa6sks`, compacto `FT4D91jNSCo`, gols `GeZ9xi_QPaE`, `frcNwNpltBM`, `dlqDqTFNuH8`. O caso usa a mesma descoberta automática dos outros jogos, sem inclusão manual de IDs no catálogo. Raphinha foi associado unicamente ao gol de 61 minutos; os dois gols de Mbappé ficam na galeria sem minuto atribuído.
