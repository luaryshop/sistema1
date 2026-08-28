# Progresso de desenvolvimento — Central Luary

## Entrega 1 — Base omnichannel

Implementado:

- Correção de isolamento por usuário no serviço de publicação de produtos.
- Correção de isolamento por usuário no acesso a conexões durante atualização de preço e estoque.
- Correção de identificação de pedidos por usuário e conexão do marketplace.
- Correção de autorização no update de status de pedido.
- Novas tabelas para biblioteca de mídia, variações, atributos, sobrescritas por canal, jobs de sincronização e eventos de webhook.
- Índices únicos para idempotência de jobs e deduplicação de eventos.
- API protegida para listar, adicionar e remover mídia de produtos.
- API protegida para enfileirar e consultar jobs de sincronização.
- Contrato de adaptadores ampliado para leitura de anúncios existentes.
- Prévia de anúncios do Mercado Livre com dados de título, SKU, GTIN, preço, estoque, status, categoria, marca, imagens e atributos.
- Prévia de anúncios da Shopee com dados equivalentes quando a conta estiver conectada e autorizada.
- Contrato de adaptadores ampliado com `listListings`, mantendo falha explícita para canais ainda não suportados.
- Worker inicial da fila para jobs de preço e estoque, com lock, tentativas, backoff e falha terminal após cinco tentativas.
- Nova tela `/omnichannel` para biblioteca de mídia, jobs, processamento da fila e prévia de anúncios existentes.
- Migration Drizzle gerada para o novo modelo.

## Validação

- Typecheck: aprovado.
- Testes automatizados existentes: 12 aprovados em 5 arquivos.
- Build de produção: aprovado.

## Entrega 2 — Sincronização e SEO avançado

Nesta etapa foi implementada a confirmação de vínculo de um anúncio externo ao produto mestre, preservando o ID do anúncio e sem criar uma nova publicação. A interface `/omnichannel` agora permite selecionar o produto mestre e confirmar o vínculo de cada anúncio consultado.

Também foi implementado o worker da fila para atualizações de preço, estoque e importação de pedidos, com lock, tentativas, backoff e falha terminal. O servidor passou a receber eventos em `/api/webhooks/:marketplace/:connectionId`, validar assinatura quando configurada, deduplicar eventos e encaminhar o processamento para a fila.

Foi adicionado o módulo `/seo-avancado`, com perfis por produto e canal, título SEO, meta description, palavra-chave principal, palavras secundárias, slug, alt text, URL canônica, score explicável, lista de pendências e geração de JSON-LD Product. O schema inclui perfil SEO por canal.

## Validação

A migration `0003_violet_inhumans.sql` foi gerada para o perfil SEO. Typecheck, 12 testes automatizados e build de produção foram executados com sucesso.

## Entrega 3 — Camada interna completa antes da homologação

A camada interna agora inclui reservas de estoque por produto e variante, cálculo de estoque disponível, confirmação/liberação/expiração de reservas e integração da importação de pedidos com vinculação automática por SKU quando houver correspondência. Reservas insuficientes não permitem consumir estoque disponível e reservas expiradas podem ser liberadas pelo endpoint protegido de inventário.

A loja pública interna foi preparada com escopo configurável por `PUBLIC_STORE_USER_ID` e `PUBLIC_STORE_URL`. Foram adicionados `/sitemap.xml`, `/robots.txt`, `/api/public/products/:slug` e renderização HTML de produto em produção. Produtos com variantes geram JSON-LD `ProductGroup` com `hasVariant`, `variesBy`, SKU, oferta, preço e disponibilidade; produtos simples geram JSON-LD `Product` e `Offer`.

As telas administrativas de omnichannel e SEO avançado continuam disponíveis em `/omnichannel` e `/seo-avancado`. A API de vinculação, fila, webhooks, estoque reservado e perfis de SEO permanece protegida por usuário.

## Entrega 4 — Módulos internos administrativos

Foram adicionados CRUD de variantes e atributos, ferramentas protegidas de exportação e importação de catálogo, painel de operações com jobs, logs, webhooks e reservas, além de reprocessamento de jobs falhos. A API agora está organizada em módulos separados para omnichannel, SEO avançado, inventário, catálogo enriquecido, ferramentas de dados e operações.

As novas rotas administrativas são `/omnichannel`, `/seo-avancado` e `/operacoes`. As rotas públicas ficam condicionadas à configuração da loja e não expõem produtos quando `PUBLIC_STORE_USER_ID` não está definido.

