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
    npm start
    ```

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

## 👨‍💻 Sobre o Autor

Este projeto foi desenvolvido por **Peterson Weschenfelder do Amaral**, como parte de seus estudos em Análise e Desenvolvimento de Sistemas.