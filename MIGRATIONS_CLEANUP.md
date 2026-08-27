# Saneamento do histórico de migrations

## Diagnóstico

A pasta `drizzle/` continha três arquivos com prefixo `0000` e dois com prefixo `0001`. O journal oficial, porém, reconhecia apenas a cadeia iniciada por `0000_many_shen` e continuada por `0001_simple_proteus` até `0008_free_the_anarchist`. Os arquivos `0000_heavy_thundra`, `0000_low_killmonger` e `0001_broad_psynapse` eram ramos órfãos e divergentes.

`0000_heavy_thundra` era um baseline alternativo incompleto, enquanto `0001_broad_psynapse` completava esse ramo com tabelas que já estavam no baseline oficial. `0000_low_killmonger` continha apenas `users`. Mantê-los na mesma pasta ativa aumentava o risco de seleção incorreta, duplicidade de criação e instalação não reproduzível.

## Correção aplicada

O schema atual foi usado como fonte única de verdade e o Drizzle Kit gerou o baseline canônico `drizzle/0000_absurd_hydra.sql`. A pasta ativa agora contém apenas esse SQL, o snapshot correspondente e um journal com uma única entrada. O baseline representa 28 tabelas e inclui constraints e índices definidos pelo schema atual.

A cadeia antiga foi preservada integralmente em `../drizzle-legacy-backup-20260826-203002`, fora da pasta de migrations ativa. Nenhum `DROP TABLE`, `TRUNCATE`, `DELETE` ou alteração de dados foi executado durante o saneamento.

## Aplicação segura

Como o projeto ainda não tem dados reais de venda, a estratégia recomendada para um banco novo é criar o database vazio, configurar `DATABASE_URL` e executar `pnpm drizzle-kit migrate`. Não se deve executar o baseline sobre um banco que já contenha tabelas sem antes comparar o schema real, o conteúdo da tabela de migrations e fazer backup.

Se existir um banco que tenha aplicado a cadeia antiga, esse banco deve ser tratado separadamente. A substituição do histórico não deve ser feita diretamente em produção: primeiro deve-se tirar um dump, comparar tabelas e decidir entre manter o histórico legado ou migrar os dados para um banco novo usando o baseline canônico.

## Validações executadas

- `pnpm drizzle-kit check`: aprovado.
- `pnpm check`: aprovado.
- `pnpm test`: aprovado, 6 arquivos e 14 testes.
- `pnpm build`: aprovado.

A única observação do build é o alerta de bundle frontend acima de 500 kB. Isso não impede a execução, mas recomenda code splitting em uma etapa futura.
