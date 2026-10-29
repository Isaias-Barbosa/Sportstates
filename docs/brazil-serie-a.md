# Complemento dos perfis da Série A de 2026

Revisão: `brazil-serie-a-missing-fields-2026-v1`, em 28/10/2026.

A consulta aos perfis públicos encontrou 20 clubes na Série A. Flamengo (`819`)
e São Paulo (`2026`) já tinham todos os campos preenchidos; os outros 18 tinham
somente identidade, liga e escudo. O manifesto em `data/brazil-serie-a-2026.json`
completa descrição original em português, cidade, estádio, site, cores,
principais títulos do futebol masculino e foto do estádio.

Não é um inventário exaustivo de todos os troféus de cada modalidade. Os títulos
são organizados por competição e temporadas, com conferência de conquistas
recentes em fontes oficiais quando necessário. As fontes consultadas constam de
cada perfil e são apresentadas na aba Sobre. Os participantes foram conferidos
na lista de clubes da CBF para 2026.

As fotos são da Wikimedia Commons, com licença CC BY, CC BY-SA ou CC0. O
manifesto registra fotógrafo, página original, licença e link da licença. O
crédito aparece logo abaixo da capa do time, somente enquanto a foto cadastrada
corresponder à selecionada pela revisão. Fotos podem registrar períodos
anteriores do estádio. Foram preferidas miniaturas de até 1280 pixels.

Atenção aos dados de 2026: o nome comercial da arena do Palmeiras é Nubank
Parque; o Bragantino utiliza o Cícero de Souza Marques durante as obras no Nabi
Abi Chedid; o Remo utiliza o Mangueirão na Série A e continua proprietário do
Baenão. Esses detalhes foram conferidos nas publicações dos clubes.

## Aplicação

O build de produção executa `scripts/sync-brazil-profiles.mjs`. Sem ambiente de
produção ou `--apply`, o script não acessa o banco. A aplicação é uma transação
com registro de revisão na tabela já existente `sport_profile_imports`.

Somente strings vazias/nulas ou arrays vazios são preenchidos. Os `CASE` do SQL
verificam o valor no momento da atualização, preservando inclusive edições do
admin feitas durante o build. IDs, nomes, escudos, esporte e liga não mudam.
Flamengo, São Paulo e todos os clubes de outras ligas ficam fora das atualizações.
Uma revisão aplicada nunca é reaplicada automaticamente.

Antes de executar, o script exige que os 20 IDs revisados ainda pertençam ao
futebol e à Série A. Divergências interrompem a operação sem alterar os times.
A validação do manifesto também ocorre antes da conexão com o banco.

Os caches da lista de times e do perfil usam uma nova versão de chave para
exibir os campos preenchidos após o deploy, sem esperar o cache anterior vencer.
As invalidações do admin continuam usando a mesma tag global.

Para aplicação manual autorizada com o ambiente já configurado:
`npm run db:brazil`.
