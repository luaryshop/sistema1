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
