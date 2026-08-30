# Atualização v3 — conexão Mercado Livre

Esta pasta contém os arquivos necessários para corrigir o botão **Conectar** do Luary no Railway. A versão usa o cliente tRPC tipado, valida as credenciais do marketplace e mostra uma mensagem clara quando alguma variável estiver ausente.

## Arquivos incluídos

- `client/src/pages/Marketplaces.tsx`
- `server/routers/marketplace.ts`
- `server/services/marketplaceOAuthConfig.ts`
- `server/marketplaceOAuthConfig.test.ts`
- `server/marketplace.authorization.test.ts`
- `server/_core/sdk.ts`
- `client/src/main.tsx`
- `server/auth.local.test.ts`
- `server/dbMigrations.ts`
- `server/dbMigrations.test.ts`
- `server/_core/index.ts`
- `Dockerfile`

## Importação

No repositório `luaryshop/sistema1`, branch `main`, substitua cada arquivo mantendo exatamente o caminho indicado. Não apague o repositório e não envie arquivos `.env`.

Faça um commit, por exemplo: `Fix Mercado Livre OAuth authorization flow`. O Railway deve iniciar um novo deployment automaticamente.

## Variáveis do Railway

No serviço `sistema1` em `production`, confirme as variáveis abaixo:

```text
MERCADOLIVRE_CLIENT_ID=<Client ID da aplicação Mercado Livre>
MERCADOLIVRE_CLIENT_SECRET=<Client Secret da aplicação Mercado Livre>
MARKETPLACE_REDIRECT_URI=https://sistema1-production.up.railway.app/marketplaces
MARKETPLACE_MODE=READ_ONLY
```

Os dois primeiros valores devem ser inseridos diretamente no Railway e nunca commitados no GitHub. A URL de retorno deve coincidir exatamente com a configurada na aplicação do Mercado Livre.

## Teste

Depois que o deployment estiver `Successful`, abra `/marketplaces`, faça login, clique em **Conectar** no Mercado Livre e confirme que a página oficial de autorização é aberta. Não autorize alterações fora da finalidade da homologação e não publique anúncios.
