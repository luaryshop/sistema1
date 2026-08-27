# Relatório de hardening — Central Luary

**Autor:** Manus AI  
**Escopo:** incorporação da segunda auditoria crítica ao núcleo omnichannel antes da homologação externa.

## Conclusão executiva

O projeto avançou de um núcleo interno funcional para uma base **hardened pre-production**. Os principais riscos que poderiam permitir uma publicação insegura foram corrigidos: preço de venda e custo estão separados, a mídia passa por validação, categorias e atributos dependem de mapping configurável, ofertas podem ser associadas a variantes, e o fluxo de publicação é bloqueado pelo Publication Gate quando os pré-requisitos não estão satisfeitos.

O sistema **não deve ser declarado 100% homologado** ainda. A parte restante exige contas autorizadas reais, endpoints de produção, configuração de secrets, banco de produção e execução persistente do worker. Sem isso, qualquer afirmação de publicação real, refresh OAuth, assinatura de webhook ou compatibilidade final de payload seria apenas presumida.

## Correções aplicadas

| Área | Correção | Resultado operacional |
|---|---|---|
| Preço | Publisher utiliza `basePrice`; `costBase` permanece custo | Evita publicar custo como preço de venda |
| Publication Gate | Preflight persistido valida SKU, preço, estoque, mapping, mídia, conexão e conflitos | Nenhuma publicação deve contornar a validação explícita |
| Mídia | Resolver busca imagens prontas e valida URL, MIME, tamanho, dimensões e ordem | Reduz rejeições por imagens ausentes ou inválidas |
| Categoria | `marketplaceCategoryMappings` configurável por usuário, canal e categoria interna | Remove dependência de categoria fixa |
| Atributos | `marketplaceAttributeMappings` e engine de tradução | Permite adaptar atributos por canal |
| Shopee | Centavos no domínio; decimal somente na fronteira externa | Elimina inconsistência monetária |
| Variantes | Ofertas e mídia podem apontar para `variantId`; variantes têm dados comerciais/logísticos | Permite catálogo com SKU por variação |
| Webhooks | Roteamento explícito para pedidos, pagamento, envio, cancelamento, devolução, estoque e preço | Evento desconhecido é auditado sem virar estoque por engano |
| Worker | Processo persistente separado com polling, batch e encerramento gracioso | Base para operação contínua em produção |
| TikTok | Sem `category_id: 0` ou `brand_id: 0` na publicação | Mesmo contrato seguro para canal futuro |

## Estado de segurança

As rotas administrativas existentes continuam protegidas por usuário autenticado e consultas críticas mantêm o filtro por `userId`. O projeto já possui papel `user/admin` e procedimento administrativo para operações administrativas do sistema. O próximo nível recomendado para operação comercial multiusuário é ampliar esse papel para permissões granulares, como catálogo, estoque, pedidos, publicação, financeiro e configurações de conexão.

A auditoria de alterações permanece disponível por snapshots antes/depois. Conflitos de sincronização continuam exigindo resolução protegida antes de liberar uma operação que possa sobrescrever dados divergentes.

## Validação automatizada

A validação executada no estado atual apresentou o seguinte resultado:

| Verificação | Resultado |
|---|---:|
| Geração de migration Drizzle | Aprovada; sem novas divergências |
| TypeScript (`pnpm check`) | Aprovado |
| Suíte Vitest | 8 arquivos aprovados |
| Testes | 19 aprovados |
| Build de produção | Aprovado |
| Artefatos do build | `dist/index.js` e `dist/worker.js` |

O build apresenta apenas o aviso normal de bundle frontend acima de 500 kB; isso é uma otimização de performance, não uma falha funcional.

## O que ainda depende da homologação externa

| Item | Dependência | Critério de aceite |
|---|---|---|
| OAuth Mercado Livre | Conta de vendedor autorizada e redirect configurado | Login, callback, refresh e expiração confirmados |
| OAuth Shopee | Conta autorizada, partner/app credentials e assinatura | Token, refresh e chamadas assinadas confirmados |
| Categorias e atributos | Respostas reais por categoria e marketplace | Mapping persistido e payload aceito |
| Imagens e vídeos | URLs ou upload real nos canais | Upload, ordenação, associação a variante e publicação confirmados |
| Pedidos | Pedidos reais ou sandbox | Idempotência, matching por SKU, reserva, cancelamento e devolução confirmados |
| Webhooks | Secret e endpoints públicos | Assinatura, deduplicação, replay controlado e roteamento confirmados |
| Worker | Processo persistente em infraestrutura de produção | Retry, backoff, lock, rate limit e observabilidade confirmados |
| Banco | MySQL/TiDB de produção | Baseline e migration incremental aplicadas em ambiente controlado |

