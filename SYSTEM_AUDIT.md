# SYSTEM_AUDIT — Luary Marketplace Command Center

**Data:** 26/08/2026  
**Escopo:** auditoria do estado interno antes da homologação externa  
**Referência:** Gabarito Mestre — Luary Marketplace Command Center

## Resumo executivo

A base atual é um monorepo React/Vite/TypeScript com API tRPC, Drizzle/MySQL, autenticação, produtos, anúncios, pedidos, conexões, adapters, precificação, SEO, mídia, variações, fila inicial, webhooks e telas administrativas. Typecheck, build e os 12 testes existentes passam.

O sistema **não deve ainda ser tratado como 100% concluído**. A fundação está aproveitável, porém existem lacunas de domínio que precisam ser fechadas antes de uma operação comercial real: identificadores separados, movimentações de estoque, conflitos, auditoria completa, ofertas por variante/canal, rate limit, reconciliação de pedidos, lifecycle logístico, analytics, IA comercial, automações reversíveis e RBAC granular.

## Bloqueadores críticos

| Área | Situação | Risco | Ação obrigatória |
|---|---|---|---|
| Dados de produção | Migrations foram geradas, mas ainda dependem de aplicação em banco real | Falha de inicialização ou perda de consistência | Aplicar migrations em ambiente controlado e testar restauração |
| Worker | Existe processamento inicial de fila, mas falta execução persistente de produção | Estoque/preço/pedidos podem ficar desatualizados | Configurar processo persistente ou scheduler confiável |
| Marketplace | Adapters e endpoints precisam de validação com credenciais reais | Operação externa pode falhar por payload ou limite específico | Homologar por etapas, sem publicação automática |
| Estoque | Reserva existe, mas movimentação contábil completa ainda não existe | Overselling, baixa incorreta e divergência | Implementar ledger de movimentações e transações atômicas |

## Lacunas de alta prioridade

| Módulo | Lacuna identificada |
|---|---|
| Produto mestre | Faltam campos comerciais/logísticos/fiscais completos, como preço-base separado de custo, dimensões, NCM/CEST/origem e dados de fornecedor |
| Identificadores | SKU está distribuído em produtos/variantes; falta entidade `productIdentifiers` com unicidade por tipo/valor |
| Mídia | Biblioteca existe, mas falta associação formal por variante/oferta, thumbnail/processamento, upload múltiplo e validações de tamanho/formato |
| Ofertas | `marketplaceListings` ainda não representa completamente uma oferta por variante/canal; faltam preço promocional, categoria, syncStatus e conflitos |
| Matching | A prévia e o vínculo existem, mas falta motor de matching por níveis, confiança configurável e centro de conflitos |
| Estoque | Faltam `inventoryMovements`, depósitos, estoque de segurança, bloqueio preventivo e reconciliação de saldo |
| Pedidos | Faltam estados operacionais completos, taxas, frete, tracking, devolução, cancelamento e reconciliação de alterações |
| Sincronização | Faltam rate limit, dead-letter explícito, versionamento de payload, lock robusto e idempotência externa por operação |
| Segurança | Falta RBAC por módulo/permissão, validação de corpo bruto dos webhooks em todos os proxies e rate limiting por endpoint |
| Auditoria | `syncLogs` não substitui `auditLogs` de alterações antes/depois, usuário, origem, IP e resultado |
| Conflitos | Ainda falta persistência e resolução formal de divergências entre Luary e marketplace |

## Lacunas de média prioridade

Ainda precisam ser construídos o editor multimarketplace completo, a central de ofertas com filtros operacionais, páginas administrativas de mídia e variantes, dashboard de saúde, analytics de vendas e rentabilidade, Marketplace Brain, regras automáticas com reversão, Copilot com dados reais, importação/exportação de variantes e tela de checklist de homologação.

## Estado por critério do Gabarito Mestre

| Critério | Estado |
|---|---|
| Produto mestre | Parcialmente funcional |
| Variações | CRUD inicial funcional |
| SKU/EAN/GTIN | SKU funcional; entidade de identificadores pendente |
| Mídia e vídeo | Estrutura inicial; fluxo operacional incompleto |
| SEO | Perfil, score e JSON-LD inicial funcionais |
| Importação | Prévia e vínculo inicial funcionais; staging/matching avançado pendentes |
| Ofertas | Estrutura inicial; editor e divergências pendentes |
| Preço | Serviço existente; composição completa de custos pendente |
| Estoque | Reserva e disponibilidade iniciais funcionais; ledger pendente |
| Pedidos | Importação e reserva inicial funcionais; lifecycle completo pendente |
| Webhooks | Ingestão, assinatura configurável e deduplicação iniciais |
| Fila/retry | Worker inicial funcional; execução persistente e rate limit pendentes |
| Auditoria | Logs de sincronização; auditoria de alterações pendente |
| Analytics/IA/automação | Ainda não completos |
| Testes | 12 testes passando; cobertura de domínio insuficiente |
| Build | Passando |
| Homologação externa | Deliberadamente pendente |

## Ordem segura de continuação

1. Criar identificadores, ledger de estoque, conflitos e auditoria.
2. Evoluir ofertas para produto/variante/canal e concluir editor.
3. Fechar pedidos, logística, cancelamentos, devoluções e reconciliação.
4. Reforçar worker, rate limit, dead-letter e observabilidade.
5. Completar precificação, analytics, automações e IA assistiva.
6. Concluir testes de domínio, integração e recuperação.
7. Somente então iniciar homologação externa por leitura/importação, estoque/preço, pedidos/webhooks e, por último, reativação/publicação.

## Validação realizada

- `pnpm check`: aprovado.
- `pnpm test`: 5 arquivos e 12 testes aprovados.
- `pnpm build`: aprovado.
- `drizzle-kit generate`: migrations geradas sem erro.

## Regra de não regressão

Nenhuma migração deve remover dados existentes. Toda evolução de tabela deve manter compatibilidade, ser acompanhada de migration, atualizar backend e frontend, e receber testes antes da próxima fase.
