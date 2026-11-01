# Competições e clubes das Américas

## Competições domésticas

Os torneios abaixo usam os feeds públicos da ESPN e só aparecem em
Classificações depois de ao menos uma partida da edição corrente estar marcada
como iniciada ou concluída:

| País      | Competição              | ESPN                                             |
| --------- | ----------------------- | ------------------------------------------------ |
| Argentina | Copa Argentina          | `arg.copa`                                       |
| Argentina | Trofeo de Campeones     | `arg.trofeo_de_la_campeones`                     |
| Argentina | Supercopa Argentina     | `arg.supercopa`                                  |
| Argentina | Supercopa Internacional | `arg.supercopa.internacional`                    |
| México    | Campeón de Campeones    | `mex.campeon`                                    |
| Colômbia  | Copa Colombia           | `col.copa`                                       |
| Colômbia  | Superliga Colombiana    | `col.superliga`                                  |
| Chile     | Copa Chile              | `chi.copa_chi`                                   |
| Chile     | Supercopa               | `chi.super_cup`                                  |
| Equador   | Copa Ecuador            | `ecu.copa_2026` · calendário oficial da FEF      |
| Equador   | Supercopa Ecuador       | `ecu.supercopa_2026` · calendário oficial da FEF |

A checagem consulta o calendário da edição corrente e só mostra a competição
depois de uma partida concluída ou em andamento. O resultado é atualizado em
cache de uma hora. Se a fonte não responder, o torneio não é apresentado e a
tela informa que não foi possível confirmar o início. Copas descontinuadas,
como Copa MX e Copa de la Superliga, não são tratadas como torneios atuais.

Os dados equatorianos vêm dos endpoints públicos da Federação Equatoriana de
Futebol (FEF), não da ESPN. A Recopa de Campeones argentina ainda não tem uma
edição com calendário verificável; também não foi encontrada fonte atual
verificável para a Copa Uruguay. Essas competições não são simuladas nem
apontadas para ligas diferentes.

## Perfis de clubes 2026

`data/americas-club-profiles-2026.json` contém 182 IDs ESPN sem duplicidade:
116 clubes das seis primeiras divisões e participantes exclusivos da Copa
Argentina, Copa Colombia e Copa Chile. Elencos, IDs, escudos, estádios e cores
foram obtidos dos endpoints públicos de equipes e placares da ESPN.
`data/ecuador-cup-clubs-2026.json` acrescenta 35 clubes participantes da Copa
Ecuador que não estão na LigaPro 2026; os 16 clubes em comum reutilizam seus
IDs ESPN. Esses perfis usam IDs `fef-*` e os dados de equipe/escudo do feed
público da FEF.

Cada perfil tem referências para a página ESPN do clube e uma busca pública do
estádio no Google Maps. O campo de imagem do estádio fica vazio quando não há
imagem pública/licenciada verificada; não são usados links de imagem
inventados. Alguns clubes de copas inferiores não tiveram estádio identificado
nos placares consultados, e alguns escudos não estão publicados pela ESPN.

Para gerar novamente o snapshot de 2026:

```powershell
node scripts/sync-americas-club-profiles.mjs --snapshot
```

Para importar a revisão no Neon sem sobrescrever dados preenchidos manualmente:

```powershell
npm run db:americas-profiles
```

A revisão é aplicada uma única vez por meio de `sport_profile_imports`. O
importador preserva dados existentes, interrompe em colisões com IDs de outros
esportes e confere as quantidades por liga antes de concluir.

Para importar os clubes exclusivos da Copa Ecuador:

```powershell
npm run db:ecuador-cup-clubs
```

O importador também é idempotente e não substitui informações preenchidas
manualmente. Quando a FEF não publica o estádio de um participante, o campo
permanece vazio; o perfil mantém uma busca pública do clube como referência, sem
inventar localização ou imagem de estádio.