## Procedimento recomendado para homologação

Primeiro, configure as variáveis de ambiente e aplique a baseline limpa em um banco de homologação. Depois, conecte uma conta por canal e valide somente leitura: identidade do seller, anúncios pausados, categorias, atributos, imagens, SKUs e preços. Em seguida, importe para staging, execute matching e resolva conflitos manualmente.

A terceira etapa deve executar o Publication Gate em produtos de teste. Somente após visualizar o relatório de preflight e confirmar preço, estoque, mídia, categoria, atributos e variante deve-se autorizar uma publicação controlada. A reativação de anúncios pausados deve ser tratada como ação de alto risco e exigir confirmação explícita, registro de auditoria e possibilidade de rollback.

Por fim, configure o worker persistente e os webhooks. O teste de produção deve cobrir duplicidade, ordem fora de sequência, falha temporária, token expirado, limite de API, cancelamento e devolução. O resultado esperado não é apenas uma resposta HTTP positiva, mas a convergência correta do catálogo, estoque, pedidos e ledger.

## Arquivos principais desta entrega

- `server/services/publicationPreflightService.ts`
- `server/services/mediaResolver.ts`
- `server/services/webhookEventRouter.ts`
- `server/services/webhookService.ts`
- `server/worker.ts`
- `server/adapters/MercadoLivreAdapter.ts`
- `server/adapters/ShopeeAdapter.ts`
- `server/adapters/TikTokAdapter.ts`
- `package.json`
- `DEVELOPMENT_PROGRESS.md`

## Veredito

O projeto está **pronto para iniciar homologação externa controlada**, não para afirmar que a integração de marketplace já está comprovada em produção. O mecanismo interno de segurança comercial está implementado e validado localmente; o próximo passo legítimo é conectar as contas autorizadas e executar o protocolo de homologação sem permitir publicação automática.


## Atualização — Fase 2 Mercado Livre Import Center

A Fase 2 foi implementada em modo read-only. O Import Center consulta anúncios pelo adapter, grava o payload em staging e classifica cada registro com Matching 2.0 usando SKU, código interno, EAN/GTIN, MPN, identificadores, título normalizado, marca e atributos.

As classes persistidas são `exact` (99–100%), `probable` (90–98%), `conflict` (70–89%) e `unmatched` (abaixo de 70%). O sistema não vincula conflitos ou anúncios sem correspondência. A interface `/omnichannel` exibe o resumo por classe e oferece `Recalcular`, `Revisar`, `Ignorar` e `Vincular sugerido`.

O novo endpoint `marketplace.linkStagedListing` cria ou atualiza somente a oferta interna, preservando o ID e o status do anúncio externo. Nenhum endpoint de publicação, edição ou reativação é chamado nesta fase.

A migration `0003_red_infant_terrible.sql` foi gerada. A validação após a implementação apresentou typecheck aprovado, 19 testes aprovados e build de produção aprovado.


## Atualização — Fase 2.1 Matching & Import Safety

A auditoria do ZIP apontou quatro ajustes antes da conexão real. Todos foram aplicados. O backend agora exige `status=reviewed` para matches `probable`; `conflict` e `unmatched` são bloqueados. O vínculo valida que a variante pertence ao produto selecionado e ao usuário atual.

O modelo normalizado de anúncio agora declara `internalCode` e `mpn`. O staging persiste `matchEvidence` e `matchCandidates`, com similaridade de título, marca, atributos e diferença para o segundo candidato. A política de vínculo foi extraída para uma função centralizada e recebeu suíte específica.

A Fase 2.1 foi validada com migration sem divergências, typecheck aprovado, 9 arquivos de teste, 23 testes aprovados e build de produção aprovado. O sistema está pronto para a próxima operação, que deve ser a homologação real do Mercado Livre em read-only, começando por poucos anúncios pausados.


## Atualização — Fase 2.2 Safety Mode

Antes da homologação real do Mercado Livre, foi adicionada uma trava arquitetural global por `MARKETPLACE_MODE`. O padrão é `READ_ONLY`, que bloqueia no backend publicação, atualização de produto, alteração de preço, alteração de estoque e pausa/ativação. A interface não é a única barreira.

O modo `LIVE` precisa ser configurado explicitamente após a homologação e aprovação operacional. A configuração está documentada no `env.sample.txt`. A nova suíte de segurança validou o padrão READ_ONLY, todas as operações bloqueadas e a liberação somente no modo LIVE.

