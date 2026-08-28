# Protocolo de homologação read-only — Luary

## Regra principal

O ambiente deve iniciar com `MARKETPLACE_MODE=READ_ONLY`. Nesse modo, o backend deve bloquear publicação, reativação, pausa, atualização de produto, preço e estoque. A primeira homologação real deve apenas consultar dados e gravar snapshots internos.

## Critérios internos antes da conta real

| Critério | Evidência | Estado esperado |
|---|---|---|
| Typecheck | `pnpm check` | Aprovado |
| Suíte automatizada | `pnpm test` | Todos os testes aprovados |
| Build | `pnpm build` | `dist/index.js` e `dist/worker.js` |
| Migration | `pnpm drizzle-kit migrate` em banco de homologação | Aplicada sem drift |
| Worker | `pnpm worker` em processo separado | Polling, lock, retry e encerramento gracioso |
| Secrets | Variáveis somente no servidor | Ausentes do Git e do frontend |
| Banco | Backup e restauração testados | Evidência armazenada |
| Readiness | `operations.readiness` | Banco disponível e `READ_ONLY` |

## Mercado Livre e Shopee — read-only

1. Autorizar a aplicação no portal oficial e confirmar callback, scopes, token e refresh.
2. Consultar a identidade da conta e registrar o seller/shop correto.
3. Importar um lote pequeno de anúncios pausados, preservando payload bruto, status externo e IDs.
4. Validar paginação, rate limit, retry, timeout e expiração de token.
5. Conferir categoria, atributos, marca, variações, SKU, EAN/GTIN, MPN, preço e estoque.
6. Validar URLs de imagens e vídeos sem publicar, editar ou substituir mídia externa.
7. Executar Matching 2.0, revisar conflitos e confirmar vínculos somente no banco Luary.
8. Importar pedidos em modo controlado, verificar idempotência e reservar estoque sem enviar pedidos a fornecedores.
9. Registrar todas as respostas, erros, duração, correlation ID e evidências de auditoria.

## Critérios de bloqueio

A homologação deve parar imediatamente se houver seller/shop incorreto, token sem escopo esperado, payload desconhecido, duplicidade de pedido, divergência de estoque, falha de assinatura, ausência de idempotência, retry que duplica escrita, erro de ownership ou qualquer chamada de escrita durante `READ_ONLY`.

## Escrita controlada posterior

A escrita controlada somente pode ocorrer após relatório aprovado dos testes read-only, confirmação explícita do responsável, backup recente, produto de teste isolado, Publication Gate aprovado, registro antes/depois e plano de rollback. A reativação de anúncios pausados não faz parte do primeiro teste de escrita.
