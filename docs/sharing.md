# Prévias de compartilhamento

A home estática já inclui sua prévia no arquivo gerado pelo Vite, mantendo o carregamento direto pelo CDN. As demais URLs públicas recebem Open Graph e Twitter Cards no HTML inicial, sem depender de JavaScript executado por robôs. A função api/share.mjs injeta os metadados no index.html produzido pelo Vite, preservando os bundles e a navegação React.

Home: arte original de placar, fundo azul e verde vivo, slogan "O jogo acontece aqui". Times: nome e resumo do perfil cadastrado. Partidas: nomes, competição e placar/status quando disponíveis. Classificações e listas de times preservam sport e league. Filtros de data/status/temporada são mantidos; parâmetros de rastreamento e fragmentos saem da URL canônica.

api/share-image.mjs gera PNG RGB real de 1200×630 com desenho e lettering próprios; sem fontes externas, proxy ou serviço de imagens. A imagem e os metadados consultam o mesmo resolvedor. Consultas de prévia usam apenas os dados essenciais, sem carregar vídeos, transmissões ou notas dos jogadores. Banco e fontes esportivas são limitados por tempo e têm fallback para prévia contextual. Nenhum placar é inventado quando indisponível.

As imagens e os cartões de terceiros podem permanecer no cache do WhatsApp, Facebook, Discord e outros. Uma prévia de placar é um retrato do momento da consulta, não um placar ao vivo. A exibição final depende do aplicativo. Nenhuma garantia de atualização de mensagens já enviadas.

Validação: sete testes de contexto, escape HTML, URL canônica e estrutura/scanlines do PNG. O build da Vercel executa a suíte antes da publicação com VERCEL=0 apenas no processo de testes, isolando os mocks do Runtime Cache de produção.
