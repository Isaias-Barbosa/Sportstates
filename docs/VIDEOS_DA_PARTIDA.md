# Eventos e vídeos oficiais

Atualização de 26/10/2026.

- O backend classifica gol de futebol, amarelo, vermelho e segundo amarelo a partir do evento estruturado, com fallback textual PT/EN. Gols anulados não recebem a bola de gol. Eventos de pontuação em outros esportes não recebem bola de futebol.
- `/api/media?sport=...&league=...&id=...` reaproveita o resumo validado/cacheado da partida. A consulta é independente e paralela ao detalhe, sem bloquear placar ou lances.
- Consulta feeds públicos recentes de CazéTV, ESPN Brasil, Canal GOAT e TNT Sports Brasil, IDs verificados pela identidade do próprio feed. Quatro consultas paralelas com timeout de 6 segundos e cache de 10 minutos por canal. Não requer chave YouTube.
- Só considera vídeo de canal permitido com os dois nomes das equipes/aliases explícitos e publicação entre o início da partida e 72 horas depois. Melhores momentos exigem partida encerrada, título “melhores momentos”/“highlights” e publicação ao menos 70 minutos após o início. Pré-jogo e simulação são rejeitados.
- Replay de gol precisa de título de gol, dois times, minuto explícito e um único evento de gol correspondente. Sem associação inequívoca, nenhum replay é inventado.
- Feeds têm janela curta (observados 15 vídeos por canal). Isso não cobre todo o arquivo do YouTube. Ausência no feed não significa ausência de vídeo; a seção oferece busca restrita aos canais oficiais. Não há garantia de replay instantâneo nem de melhores momentos em todos os jogos.
- Players usam iframe oficial YouTube no domínio youtube-nocookie.com, após clique, sem autoplay. O vídeo não é baixado, copiado, reeditado nem retransmitido pelo servidor. Há link permanente para abrir no YouTube caso incorporação ou acesso regional sejam restritos.
- Documentação: https://developers.google.com/youtube/player_parameters