Validação desta atualização: typecheck aprovado, 10 arquivos de teste, 26 testes aprovados e build de produção aprovado. A homologação real deve continuar começando em read-only, com OAuth, consulta da conta e importação limitada a cinco anúncios pausados.


## Atualização — Supply Engine S1 a S3

Foi adicionada a primeira camada do LUARY SUPPLY ENGINE de forma aditiva. O módulo não cria uma segunda verdade para produto, preço, oferta ou estoque: fornecedores são fontes de abastecimento; o Produto Mestre, o Pricing Engine, o Inventory Ledger, o Media Library e o Publication Gate continuam sendo as estruturas comerciais centrais.

A migration `0005_mysterious_quentin_quire.sql` introduz fornecedores, integrações com credenciais criptografadas, catálogo externo, mappings revisáveis, políticas de roteamento primário/backup, histórico de custo e estoque, alertas, purchase orders, grupos de fulfillment, devoluções e snapshots de saúde do fornecedor. A importação de produtos de fornecedor é idempotente por `userId + supplierId + externalId`, e produtos sem correspondência não geram Produto Mestre automaticamente.

Foram criados os motores `server/supply/engines.ts`, `server/sourcing/supplierMatchingService.ts` e `server/suppliers/supplierService.ts`. Eles calculam Landed Cost, margem mínima, Supply Score, Opportunity Score, roteamento por estoque confiável/risco e Supply Gate. O modo `pre_order` é uma exceção explícita; dropshipping sem estoque confiável continua bloqueado.

O router `supply` foi registrado no `appRouter` com procedures para dashboard, fornecedores, integrações, catálogo, matching, mappings, políticas de roteamento e análises. A interface `/supply` e as subseções `/supply/suppliers`, `/supply/catalog`, `/supply/opportunities`, `/supply/purchaseOrders` e `/supply/dropshipping` foram adicionadas ao Command Center.

Esta entrega não conecta automaticamente fornecedores externos nem autoriza publicação. Os próximos incrementos devem implementar adaptadores de catálogo/inventário, Supply Gate persistente, integração do abastecimento com o Inventory Ledger, Purchase Orders operacionais, tracking, failover efetivo e Opportunity Engine baseado em vendas reais.

Validação desta atualização: migration gerada com 45 tabelas, typecheck aprovado, 11 arquivos de teste, 32 testes aprovados e build de produção aprovado.


## Atualização — Hardening S3.1 e Supplier Adapter Framework

A auditoria adicional apontou um P0 no endpoint `supply.mappings.review`: `variantId` podia ser persistido sem validar existência, ownership e pertencimento ao Produto Mestre. O router agora executa as três validações no backend, e a regra foi extraída para `server/supply/securityPolicy.ts` com testes unitários.

A persistência de `unmatched` foi corrigida. A tabela de mappings permite `productId` nulo quando não existe candidato, preservando a evidência de que o produto foi analisado e não encontrou correspondência. Matches `probable` exigem o estado intermediário `reviewed`; matches `exact` só podem ser aprovados automaticamente mediante `AUTO_APPROVE_EXACT=true`, mantendo o padrão desligado.

Foi iniciado o S4 com contrato separado `SupplierAdapter`, `SupplierAdapterRegistry`, `ManualSupplierAdapter` e `CsvSupplierAdapter`. O CSV possui normalização de identificadores, estoque e valores para centavos, com rejeição de linhas sem ID ou nome. Nenhum adapter de fornecedor chama APIs de marketplace ou publica dados.

A validação local desta atualização foi executada: typecheck aprovado, 13 arquivos de teste, 39 testes aprovados. Ainda não há homologação de fornecedor real, Inventory Ledger unificado, Purchase Order executável, tracking, failover, Opportunity persistida ou automação de dropshipping. Esses itens continuam bloqueados até a implementação das fases seguintes e testes E2E.


## Atualização — S3.2 Hardening do CSV

Foi corrigido o P0 monetário identificado na auditoria S3.1. O parser anterior podia interpretar `12.50` como `125000` centavos; o novo `parseMoneyToCents` diferencia separadores decimais e de milhar nos formatos brasileiro e internacional e aceita moeda explícita.

Casos cobertos: `12,50 → 1250`, `12.50 → 1250`, `1.250,50 → 125050`, `1,250.50 → 125050`, `1250 → 125000` e `R$ 12,50 → 1250`. Valores negativos, inválidos, não finitos e acima do limite operacional são rejeitados. O parser é utilizado pelo `CsvSupplierAdapter` para custo e frete.

