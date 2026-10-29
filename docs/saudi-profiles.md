# Perfis da Liga Saudita 2026/27

Importação dos 18 clubes da Saudi Pro League para `sport_teams` no Neon. O catálogo oficial da SPL foi cruzado com os IDs de `soccer/ksa.1` da ESPN em 29/10/2026. Os clubes promovidos incluídos são Abha, Al Faisaly e Diriyah Club. Não inclui os rebaixados de temporadas anteriores.

Fontes principais:
- Lista, estádios e perfis oficiais: https://www.spl.com.sa/en/teams
- IDs utilizados pelos placares, elencos e classificação: https://site.api.espn.com/apis/site/v2/sports/soccer/ksa.1/teams?limit=100
- Estabelecimento e origem: páginas oficiais de cada clube na SPL; SAFF para Abha; Diriyah Company para Diriyah; NEOM para a origem como Al Suqor.
- Campeonato Saudita e copas: dados históricos da RSSSF, com crédito a Atsushi Fujioka e Mohammed Qayed nos perfis; https://www.rsssf.org/tabless/sauchamp.html e https://www.rsssf.org/tabless/saucuphist.html
- Atualizações de 2026: título saudita do Al Nassr confirmado pela SPL, Copa do Rei do Al Hilal pela SAFF, bicampeonato continental do Al Ahli pela AFC.

Os textos em português foram redigidos a partir de fatos conferidos, sem copiar descrições integrais. Cada perfil contém referências. Os escudos e a cor principal vêm do cadastro oficial da SPL; cores secundárias, quando presentes, usam o catálogo ESPN. Fotos dos estádios ficam vazias por não terem sido confirmadas as permissões de reutilização. Os títulos são uma seleção verificada, não um inventário exaustivo de torneios regionais, divisões inferiores e competições extintas; ausência de um título cadastrado não afirma que o clube não tenha conquistas.

Cidades dos clubes são distintas das cidades dos estádios compartilhados quando necessário: Diriyah, Harmah, Saihat e Al Khobar não são substituídas automaticamente por Riade, Al Majma'ah ou Dammam. Estádios atuais incluem Alinma Stadium, SHG Arena, Maydan Tamweel Aloula e Wolves Park, conforme a SPL.

`data/saudi-profiles-2026.json` guarda o catálogo revisado. `server/saudi-profiles.mjs` valida os 18 IDs, liga, links, cores e títulos e seleciona apenas registros ainda ausentes. `scripts/sync-saudi-profiles.mjs` executa no build de produção ou com `npm run db:saudi` em ambiente explicitamente configurado. A revisão `saudi-pro-league-2026-27-v1` é aplicada uma vez. Inserts e a marcação de revisão pertencem à mesma transação; `ON CONFLICT DO NOTHING` protege também um cadastro feito durante o deploy. Perfis existentes não são atualizados. Colisões de ID com outro esporte ou liga interrompem a importação.

A chave do cache da lista de times foi versionada para a nova importação. As páginas de equipes já existentes usam os mesmos IDs para buscar elenco, próximos jogos, resultados, escalações e competições quando a API oferece esses dados. Nenhuma alteração visual ou de login é necessária.

Validação: testes de cobertura, ligação com jogos, dados contemporâneos, referências, segurança dos campos e preservação de edições manuais. Após o deploy, conferir os 18 perfis pela API pública e comparar os 335 registros anteriores, que devem continuar idênticos.