## Alinhamento ao Gabarito Mestre — execução atual

O documento `SYSTEM_AUDIT.md` registra a auditoria oficial e a ordem segura de evolução. Nesta entrega foram adicionados: `productIdentifiers` com unicidade por conta; `listingImportStaging` para importação não destrutiva; staging persistente de anúncios; matching inicial por SKU, EAN/GTIN e título com confiança; `inventoryMovements` com bloqueio de saldo negativo; `syncConflicts` com resolução protegida; `auditLogs` com snapshots antes/depois; associação de mídia por variante; preço de venda separado de custo; e campos logísticos/fiscais básicos no produto mestre.

Novas APIs internas: `marketplace.stageListings`, `marketplace.listStagedListings`, `marketplace.analyzeStagedMatch`, `identifiers.list/add/remove`, `inventoryMovements.applyMovement`, `conflicts.list/resolve` e `dataTools.exportCatalog/importCatalog`. Nenhuma dessas operações publica ou reativa anúncios automaticamente.

## Execução do Gabarito Mestre — última atualização

O núcleo interno recebeu identificadores por produto/variante, staging persistente de importação, matching inicial com confiança, ledger de movimentações, conflitos resolvíveis, auditoria de alterações, associação de mídia por variante, campos de preço de venda separados de custo e rate limiter no worker. Também foram adicionados testes de estoque/rate limit; o conjunto passou de 12 para 14 testes aprovados.

A regra operacional permanece: importar e analisar primeiro; vincular e unificar depois; editar em seguida; sincronizar/publicar somente após validação explícita. Não foram realizadas chamadas de publicação ou reativação de anúncios nesta etapa.

## O que ficou para a homologação externa

A próxima fase deve usar contas autorizadas reais para confirmar os contratos específicos de assinatura, paginação, categorias, atributos, imagens, variações, pedidos, limites e reativação de anúncios do Mercado Livre e da Shopee. Também será necessário configurar execução persistente/agendada do worker em produção, pois a infraestrutura local fornece o processamento manual e a base durável, mas não deve ser tratada como worker de produção permanente.


## Hardening comercial — segunda auditoria

A auditoria crítica apontou riscos reais de publicação. Nesta rodada, o fluxo de publicação passou a usar `basePrice` como preço de venda, mantendo `costBase` como custo. Foi criado o `Publication Gate`, que registra o preflight e bloqueia publicação sem SKU, preço de venda, categoria mapeada, imagem pronta, conexão válida ou conflito aberto.

Foi criado o resolvedor/validador de mídia e o publisher passou a buscar imagens prontas da biblioteca. Também foram criadas as entidades e APIs de `marketplaceCategoryMappings`, `marketplaceAttributeMappings` e `publicationPreflightResults`, eliminando a categoria fixa do Mercado Livre e a categoria zero da Shopee no caminho de publicação. Os atributos do catálogo são traduzidos pelo `Attribute Mapping Engine`.

O contrato monetário da Shopee foi corrigido para manter centavos internamente e converter para decimal somente nas operações externas de publicação, atualização e leitura de pedidos. Ofertas passaram a aceitar `variantId`, e variantes receberam `mpn`, `costBase` e `weightBase`.

Foi adicionada cobertura de hardening para validação de mídia. Validação desta rodada: typecheck aprovado, 7 arquivos de teste aprovados, 16 testes aprovados e build aprovado. A migration incremental foi gerada como `0002_married_agent_brand.sql`.

## Hardening operacional e webhooks

O worker agora pode ser compilado e executado como processo persistente (`pnpm worker`), com polling configurável por `WORKER_INTERVAL_MS`, lote configurável por `WORKER_BATCH_SIZE`, varredura de usuários e encerramento gracioso via SIGINT/SIGTERM. O build gera `dist/worker.js` separado do servidor HTTP.

A ingestão de webhooks deixou de converter qualquer evento não reconhecido em estoque. O roteador classifica explicitamente pedidos, pagamentos, envios, cancelamentos e devoluções como reconciliação de pedidos; preço como atualização de preço; estoque/inventário/anúncio como atualização de estoque; e eventos desconhecidos como auditados sem job automático. Foram adicionados testes para essas garantias.

O adapter TikTok também deixou de usar `category_id: 0` e `brand_id: 0` na publicação, exigindo categoria e marca disponíveis no payload e convertendo centavos para decimal.

Validação final desta rodada: typecheck aprovado, 8 arquivos de teste aprovados, 19 testes aprovados, build aprovado com `dist/index.js` e `dist/worker.js`.


