# Status de execução do Gabarito Master

## Estado geral

O Luary avançou da base S4-A.1 para uma camada operacional interna mais completa, preservando `MARKETPLACE_MODE=READ_ONLY`. As alterações desta rodada não publicam, reativam, editam preço/estoque nem enviam pedidos para marketplaces ou fornecedores.

## Entregas realizadas

A base de segurança recebeu correção de mass assignment no SEO, ownership nas procedures, DTO seguro de fornecedores, capabilities dinâmicas e logs de importação sanitizados. O pipeline S4-B passou a manter runs persistentes, origem, hash determinístico, progresso, contadores, histórico idempotente, dead-letter e retry manual.

O domínio de estoque recebeu reservas segregadas por fonte, vínculo opcional ao Produto de Fornecedor, cálculo de ATS com buffer, reserva e stale-data, além da integração do ATS ao limite interno de sincronização. O domínio de pedidos recebeu preparação de Purchase Orders e grupos de fulfillment, transições protegidas, tracking interno, cancelamento por estado e abertura de devoluções.

O Supply Engine passou a calcular preço mínimo em centavos, incluindo custo fixo, taxas percentuais, impostos e margem mínima. O matching persiste evidências, candidatos e diferença para o segundo candidato. O módulo de afiliados possui fontes, links por Produto Mestre, eventos idempotentes, conversões, receita e comissão isoladas das vendas próprias. O dashboard Supply possui imports em execução, alertas abertos, listagem/resolução de alertas e navegação para Afiliados.

A linhagem Drizzle foi saneada para não depender de nomes longos de constraints do MariaDB. A migration `0012_master_source_reservations_affiliates.sql` é única para reservas por fonte e afiliados, e todas as referências de foreign keys longas detectadas nos SQLs e snapshots foram encurtadas.

## Validação mais recente

`pnpm drizzle-kit check`: aprovado.

`pnpm check`: aprovado.

`pnpm test`: 17 arquivos e 54 testes aprovados.

`pnpm build`: aprovado, gerando `dist/index.js` e `dist/worker.js`.

O projeto não possui script `lint` configurado no `package.json`; isso permanece registrado como limitação de qualidade, sem mascarar o resultado do typecheck, testes e build.

## Dependências antes da homologação externa

Ainda é necessário preparar um ambiente de homologação separado, configurar secrets exclusivamente no servidor, conectar contas autorizadas do Mercado Livre e Shopee, executar o protocolo read-only, validar OAuth, paginação, categorias, atributos, mídia, variações, pedidos, webhooks, rate limits e reconciliação. A escrita controlada só deve ocorrer depois de evidências read-only, confirmação explícita do operador e plano de rollback.

A conexão com contas reais exige login do proprietário no navegador ou credenciais inseridas no ambiente seguro. Nenhuma senha, client secret ou token deve ser enviado nesta conversa ou commitado no repositório.