A S3.2 foi validada com typecheck aprovado, 13 arquivos de teste e 40 testes aprovados. A plataforma continua em `READ_ONLY` para marketplaces. Ainda permanecem bloqueados para produção de dropshipping o Import Pipeline completo, Inventory Ledger unificado, Availability, Purchase Orders executáveis, tracking, failover, Opportunity persistida, Media Pipeline, automação e testes E2E.


## Atualização — S3.2.1 Migration & Supply Safety Hardening

A migration `0005_mysterious_quentin_quire.sql` continha quatro nomes de foreign keys acima do limite de 64 caracteres do MariaDB/MySQL. Eles foram substituídos por nomes curtos e estáveis: `fg_items_group_fk`, `sp_inv_hist_product_fk`, `sp_price_hist_product_fk` e `sp_mapping_product_fk`. O teste `server/migrationIdentifierLength.test.ts` percorre todas as migrations e impede regressão desse problema.

O Supply Gate não permite mais que `pre_order` contorne governança comercial. Essa modalidade ignora apenas disponibilidade e prazo (`stockReliable`, `shippingKnown`, `leadTimeKnown`); fornecedor aprovado, Produto Mestre, custo, margem, mídia, conteúdo e direitos continuam obrigatórios. Foram adicionados testes para cada bloqueio crítico.

O `CsvSupplierAdapter` foi reforçado para detectar `,` e `;`, remover BOM UTF-8, suportar CRLF/LF, aspas escapadas e validar estoque como inteiro não negativo e finito. O parser monetário mantém suporte aos formatos brasileiro e internacional.

Validação desta fase: typecheck aprovado, 14 arquivos de teste, 44 testes aprovados. O projeto continua seguro para evolução, mas ainda não está liberado para dropshipping automático: Availability/Inventory Ledger unificado, reservas atômicas, sincronização de fornecedor, Purchase Orders, tracking, failover, Opportunity persistida, Media Pipeline, reconciliação, DLQ e E2E ainda precisam ser implementados.


## Atualização — S4-A Connection Center e Supplier Adapter Runtime

O contrato de fornecedores foi refinado para composição por capacidades. Cada adapter declara o que realmente suporta entre catálogo, estoque, preço, pedidos, cancelamento, tracking e mídia. Manual e CSV declaram somente leitura de catálogo, estoque e preço; não prometem pedido ou tracking.

O `SupplierConnectionService` implementa ownership por usuário, descriptografia de credenciais, criação pelo `SupplierAdapterRegistry`, `authenticate()`, `testConnection()` e persistência do resultado. O fluxo não grava `connected` no momento de salvar credenciais: a integração permanece `pending` até um teste real; falhas ficam como `error` com último erro persistido.

O router protegido `supply.suppliers.connections` e a tela Connection Center exibem fornecedor, tipo, status, capacidades, última sincronização, último erro e o botão `Testar conexão`. A camada foi validada com typecheck, testes e build.

S4-A não representa ainda sincronização operacional completa. Ficam para S4-B o processamento assíncrono por worker, `supplier_sync_runs`, Import Pipeline, histórico de execução, matching e alertas. O modo de marketplace continua `READ_ONLY`, e Availability, reserva atômica, Purchase Orders, tracking e dropshipping permanecem bloqueados.


## Atualização — S4-A.1 Security & Runtime Hardening

A auditoria identificou um risco P0: a listagem de integrações retornava a linha completa de `supplier_integrations`, incluindo `encryptedCredentials`. O problema foi corrigido com projeção explícita e o DTO `toSafeSupplierIntegration`, que devolve somente os campos operacionais permitidos. A cobertura dedicada verifica também `credentials`, `secret`, `token`, `password`, `apiKey`, `accessToken` e `refreshToken`.

O `saveIntegration` não aceita mais `status` no contrato e sempre grava `pending` na criação ou atualização de credenciais. O router foi ajustado para não repassar esse campo; apenas o fluxo de teste promove a integração para `testing`, `connected` ou `error`.

A matriz de capabilities foi centralizada no `SupplierAdapterRegistry.capabilities()`. O endpoint de listagem agora retorna capabilities e o Connection Center as renderiza dinamicamente, mostrando capacidades presentes e ausentes por integração.

Os snapshots Drizzle 0005/0006 foram alinhados à constraint curta `sp_mapping_product_fk`. O teste de integridade passou a validar SQL, snapshots e journal.

Validação: typecheck aprovado, 15 arquivos de teste, 46 testes aprovados e build de produção aprovado. Permanecem deliberadamente para S4-B os schemas Zod específicos por adapter, armazenamento de CSV fora de credenciais, parser CSV orientado por linha com respeito a aspas, métricas de conexão, sincronização real, Import Pipeline assíncrono, histórico, matching e Inventory Ledger. O modo externo continua `READ_ONLY`.