## Fase 2 — Mercado Livre Import Center

A importação read-only foi evoluída para um fluxo operacional de Import Center. O botão de importação consulta os anúncios pelo adapter, preserva o payload e o status externo no `listingImportStaging`, e não chama endpoints de publicação, edição ou reativação.

O Matching 2.0 agora considera SKU/código interno, EAN/GTIN, MPN, identificadores persistidos, título normalizado, marca e atributos. A classificação é persistida no staging como `exact`, `probable`, `conflict` ou `unmatched`. Apenas correspondências exatas ou prováveis podem usar o vínculo sugerido; conflitos e ausência de match exigem revisão humana.

Foi criado o vínculo seguro `marketplace.linkStagedListing`, que transforma o anúncio importado em oferta interna preservando `marketplaceListingId`, preço, estoque e status pausado/ativo. Essa operação altera somente o banco do Luary e nunca publica, edita ou reativa o anúncio externo.

A tela `/omnichannel` passou a exibir resumo das classes de matching, consulta read-only, importação para staging, recálculo do matching e vínculo revisado ao Produto Mestre. Foi gerada a migration `0003_red_infant_terrible.sql` para os campos persistidos de classificação.

Validação desta etapa: migration gerada sem divergência, typecheck aprovado, 8 arquivos de teste e 19 testes aprovados, build de produção aprovado.

## Fase 2 — fechamento do Import Center

O Import Center recebeu as ações de `Revisar` e `Ignorar`, além do vínculo seguro de ofertas a partir do staging. A revisão altera apenas o status interno do registro; a ação de ignorar também não executa nenhuma chamada externa. O vínculo exige que o registro pertença ao usuário atual e bloqueia classes `conflict` e `unmatched`.

A regra de preservação foi mantida: anúncios pausados ou ativos são importados como dados e ofertas internas, conservando o ID externo e o status recebido. Não há reativação, publicação ou edição no marketplace durante a Fase 2.

Validação após o fechamento: `pnpm check` aprovado, 8 arquivos de teste e 19 testes aprovados, `pnpm build` aprovado com servidor e worker compilados.

## Fase 2.1 — Matching & Import Safety

A microfase de segurança foi concluída. Matches `probable` agora exigem `status=reviewed` no backend antes de qualquer vínculo; `conflict` e `unmatched` continuam bloqueados. O endpoint de vínculo também valida que `variantId`, quando informado, pertence simultaneamente ao usuário e ao Produto Mestre selecionado.

O contrato `ImportedListing` foi formalizado com `internalCode` e `mpn`. O staging passou a persistir `matchEvidence` e `matchCandidates`, incluindo similaridade de título, coincidência/conflito de marca e atributos, além da diferença de score para o segundo candidato.

Foi criada a suíte `server/matchingService.test.ts` com cobertura da política comercial de classes e revisão obrigatória. A interface mantém matches revisados visíveis para permitir o vínculo posterior, sem remover o registro da fila antes da decisão final.

Validação final da Fase 2.1: migration sem novas divergências, typecheck aprovado, 9 arquivos de teste e 23 testes aprovados, build de produção aprovado.

## Fase 2.2 — Safety Mode para homologação Mercado Livre

Foi adicionada a trava arquitetural `MARKETPLACE_MODE`, com padrão seguro `READ_ONLY`. Nesse modo, publicação, atualização de produto, preço, estoque e pausa/ativação são bloqueadas no backend, independentemente da interface. A escrita externa somente pode ser liberada com `MARKETPLACE_MODE=LIVE` configurado explicitamente após a homologação.

A configuração foi documentada em `env.sample.txt`. Foi adicionada cobertura específica em `server/marketplaceSafety.test.ts`, incluindo o padrão READ_ONLY, bloqueio das operações comerciais e liberação somente no modo LIVE.

Validação: typecheck aprovado, 10 arquivos de teste e 26 testes aprovados, build de produção aprovado com servidor e worker compilados.

## Correção do preview de visualização

O acesso ao preview inicialmente falhava porque o servidor havia sido iniciado sem `JWT_SECRET`, `DATABASE_URL` e `ENCRYPTION_KEY`; a senha estava correta, mas a sessão não podia ser assinada. Foi criado um banco MariaDB temporário, o baseline foi aplicado e o preview foi reiniciado com essas variáveis e `MARKETPLACE_MODE=READ_ONLY`.

