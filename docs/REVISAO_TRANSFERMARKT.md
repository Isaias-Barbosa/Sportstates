# Revisão da integração Transfermarkt

## Problemas encontrados

- A integração dependia de `TRANSFERMARKT_API_URL=http://localhost:8000`, sem implantar esse serviço na Vercel.
- Havia fan-out de até 30 jogadores simultâneos e histórico de outros clubes sem filtro.
- Os campos `from`/`to`/`type` não correspondiam ao contrato atual `clubFrom`/`clubTo`/`transferType`.
- Falhas de todos os históricos podiam resultar em uma lista vazia aparentemente bem-sucedida.
- A busca escolhia o primeiro clube retornado, sem o usuário confirmar o time principal ou uma categoria de base.
- O fallback recebia IDs incompatíveis e o estado do seletor de fonte não atualizava a URL corretamente.
- O Docker Compose usava uma imagem não verificada e uma variável de cache que não corresponde à configuração atual do projeto.

## Correções

Python Function no mesmo projeto Vercel, SDK fixado em 5.0.0, paginação de 6 jogadores, limite de 3 consultas simultâneas de históricos por requisição, cache limitado e timeouts. Uso do leitor de elenco de baixo nível do pacote evita o fan-out interno de `club_players()`. O Node local inicia o serviço Python e oferece a mesma URL `/api/market` do deploy.

O frontend pede seleção explícita do clube nos resultados da busca, mantém IDs por provedor e expõe avisos de cobertura parcial. A fonte alternativa API-Football é selecionável, sem troca silenciosa de IDs. Taxas e valores de mercado numéricos são formatados em euros; ausência e zero não são confundidos.

A seção Ao Vivo Agora foi retirada do banner e passou a ocupar toda a largura abaixo dele. Exibe escudos maiores, nomes completos, placar, período para esportes que o usam, estádio e acesso ao minuto a minuto. Jogos futuros têm título de próximo confronto; falhas e ausência de partidas têm estados explícitos.

## Limites que permanecem

Histórico do elenco atual não cobre jogadores que já saíram e não é a janela de transferências completa do clube. Ordem por data vale por página. A fonte pode bloquear o servidor, mudar o contrato ou não informar valores. Cache de memória não é compartilhado entre instâncias e não substitui cache distribuído nem rate limit em produção com tráfego alto. Um serviço REST externo opcional v5 pode ter custo e limites próprios.

## Verificações

- 10 testes Node existentes e 8 testes Python de contrato/paginação/concorrência/cache/falhas.
- Build TypeScript/Vite.
- Busca real por Manchester United e página 1 do clube 985: 29 jogadores no elenco, 20 registros relacionados ao clube nesta página na consulta de desenvolvimento.
- Deploy e respostas da função Python são verificados novamente no ambiente Vercel após o envio.
