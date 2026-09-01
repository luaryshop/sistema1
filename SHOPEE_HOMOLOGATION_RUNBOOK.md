# Homologação Shopee — modo somente leitura

## Estado de segurança

Antes de conectar a conta real, confirme que o Railway mantém `MARKETPLACE_MODE=READ_ONLY`. Nesta fase o Luary consulta identidade, loja e anúncios, mas não publica, edita, pausa, ativa, exclui, altera preço ou altera estoque.

## Variáveis do Railway

No serviço `sistema1`, ambiente `production`, configure diretamente no Railway:

```text
SHOPEE_PARTNER_ID=<partner_id da Open Platform>
SHOPEE_PARTNER_KEY=<partner_key da Open Platform>
MARKETPLACE_REDIRECT_URI=https://sistema1-production.up.railway.app/marketplaces
MARKETPLACE_MODE=READ_ONLY
```

`SHOPEE_PARTNER_KEY` é segredo e nunca deve ser colocado no GitHub, em capturas de tela ou em mensagens. O identificador `partner_id` também deve ser tratado como configuração privada de integração.

## Autorização inicial

1. Atualize o GitHub com a versão que contém o adapter Shopee e aguarde um deployment `Successful` no Railway.
2. Abra `https://sistema1-production.up.railway.app/marketplaces` e entre no painel local.
3. Clique em **Conectar** no cartão Shopee.
4. Autorize uma loja Shopee individual. A versão atual espera `shop_id`; contas principais que retornam somente `main_account_id` ficam bloqueadas com mensagem explícita para evitar associar a loja errada.
5. Após o retorno para `/marketplaces`, confirme que a conexão aparece como ativa.
6. Use a ação de pré-visualização/importação de anúncios para consultar anúncios pausados. A importação deve permanecer em staging até uma aprovação manual interna.

## Critérios de aprovação

A homologação somente é considerada aprovada se o sistema validar a conta, persistir o `shop_id`, consultar anúncios pausados e registrar os resultados sem chamadas de escrita externa. Registre o horário, o `request_id` fornecido pela Shopee quando houver erro, o status da conexão e a quantidade de anúncios consultados. Não registre tokens ou chaves.

## Limitações atuais

Esta etapa cobre uma loja individual e consultas read-only. A autorização de conta principal, notificações/webhooks e operações de escrita exigem uma etapa posterior, revisão de permissões e aprovação explícita. Não ative escrita apenas porque a aplicação Shopee oferece permissões de “Leitura e escrita”; a trava do Luary deve continuar ativa.

Fontes oficiais consultadas em 01/09/2026: [guia de autorização](https://open.shopee.com/developer-guide/20), [cadastro de desenvolvedor](https://open.shopee.com/developer-guide/12) e [guia da plataforma](https://open.shopee.com/developer-guide/16).