Durante a aplicação do baseline foi encontrado e corrigido um problema real de compatibilidade: quatro nomes de foreign keys excediam o limite de identificadores do MariaDB. As constraints foram encurtadas no `0000_absurd_hydra.sql` sem alterar a relação entre tabelas.

O login foi testado com sucesso no endereço público temporário e a tela Command Center carregou corretamente.


## Supply Engine — S1 a S3 (entrega incremental)

Foi adicionado o primeiro núcleo do LUARY SUPPLY ENGINE sem duplicar Produto Mestre, Ofertas, SEO, Inventory Ledger ou Publication Gate. A migration `0005_mysterious_quentin_quire.sql` adiciona fornecedores, integrações com credenciais criptografadas, catálogo de fornecedor, mappings revisáveis, políticas de roteamento primário/backup, histórico de custo e estoque, alertas, purchase orders, itens de purchase order, grupos de fulfillment, itens de fulfillment, devoluções e snapshots de saúde do fornecedor.

Foram criados `server/supply/engines.ts`, `server/supply/engines.test.ts`, `server/suppliers/supplierService.ts` e `server/sourcing/supplierMatchingService.ts`. O núcleo calcula Landed Cost, margem mínima, Supply Score, Opportunity Score, roteamento por disponibilidade/risco e Supply Gate com exceção somente para pré-venda explicitamente configurada. O catálogo de fornecedor é idempotente por `userId + supplierId + externalId`, e produtos sem match não geram Produto Mestre automaticamente.

O router `supply` foi registrado no `appRouter`, com procedures para dashboard, fornecedores, integrações, catálogo, análise de custo/score/roteamento, mappings e políticas. A página `client/src/pages/Supply.tsx` foi adicionada ao Command Center com o caminho `/supply` e item de navegação lateral. O modo externo continua protegido pelo `Marketplace Safety Mode` e em `READ_ONLY` por padrão.

Validação desta entrega: typecheck aprovado, 11 arquivos de teste, 32 testes aprovados e build aprovado.


## Hardening S3.1 e início do S4 — Supply Adapter Framework

A auditoria adicional encontrou um P0 no endpoint `supply.mappings.review`: `variantId` podia ser gravado sem validação equivalente de usuário e Produto Mestre. A correção agora consulta e exige variante existente, pertencente ao usuário atual e pertencente ao `productId` selecionado. A regra foi extraída para `server/supply/securityPolicy.ts` e coberta por testes.

Mappings `unmatched` passaram a ser persistidos como classificação histórica, com `productId` nulo quando não existe candidato. A política de aprovação foi refinada: matches `probable` exigem uma etapa explícita `reviewed`; matches `exact` continuam conservadores por padrão e podem ser aprovados automaticamente somente com `AUTO_APPROVE_EXACT=true`.

Foi iniciado o `Supplier Adapter Framework` separado dos adapters de marketplaces. O contrato `SupplierAdapter` e o `SupplierAdapterRegistry` foram criados, junto com adapters iniciais `ManualSupplierAdapter` e `CsvSupplierAdapter`. O CSV normaliza valores monetários para centavos, estoque e identificadores; a leitura é não destrutiva e não publica dados.

Validação desta atualização: typecheck aprovado, 13 arquivos de teste, 39 testes aprovados. A próxima etapa permanece a implementação do Import Pipeline, sincronização de estoque de fornecedor e integração transacional com o Inventory Ledger.


## Fase S3.2 — Hardening do parser CSV

Foi corrigido um P0 no parser monetário do CSV. A conversão anterior removia todos os pontos antes de interpretar a vírgula, o que transformava `12.50` em valor 100 vezes maior. O novo `parseMoneyToCents` aceita `12,50`, `12.50`, `1.250,50`, `1,250.50`, `1250` e `R$ 12,50`, mantendo o domínio em centavos.

Valores negativos, inválidos, não finitos e acima do limite operacional são rejeitados explicitamente. O CSV agora usa esse parser para custo e frete. Foram adicionados testes para todos os formatos críticos, negativos e overflow.

Validação da S3.2: typecheck aprovado, 13 arquivos de teste, 40 testes aprovados. O próximo bloco recomendado é S4-A/S4-B: Connection Tester e Import Pipeline completo, com download/parsing/validação/normalização/upsert/histórico/matching/alertas.


## Fase S3.2.1 — Migration & Supply Safety Hardening

