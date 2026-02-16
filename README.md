# Oficina ADM - Sistema de Gestão para Oficinas

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-2.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Um sistema de desktop completo, construído com Electron.js, para a gestão moderna e eficiente de oficinas mecânicas. O projeto evoluiu de um simples CRUD para uma poderosa ferramenta de gestão financeira, permitindo uma análise profunda da saúde do negócio.

## ✨ Módulos e Funcionalidades

O sistema é dividido em módulos que cobrem todo o fluxo de trabalho de uma oficina, da operação ao financeiro.

### 🚗 Cadastros e Gestão Operacional
- **Clientes e Veículos:** CRUD completo para clientes e veículos com validação de dados (CPF/CNPJ, Placa) e máscaras de entrada.
- **Orçamentos:** Criação de orçamentos detalhados (Peças e Mão de Obra), com cálculo de lucro sobre peças, geração de PDF profissional e conversão em Ordem de Serviço.
- **Ordens de Serviço (OS):** Gestão completa do serviço, com atribuição de mecânico, status operacional e financeiro separados.
- **OS Manual:** Um fluxo rápido para registrar serviços para clientes não cadastrados, ideal para atendimentos de balcão.

### 💰 Módulos Financeiros
- **Lançar Despesas:** Uma página dedicada para registrar todas as saídas de caixa que não são custos diretos de uma OS.
  - **Organização por Categoria:** Lançamentos divididos em "Deduções/Impostos", "Custos Operacionais" e "Despesas Gerais".
  - **Lançamentos Recorrentes:** Automatize o lançamento de despesas mensais (ex: aluguel, salários) para os próximos meses.
  - **Histórico e Relatórios:** Visualize, filtre e gere relatórios em PDF de todas as despesas.
- **Lançar Receitas Avulsas:** Para registrar entradas de caixa que não vêm de uma OS (ex: venda de uma peça de prateleira).
- **Gerenciar Pagamentos:**
  - **Visão Centralizada:** Acompanhe todos os pagamentos, incluindo parcelas futuras de cartão de crédito.
  - **Conciliação Manual:** Confirme o recebimento de parcelas pendentes com um clique, atualizando o status do serviço para "Pago" e o fluxo de caixa.

### 📊 Dashboard de Análises Financeiras
A página "Histórico" é um dashboard interativo para análise de performance, baseado em conceitos financeiros sólidos.

#### Entendendo as Métricas
- **Lucro Líquido (Competência):** Calculado a partir do DRE, mostra o lucro real do período, considerando quando a venda/despesa ocorreu, não quando o dinheiro foi movimentado.
- **Caixa Gerado:** O resultado do DFC, mostrando o saldo líquido do dinheiro que efetivamente entrou e saiu do caixa no período.
- **Ticket Médio:** Valor médio por serviço concluído, indicando o quanto, em média, cada cliente gasta.
- **Ponto de Equilíbrio:**
  - **Lógica de Cálculo:** Este KPI é calculado com base nos dados **do mês anterior completo**. Isso fornece uma meta de faturamento estável e realista para o mês atual.
  - **Fórmula:** `Custos Fixos Totais / Índice da Margem de Contribuição`. Se não houver dados de custos e receitas do mês anterior, ele será zero.
- **Contas a Receber / Pagar (Próximos 30 dias):** Um resumo dos compromissos futuros, retirados diretamente do gráfico de Projeção de Caixa.

#### Gráficos
- **DRE (Demonstrativo de Resultado):** Visão pelo **Regime de Competência**. Mostra a "fotografia" econômica do resultado da empresa no período (Receita - Custos - Despesas = Lucro).
- **DFC (Demonstrativo de Fluxo de Caixa):** Visão pelo **Regime de Caixa**. Mostra o "filme" do dinheiro, ou seja, o que foi efetivamente recebido e pago.
- **Fluxo de Caixa Projetado:** Um "farol alto" que mostra as contas a pagar e a receber já compromissadas para os próximos 30 dias, permitindo antecipar necessidades de caixa.
- **Gráfico "Top 10":** Análise de performance que pode ser alternada para exibir os itens mais rentáveis, os clientes que mais compram ou os mecânicos mais produtivos.

### 🔒 Segurança e Controle de Acesso
- **Autenticação Segura:** Login com senhas criptografadas (PBKDF2).
- **Perfis de Acesso (RBAC):**
  - **Admin:** Controle total do sistema.
  - **Financeiro:** Gestão de fluxo de caixa, pagamentos e clientes.
  - **Mecânico:** Foco em ordens de serviço e orçamentos, sem visualização de dados financeiros sensíveis.
- **Gestão de Usuários:** Interface para administradores cadastrarem sua equipe e definirem permissões.

### ⚙️ Arquitetura e Configurações
- **Banco de Dados SQLite:** Todos os dados são armazenados localmente (`oficina.db`), garantindo performance e integridade.
- **Persistência de Dados:** O banco de dados e as imagens (logo, assinatura) são salvos de forma segura na pasta de dados do usuário (`%APPDATA%`), garantindo que não se percam em atualizações.
- **Arquivamento (Soft Delete):** Nenhum dado crítico é excluído permanentemente. Tudo é arquivado e pode ser gerenciado na tela de Configurações.
- **Página de Configurações:** Permite personalizar dados da empresa, logo, assinatura, taxas de juros, prazo de liquidação de cartão e margem de lucro sobre peças.

