# Executar, testar e publicar o Luary Shop ERP

## O que o sistema precisa

Este é um app full-stack: frontend React, API Node/Express/tRPC, banco MySQL compatível com MySQL e um worker de sincronização. Não publique apenas a pasta estática `dist/public`. Não use filesystem local da hospedagem como banco. Mantenha `MARKETPLACE_MODE=READ_ONLY` enquanto estiver homologando.

## Testar localmente

Requisitos: Node.js 20 ou 22 e pnpm 10.

```bash
pnpm install --frozen-lockfile
cp env.sample.txt .env
```

Edite `.env` com um banco MySQL de teste e valores próprios para `DATABASE_URL`, `JWT_SECRET` (aleatório, pelo menos 32 caracteres), `ENCRYPTION_KEY` (exatamente 32 caracteres) e `ADMIN_PASSWORD`. Não use dados/credenciais de produção para testar. Em seguida:

```bash
pnpm check
pnpm test
pnpm build
pnpm dev
```

Abra `http://localhost:3000`. Sem um banco válido, a tela pode abrir, mas login e dados do ERP não funcionarão. Não comite `.env`.

## Alternativas de hospedagem

### Prova de conceito sem custo: Render Free + TiDB Cloud Starter

O Render Free aceita serviços Node, mas suspende o serviço após 15 minutos sem tráfego, o que pode levar cerca de um minuto para despertar. O filesystem é efêmero, e o próprio Render desaconselha o plano gratuito para produção. O Postgres grátis oferecido pelo Render não serve diretamente a este app MySQL, e também expira após 30 dias. O TiDB Cloud Starter oferece compatibilidade MySQL e cota gratuita inicial (5 GiB de armazenamento por linha e 50 milhões de Request Units mensais), mas bloqueia novas conexões ao atingir a cota. Use essa combinação apenas para teste/homologação, sem pedidos reais ou dependência comercial.

No serviço web Render, configure:

- Build Command: `corepack enable && pnpm install --frozen-lockfile && pnpm build`
- Start Command: `pnpm start`
- Health check path, se disponível: `/`
- Root directory: raiz deste repositório

Configure secrets no painel do serviço, não no Git. Valores mínimos de produção: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `ADMIN_PASSWORD`, `OWNER_NAME` e `MARKETPLACE_MODE=READ_ONLY`. Ajuste `PUBLIC_STORE_URL` à URL pública real. Antes de usar TiDB, confirme no painel o formato de URL MySQL com TLS aceito pela versão/driver `mysql2` deste projeto.

### Para produção e início de vendas

Escolha um serviço Node que permaneça ativo e um banco MySQL gerenciado com backups e TLS. Compare preço total, incluindo servidor, banco, armazenamento, tráfego e backups. A alternativa Fly.io tem cobrança por recurso, sem free tier permanente; suas tabelas oficiais informam preço a partir de US$2,19 por uma VM de 256 MB sempre ligada, mas Managed Postgres parte de US$38/mês e não substitui o MySQL do app. A região e os recursos necessários podem elevar o custo. Outro serviço MySQL gerenciado compatível também pode ser usado.

Não existe implantação automática ou conta de hospedagem conectada neste projeto. A publicação exige uma conta escolhida, credenciais de banco e configuração de secrets. Antes de considerar produção, teste migrações e restauração do backup em banco separado, confirme acesso HTTPS/domínio, e mantenha os marketplaces em `READ_ONLY` até concluir a homologação documentada em `HOMOLOGATION_READONLY_CHECKLIST.md`.

## Worker

O processo de interface/API e o worker são separados. O worker em modo contínuo exige processo ativo. Para teste, não o habilite sem credenciais e banco configurados. Se usar jobs agendados com `WORKER_MODE=once`, valide duração, retries e frequência antes de depender deles. Evite executar mais de um worker sem confirmar as garantias de lock/idempotência.

## Limites comerciais conhecidos

O app não equivale a uma loja pronta para receber pagamento online: confirme se o fluxo de pagamento, frete, emissão fiscal, políticas comerciais, suporte e segurança de dados estão cobertos pela operação pretendida. As notas do projeto identificam mapeamento de categorias/atributos ainda simplificado e conectores de marketplace sem homologação real. Não publique anúncios nem ative sincronizações de escrita até cumprir o protocolo read-only e a aprovação controlada.