A auditoria S3.2.1 encontrou quatro foreign keys da migration `0005_mysterious_quentin_quire.sql` com nomes acima do limite de 64 caracteres do MariaDB/MySQL. Os nomes foram encurtados para identificadores estáveis (`fg_items_group_fk`, `sp_inv_hist_product_fk`, `sp_price_hist_product_fk` e `sp_mapping_product_fk`). Foi adicionado `server/migrationIdentifierLength.test.ts`, que percorre todas as migrations e falha automaticamente quando encontra uma constraint longa.

O Supply Gate foi endurecido. A modalidade `pre_order` agora pode ignorar somente `stockReliable`, `shippingKnown` e `leadTimeKnown`; continua exigindo produto válido, fornecedor aprovado, vínculo, custo, margem, mídia, conteúdo e direitos autorizados. Foram adicionados testes para fornecedor bloqueado, margem inválida, mídia inválida e direitos não autorizados em pre-order.

O CSV agora detecta automaticamente os delimitadores vírgula e ponto e vírgula, remove BOM UTF-8, aceita CRLF/LF, aspas escapadas e valida estoque como inteiro finito não negativo por meio de `parseStock`. O parser monetário permanece centralizado em `parseMoneyToCents`.

Validação da S3.2.1: typecheck aprovado, 14 arquivos de teste e 44 testes aprovados. O modo de marketplace continua `READ_ONLY`; não há liberação de dropshipping automático ou sincronização direta de estoque para marketplace.


## Fase S4-A — Connection Center e Supplier Adapter Runtime

O runtime de fornecedores deixou de ser apenas um registry decorativo. Foi adicionada a matriz de capacidades (`CATALOG_READ`, `INVENTORY_READ`, `PRICE_READ`, `ORDER_CREATE`, `ORDER_READ`, `ORDER_CANCEL`, `TRACKING_READ`, `MEDIA_READ`) ao contrato `SupplierAdapter`. Os adapters Manual e CSV declaram somente as capacidades que realmente suportam.

Foi criado `SupplierConnectionService`, que aplica ownership por usuário, descriptografa credenciais, instancia o adapter pelo registry, executa `authenticate()` e `testConnection()`, e persiste `testing`, `connected` ou `error` com a mensagem do último erro. `saveIntegration` não marca mais uma integração como ativa sem teste real; novas integrações ficam `pending` até o teste.

O router `supply.suppliers.connections` expõe listagem protegida e teste de conexão protegido. A tela de fornecedores recebeu o Connection Center com tipo, status, última sincronização, último erro, capacidades e botão real de teste.

A validação desta camada foi aprovada com typecheck, suíte completa e build. O runtime ainda não deve ser confundido com sincronização completa: o próximo marco é S4-B, com jobs assíncronos, `supplier_sync_runs`, import pipeline, histórico, matching e alertas.


## S4-A.1 — Security & Runtime Hardening concluída

A auditoria identificou um risco P0: a listagem de integrações retornava a linha completa de `supplier_integrations`, incluindo `encryptedCredentials`. O problema foi corrigido com projeção explícita e o DTO `toSafeSupplierIntegration`, que devolve somente os campos operacionais permitidos. Foi criado teste dedicado contra `encryptedCredentials`, `credentials`, `secret`, `token`, `password`, `apiKey`, `accessToken` e `refreshToken`.

O `saveIntegration` agora não aceita `status` no contrato e sempre grava `pending` tanto em novas integrações quanto ao trocar credenciais. O router também foi ajustado para não repassar esse campo.

A matriz de capabilities passou a ser resolvida pelo `SupplierAdapterRegistry.capabilities()` e retornada pelo endpoint `connections.list`; a interface agora renderiza dinamicamente capacidades presentes e ausentes, sem hardcode.

Os snapshots Drizzle 0005/0006 foram alinhados à constraint curta `sp_mapping_product_fk`, e o teste de integridade passou a inspecionar SQL, snapshots e journal.

Validação final da S4-A.1: typecheck aprovado, 15 arquivos de teste, 46 testes aprovados e build de produção aprovado. Marketplace permanece em `READ_ONLY`; S4-B continua sendo o próximo estágio para importação assíncrona real.

## S4-B — Import Pipeline assíncrono: primeira entrega operacional

Foram adicionadas as tabelas `supplier_sync_runs` e `supplier_import_items` na migration `0007_fat_franklin_storm.sql`. O novo `SupplierImportService` cria runs duráveis, enfileira jobs `supplier_catalog`, valida registros com Zod, conserva payload bruto e normalizado, faz upsert idempotente em `supplier_products`, grava histórico de custo/estoque somente quando há alteração e aciona o matching com revisão humana.

