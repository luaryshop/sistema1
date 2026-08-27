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
