
---

### 18. Lançamentos Recorrentes e Melhorias de UX em Despesas (14/11/2025)

Nesta sessão, focamos em adicionar uma funcionalidade de automação para lançamentos financeiros e em melhorar significativamente a usabilidade da página de Lançamento de Despesas.

#### 1. Nova Funcionalidade: Lançamentos Recorrentes:
*   **Automação de Despesas:** Implementada a capacidade de criar despesas recorrentes (mensais) para custos fixos, como aluguel ou assinaturas.
*   **Interface:** Adicionada uma caixa de seleção "Repetir este lançamento mensalmente" e um campo para definir o número de meses em todos os formulários de despesa (`Deduções`, `Custos` e `Despesas Gerais`).
*   **Lógica de Backend:** Ao salvar uma despesa recorrente, o sistema agora cria automaticamente múltiplos registros no banco de dados, um para cada mês, com as datas de competência e vencimento ajustadas.
*   **Correção de Bug:** Resolvido um erro de `NOT NULL constraint` no `database.js` que ocorria ao salvar despesas, garantindo que um método de pagamento padrão ('N/A') seja atribuído.

#### 2. Melhorias de Usabilidade (UX) na Tela de Despesas:
*   **Reorganização do Layout:** A estrutura da página `despesas.html` foi invertida. Os formulários de lançamento (acordeão) agora aparecem no topo da página, antes da tabela de histórico, priorizando a ação de entrada de dados.
*   **Paginação da Tabela:** Implementado um sistema de paginação do lado do cliente para a tabela de "Histórico de Lançamentos". A tabela agora exibe 10 itens por vez, com controles de navegação, melhorando a performance e a clareza com grandes volumes de dados.
*   **Contador de Itens:** Adicionado um contador ao lado do título "Histórico de Lançamentos" que exibe o número total de itens encontrados pelo filtro atual, fornecendo feedback visual imediato ao usuário.
*   **Botão "Limpar Filtros":** Adicionado um novo botão que permite ao usuário limpar rapidamente todos os filtros de data e categoria aplicados na tabela de histórico, restaurando a visualização padrão.