## 🛠️ Tecnologias Utilizadas

- **Backend/Desktop:** Electron.js, Node.js
- **Banco de Dados:** `better-sqlite3` (SQLite)
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **UI/Estilização:** Bootstrap 5
- **Gráficos:** Chart.js
- **Testes:** Jest e Cypress

## 🚀 Instalação e Execução

Siga os passos abaixo para executar o projeto em seu ambiente de desenvolvimento.

#### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **Git**

#### Passos

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/CRUD-Oficina-Mecanica.git
    cd CRUD-Oficina-Mecanica
    ```

2.  **Instale as dependências:**
    Este comando instalará todas as dependências listadas no `package.json`.
    ```bash
    npm install
    ```
    *Nota: Se ocorrer um erro relacionado ao `better-sqlite3`, pode ser necessário recompilá-lo para a versão do Electron com o comando `npx electron-rebuild`.*

3.  **Execute a aplicação em modo de desenvolvimento:**
    Para abrir a aplicação e testar as funcionalidades.
    ```bash
    ```bash
    npm start
    ```

4.  **Login Inicial:**
    Ao iniciar o sistema pela primeira vez, use as credenciais padrão de administrador:
    *   **Usuário:** `admin`
    *   **Senha:** `admin`
    *   *Nota: Recomenda-se alterar esta senha ou criar um novo usuário admin imediatamente.*

### Scripts Disponíveis

-   **Testes Unitários:**
    ```bash
    npm test
    ```

-   **Testes End-to-End:**
    ```bash
    npm run cypress:open
    ```

-   **Build para Produção:**
    Para gerar um instalador para Windows (NSIS). O arquivo final estará na pasta `dist/`.
    ```bash
    npm run dist
    ```

## 💡 Detalhes Técnicos Notáveis

-   **Sistema de Migração Versionado:** A evolução do esquema do banco de dados é gerenciada por um sistema de migração robusto, utilizando a biblioteca `@blackglory/better-sqlite3-migrations`. As alterações no esquema são definidas em arquivos `.sql` versionados (ex: `001-initial-schema.sql`) dentro da pasta `migrations/`. Na inicialização, a aplicação lê esses arquivos e os aplica sequencialmente, garantindo que a estrutura do banco de dados seja sempre consistente e evolua de forma controlada entre diferentes versões da aplicação.

-   **Arquitetura de Testes E2E com Cypress:** A suíte de testes end-to-end foi reescrita para garantir estabilidade e manutenibilidade. A arquitetura se baseia em:
    1.  **Page Object Model (POM):** Para abstrair seletores e ações, tornando os testes mais legíveis.
    2.  **Stubs de Duas Fases:** A API do Electron (`window.api`) é simulada no hook `onBeforeLoad`, enquanto funções da UI (como modais) são simuladas com `cy.window().then(...)` para evitar condições de corrida. Isso cria um ambiente de teste isolado e determinístico.
    *Nota: Um bug na funcionalidade de paginação de algumas telas foi identificado e isolado, com os testes focando na lógica de negócio principal.*

-   **Mitigação de Vulnerabilidades XSS:** Para prevenir ataques de Cross-Site Scripting, o uso de `innerHTML` para renderizar dados do usuário foi substituído em toda a aplicação pela manipulação segura do DOM (`document.createElement`, `element.textContent`). Testes unitários específicos em `__tests__/xss.test.js` validam que payloads maliciosos são corretamente sanitizados.

-   **Lógica Financeira de Duplo Regime (Caixa e Competência):** O sistema implementa uma distinção clara entre o Regime de Caixa (focado na `data_liquidacao` dos pagamentos) e o de Competência (focado na `data_competencia` dos eventos). Isso permite a geração de relatórios DRE e DFC precisos, oferecendo uma visão completa da saúde financeira.

-   **Arquitetura de Comunicação Segura (IPC):** A comunicação entre o backend (processo `main`) e o frontend (processo `renderer`) segue as melhores práticas de segurança do Electron. O `preload.js` atua como uma ponte segura (`contextBridge`), expondo apenas uma API específica e controlada, mantendo o `contextIsolation` ativado.

-   **Diagnóstico de Erros em Produção:** O sistema possui um logger de arquivo (`main.log`) que captura e persiste todas as mensagens de console e exceções não tratadas que ocorrem no ambiente do usuário. Isso é crucial para diagnosticar problemas que não são reproduzíveis em desenvolvimento.

-   **Sistema de Arquivamento (Soft Delete):** Nenhuma informação crítica (clientes, veículos, serviços) é excluída permanentemente. Em vez disso, os registros são marcados como arquivados (`is_deleted = 1`) e filtrados em todas as consultas. O sistema fornece uma interface na tela de "Configurações" para gerenciar, restaurar ou excluir permanentemente esses itens.

-   **Inputs de Moeda Flexíveis:** Os campos de valor monetário utilizam `type="text"` para permitir a formatação de máscara em tempo real, melhorando a UX. A conversão para valores numéricos é tratada de forma robusta com funções utilitárias para garantir a integridade dos dados.

## 👨‍💻 Sobre o Autor

Este projeto foi desenvolvido por **Peterson Weschenfelder do Amaral**, como parte de seus estudos em Análise e Desenvolvimento de Sistemas.