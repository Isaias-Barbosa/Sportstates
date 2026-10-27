# Times e Neon

O Sportstates usa a variável `DATABASE_URL`, mantida somente no servidor, para armazenar perfis de times. Conecte um banco Neon Postgres ao projeto Sportstates na Vercel e configure essa variável para os ambientes desejados. A integração do Marketplace pode injetar a variável automaticamente. Não a exponha no frontend.

Para criar a tabela e importar os clubes da Série A (a operação não sobrescreve os perfis já existentes), na pasta do projeto execute:

```bash
npm install
npx vercel link
npx vercel env pull .env.local --environment=production
npm run db:setup
```

O script busca os clubes na classificação atual da ESPN e interrompe a importação se a fonte não retornar exatamente 20 clubes. A fonte pública é não oficial e pode ter indisponibilidades. Elenco, programação, escalação da última partida e notícias dependem da cobertura da fonte.

O painel usa a chave administrativa já existente (`ADMIN_ACCESS_KEY`) para o acesso único, sem criar contas públicas. Guarde essa chave e o arquivo `.env.local` em sigilo. Após conectar novas variáveis na Vercel, gere um novo deploy de produção para disponibilizá-las.