O worker passou a despachar `supplier_catalog` usando a mesma fila durável, lock, retry e backoff existentes. O Connection Center ganhou consulta dos últimos runs e ação de importação condicionada a conexão `connected` e capability `CATALOG_READ`. A interface passou a usar capabilities dinâmicas, sem lista fixa de permissões.

A migration foi aplicada apenas ao banco de preview. Validação: typecheck aprovado, 16 arquivos de teste, 49 testes aprovados e build de produção aprovado. A S4-B ainda não está completa: permanecem storage de arquivos fora de credenciais, feeds remotos/streaming, progresso granular, DLQ observável, conciliação visual dedicada e testes com fornecedor real.

## Etapas 2 e 3 — ATS e preparação interna de fulfillment

O `InventoryService` passou a expor `availableToSell`, combinando estoque próprio, reservas, mappings aprovados de fornecedor, buffer, status do fornecedor e idade do último sync. Fontes bloqueadas ou desatualizadas não contribuem para ATS. O `ProductSyncService` passou a consultar ATS na publicação e na atualização de estoque, embora o modo global continue bloqueando qualquer escrita externa.

Foi criado `SupplierFulfillmentService.prepareForOrder`, que seleciona fornecedor aprovado conforme policy, estoque confiável, prioridade e `autoFulfillmentAllowed`, e cria Purchase Order e grupo de fulfillment em `awaiting_approval`. Nenhuma ordem é enviada ao fornecedor; tracking, aprovação externa e devolução continuam pendentes para as próximas incrementações.

Validação parcial das etapas: typecheck aprovado, 17 arquivos de teste, 52 testes aprovados e build aprovado.


## Gabarito Master — hardening e rastreabilidade S4-B

A execução do Gabarito Master adicionou inventário técnico persistido em `MASTER_INVENTORY.md` e auditoria de segurança em `MASTER_SECURITY_AUDIT.md`. Foi corrigido o update de SEO para reforçar ownership por `userId` e evitar mass assignment.

O pipeline S4-B passou a registrar `sourceType`, `sourceReference`, `fileHash`, estágio, progresso e contadores de registros. Reimportações sem alteração são detectadas por hash e finalizadas como `skipped_unchanged`, sem duplicar produtos ou históricos. Falhas por registro são isoladas em `failed_import_records` com payload sanitizado, código, tentativas e status; foram adicionadas procedures protegidas para listar a dead-letter e solicitar retry do run.

Os históricos de preço e estoque receberam valor anterior, diferença, origem e vínculo ao `importId`, além de consultas protegidas no router Supply. O pipeline registra `IMPORT_STARTED`, `IMPORT_COMPLETED` e `IMPORT_FAILED` pelo mecanismo de auditoria existente, sem incluir credenciais.

Foram geradas e aplicadas somente no banco de preview as migrations `0008_master_import_metadata.sql`, `0009_master_failed_import_records.sql` e `0010_master_history_traceability.sql`. Validação da rodada: typecheck aprovado, 17 arquivos de teste, 52 testes aprovados e build de produção aprovado. `MARKETPLACE_MODE=READ_ONLY` continua obrigatório.


## Gabarito Master — evolução operacional

- O fluxo interno de pedidos/fulfillment recebeu transições protegidas e explícitas, tracking, cancelamento por estado permitido e abertura de devoluções com ownership. Nenhuma ação envia pedido a fornecedor ou marketplace.
- O Supply Engine recebeu cálculo de preço mínimo em centavos, considerando custo fixo, taxas percentuais, impostos e margem mínima; resultados matematicamente inviáveis são bloqueados.
- Foram criados módulos persistentes de afiliados com fontes, links, eventos idempotentes, conversões, receita e comissão separadas das vendas próprias.
- O dashboard Supply passou a exibir imports em execução e alertas abertos; alertas possuem listagem protegida e resolução por ownership. A UI ganhou as seções Alertas Operacionais e Afiliados.
- A linhagem Drizzle foi corrigida: reservas por fonte e afiliados estão em uma única migration `0012_master_source_reservations_affiliates.sql`, com constraint curta `inv_res_supplier_fk`; referências longas residuais foram eliminadas.
- Validação mais recente: `pnpm check` aprovado, 17 arquivos de teste e 54 testes aprovados, `pnpm build` aprovado com `dist/index.js` e `dist/worker.js`.
- A publicação externa continua bloqueada por `MARKETPLACE_MODE=READ_ONLY`.
