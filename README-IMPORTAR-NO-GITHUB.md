# Correção do login local no Railway

Use este pacote para atualizar o repositório `luaryshop/sistema1` na branch `main`.

## Arquivos

- `server/_core/sdk.ts`: remove o fallback de sessões locais para o OAuth da Manus.
- `client/src/main.tsx`: remove o redirecionamento automático do cliente para o portal OAuth da Manus.
- `server/auth.local.test.ts`: adiciona testes para login local, sessão persistida e ausência de chamada OAuth.
- `server/dbMigrations.ts`: aplica as migrations Drizzle no startup de produção.
- `server/dbMigrations.test.ts`: testa o bootstrap de migrations.
- `server/_core/index.ts`: executa o bootstrap antes de aceitar tráfego.
- `Dockerfile`: copia `drizzle/` para a imagem final, onde o bootstrap lê as migrations.

## Upload

No GitHub, abra o repositório `luaryshop/sistema1`, selecione a branch `main`, use **Add file → Upload files**, arraste os seis arquivos preservando os caminhos das pastas e confirme o commit. Não apague o repositório inteiro.

Depois do commit, aguarde o Railway criar um novo deployment. Confirme o status **Successful** e teste o domínio público. Mantenha `MARKETPLACE_MODE=READ_ONLY`.

Não remova as implementações OAuth dos adaptadores Mercado Livre, Shopee, Amazon ou TikTok; elas pertencem à autenticação dos marketplaces e serão usadas na homologação externa. Nunca inclua senhas, tokens ou a URL completa do MySQL no GitHub.
