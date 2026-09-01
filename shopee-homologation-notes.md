# Notas de homologação Shopee

A documentação oficial consultada em 01/09/2026 indica que a produção brasileira usa `https://open.shopee.com.br/auth` para autorização e `https://openplatform.shopee.com.br/api/v2/` para chamadas de API. O link de autorização exige `partner_id`, `auth_type=seller`, `redirect_uri`, `response_type=code` e, opcionalmente, `state`. Após a autorização, o retorno inclui `code` e `shop_id` para uma loja individual ou `main_account_id` para uma conta principal. O código é de uso único e expira em aproximadamente 10 minutos.

Variáveis esperadas no Railway para Shopee: `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY` e `MARKETPLACE_REDIRECT_URI`. O Luary deve continuar com `MARKETPLACE_MODE=READ_ONLY`; nenhuma chamada de escrita será liberada nesta fase.

Fontes oficiais: [cadastro](https://open.shopee.com/developer-guide/12), [autorização](https://open.shopee.com/developer-guide/20) e [chamadas de API](https://open.shopee.com/developer-guide/16).
