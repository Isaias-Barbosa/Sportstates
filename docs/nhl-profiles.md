# Perfis da NHL

32 clubes ativos cadastrados em `data/nhl-profiles-2026.json`, com IDs ESPN separados pelo prefixo `hockey-nhl-`, nome, logo, cores, cidade da arena, arena, site oficial e descrição breve original em português. O catálogo inclui Utah Mammoth e não inclui a franquia inativa Arizona Coyotes.

As referências de cada perfil combinam o [diretório oficial NHL](https://www.nhl.com/info/nhl-affiliates-member-clubs), o site do clube e o perfil ESPN. O diretório central ainda apresenta nomes antigos de quatro arenas; as páginas oficiais dos clubes confirmam Lenovo Center, Grand Casino Arena, Xfinity Mobile Arena e Benchmark International Arena. Utah e Seattle têm linhas de endereço fora do padrão, conferidas individualmente. Fotos de arena e títulos ficam disponíveis para edição administrativa, sem dados inventados.

Elenco, próximos jogos, resultados e notícias reutilizam a integração ESPN existente para `hockey/nhl`. Links dos escudos e das classificações resolvem os IDs da NHL sem colisão com os demais esportes. O campo de instalação esportiva é exibido como Arena e o texto de fallback identifica hóquei no gelo.

A importação de produção `scripts/sync-nhl-profiles.mjs` é atômica e executa uma vez com a revisão `nhl-profiles-2026-v1`. Preserva cadastros existentes com `ON CONFLICT DO NOTHING` e aborta se detectar ID de outro esporte/liga. A lista de times usa uma chave de cache versionada para disponibilizar a importação imediatamente. Com Neon configurado no ambiente autorizado: `npm run db:nhl`.
