# Oficina ADM - Sistema de Gestão para Oficinas

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Um sistema de desktop completo, construído com Electron.js, para a gestão moderna e eficiente de oficinas mecânicas.

## ✨ Funcionalidades Principais

O sistema foi arquitetado para ser uma solução robusta e centralizada, cobrindo desde o cadastro de clientes até a análise financeira do negócio.

#### 🚗 Gestão de Clientes e Veículos
- CRUD completo para clientes e veículos.
- Validação de dados em tempo real (CPF/CNPJ, Placa Mercosul/antiga, ano do veículo).
- Máscaras de entrada para guiar o preenchimento de formulários.

#### 📄 Orçamentos e Ordens de Serviço (OS)
- Criação de orçamentos detalhados, com separação de Peças e Mão de Obra.
- Conversão de orçamentos aprovados em Ordens de Serviço.
- Ferramenta de OS Manual para serviços rápidos em clientes não cadastrados.
- Geração de PDF para orçamentos e OS, com layout profissional, incluindo logo e assinatura da oficina.

#### 💰 Gestão Financeira
- Separação clara entre status do serviço (Ex: "Concluído") e status do pagamento (Ex: "Pago", "Pendente").
- Módulo de "Gerenciar Pagamentos" para controle de caixa.
- **Sistema de Juros Configurável:** Defina taxas de juros e número de parcelas sem juros para vendas no cartão.
- **Cálculo de Parcelas (Tabela Price):** O valor das parcelas é calculado automaticamente com base nas taxas definidas.
- **Automação de Pagamento:** Ao lançar um serviço em "Cartão de Crédito", o sistema já o marca como "Pago" e lança o pagamento correspondente.

#### 📊 Dashboard e Análises
- Página de Histórico com um dashboard interativo para análise de performance.
- **KPIs dinâmicos:** Receita Realizada, Lucro Bruto (M.O.), Valor Pendente e Ticket Médio.
- **Gráficos Interativos (Chart.js):**
  - **Receita Realizada:** Análise temporal por dia, mês ou ano, com alternância entre gráfico de barras e linhas.
  - **Composição da Receita:** Gráfico de pizza mostrando a proporção de receita vinda de "Peças" vs. "Mão de Obra".
  - **Serviços por Status:** Visão da distribuição dos serviços em "Concluído", "Em andamento", etc.
  - **Top 10 Itens:** Ranking dos itens (peças ou serviços) que mais geram faturamento.
- **Geração de Relatório:** Resumo em texto dos principais indicadores com base nos filtros aplicados.

#### ⚙️ Arquitetura e Configurações
- **Banco de Dados SQLite:** Todos os dados são armazenados em um banco de dados local (`oficina.db`), garantindo performance e integridade.
- **Persistência de Dados:** O banco de dados e as imagens (logo, assinatura) são salvos de forma segura na pasta de dados do usuário (`%APPDATA%`), e não junto com a aplicação.
- **Sistema de Arquivamento (Soft Delete):** Nenhum dado crítico (cliente, veículo, serviço) é excluído permanentemente por acidente. Eles são arquivados e podem ser restaurados ou excluídos de forma definitiva em uma área de gerenciamento.
- **Página de Configurações:** Permite personalizar nome da oficina, endereço, CNPJ, logo, assinatura e todas as taxas de juros.

#### 🧪 Testes
- **Testes Unitários com Jest:** Cobertura de teste para as principais funções de validação de dados.
- **Testes End-to-End com Cypress:** Testes automatizados para garantir que os fluxos principais da aplicação funcionem como esperado.

## 🛠️ Tecnologias Utilizadas

- **Backend/Desktop:** Electron.js, Node.js
- **Banco de Dados:** `better-sqlite3` (SQLite)
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **UI/Estilização:** Bootstrap 5
- **Gráficos:** Chart.js
- **Geração de PDF:** `jspdf` e `jspdf-autotable`
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

3.  **Execute a aplicação em modo de desenvolvimento:**
    Para abrir a aplicação e testar as funcionalidades. O Electron irá recarregar a aplicação automaticamente caso alterações sejam feitas nos arquivos.
    ```bash
    npm start
    ```

### Scripts Disponíveis

-   **Testes Unitários:**
    Para rodar a suíte de testes do Jest.
    ```bash
    npm test
    ```

-   **Testes End-to-End:**
    Para abrir o painel do Cypress e rodar os testes de integração.
    ```bash
    npm run cypress:open
    ```

-   **Build para Produção:**
    Para gerar um instalador da aplicação para o seu sistema operacional (configurado para Windows - NSIS). O arquivo final estará na pasta `dist/`.
    ```bash
    npm run dist
    ```

## 👨‍💻 Sobre o Autor

Este projeto foi desenvolvido por **Peterson Weschenfelder do Amaral**, como parte de seus estudos em Análise e Desenvolvimento de Sistemas.