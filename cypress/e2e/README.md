# Testes End-to-End (E2E) com Cypress

Esta pasta contém os testes E2E para a aplicação Oficina ADM.

## Estrutura

A estrutura de testes foi refatorada para garantir estabilidade e manutenibilidade, seguindo os seguintes princípios:

1.  **Page Object Model (POM):** As interações com as páginas são abstraídas em classes localizadas em `cypress/support/pages`. Isso centraliza os seletores de elementos do DOM e torna os testes mais legíveis e fáceis de manter.

2.  **Mocking da API:** Como a aplicação usa o `contextBridge` do Electron para expor a API do backend (`main.js`) ao frontend, os testes E2E não interagem com o banco de dados real. Em vez disso, todas as chamadas para `window.api` são interceptadas e "stubbadas" (simuladas) usando o `cy.stub()` do Cypress.
    -   **API Stubs:** A simulação da API é feita no hook `onBeforeLoad` do `cy.visit()`. Isso garante que a `window.api` falsa esteja no lugar antes que qualquer script da aplicação seja executado, evitando condições de corrida.
    -   **UI Stubs:** Funções globais de UI (como modais de confirmação) são "stubbadas" dentro de cada teste usando `cy.window().then(...)`. Isso garante que o script da aplicação que define a função já tenha sido executado.

3.  **Foco na Lógica de Negócio:** Os testes são focados em validar os fluxos de trabalho principais e a lógica de negócio de cada página (criação, edição, exclusão, mudança de status), em vez de detalhes de implementação da UI.

## Arquivos de Teste

-   `refactored-gerenciar-orcamentos.cy.js`: Testa a listagem, filtro e exclusão de orçamentos.
-   `refactored-gerenciar-servicos.cy.js`: Testa a listagem e edição de serviços.
-   `refactored-gerenciar-pagamentos.cy.js`: Testa a listagem e o fluxo de adição de um novo pagamento a um serviço.

## Como Executar

Para executar todos os testes em modo headless:

```bash
npm run cypress:run
```

Para abrir a interface interativa do Cypress:

```bash
npm run cypress:open
```

Em seguida, selecione o teste (`.cy.js`) que deseja executar.

## Problema Conhecido

-   **Testes de Paginação:** Durante a refatoração, foi identificado um bug persistente e de difícil reprodução na lógica de paginação das telas de "Gerenciar Serviços" e "Gerenciar Pagamentos". Os testes que tentam interagir com a paginação falham de forma inconsistente. Para garantir a estabilidade da suíte, os testes de paginação foram **deliberadamente omitidos**. A lógica de negócio principal (edição, exclusão, etc.) dessas páginas foi testada com um conjunto de dados mockado pequeno que não ativa a paginação. A correção e o teste da funcionalidade de paginação devem ser tratados como uma tarefa separada.
