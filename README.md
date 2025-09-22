# Sistema de Gerenciamento para Oficina Mecânica

## Nome: `Peterson Weschenfelder do Amaral`

## Introdução

Este é um sistema de gerenciamento para oficinas mecânicas, desenvolvido como uma aplicação de desktop utilizando **Electron.js**. O objetivo do projeto é fornecer uma solução completa para o gerenciamento de clientes, veículos, orçamentos e ordens de serviço.

A aplicação utiliza as seguintes tecnologias:
- **Electron.js**: Para empacotar a aplicação web como um sistema de desktop.
- **HTML5, CSS3 e JavaScript (ES6+)**: Para a construção da interface e lógica da aplicação.
- **Bootstrap 5**: Para a estilização e componentes visuais.
- **Node.js**: Como base para o ambiente Electron.
- **JSON**: Para o armazenamento de dados localmente.

---

## Funcionalidades

- **Gestão de Clientes e Veículos**: Funcionalidades completas de CRUD (Criar, Ler, Atualizar, Deletar) para clientes e seus veículos.
- **Criação de Orçamentos**: Geração de orçamentos detalhados com itens, valores e cálculo de totais.
- **Gestão de Orçamentos**: Edição, exclusão e capacidade de converter um orçamento em uma ordem de serviço.
- **Criação de Ordens de Serviço**: Cadastro de novas ordens de serviço a partir de um orçamento ou do zero.
- **OS Manual**: Ferramenta para criar rapidamente uma ordem de serviço para clientes não cadastrados.
- **Geração de PDF**: Capacidade de imprimir orçamentos e ordens de serviço em formato PDF.
- **Configurações da Oficina**: Página para configurar os dados da oficina (nome, endereço, logo) que aparecem nos documentos.
- **Busca e Paginação**: Funcionalidades de busca e paginação em todas as listagens para facilitar a navegação.

---

## Estrutura do Projeto

A estrutura do projeto é organizada da seguinte forma:

```
os-oficina-mecanica-com-reactpuro/
├── data/
│   ├── clientes.json
│   ├── veiculos.json
│   ├── orcamentos.json
│   ├── servicos.json
│   └── configuracao.json
├── public/
│   └── ...
├── main.js
├── preload.js
├── renderer.js
├── index.html
├── clientes-veiculos.html
├── orcamento-mecanico.html
├── gerenciar-orcamentos.html
├── cadastro-servico.html
├── gerenciar-servicos.html
├── os-manual.html
├── configuracoes.html
├── package.json
└── README.md
```

---

## Como Executar a Aplicação

1.  Certifique-se de ter o **Node.js** instalado em sua máquina. (https://nodejs.org/)
2.  Clone este repositório.
3.  Navegue até o diretório do projeto.
4.  Instale as dependências:
    ```bash
    npm install
    ```
5.  Inicie a aplicação em modo de desenvolvimento:
    ```bash
    npm start
    ```
6.  Para gerar um instalador da aplicação, execute o comando:
    ```bash
    npm run dist
    ```

---

## Dashboard de Análises (Página de Histórico)

A página de "Histórico" funciona como um Dashboard interativo, oferecendo uma visão analítica sobre a performance da oficina. Todos os dados exibidos são atualizados dinamicamente com base nos filtros aplicados (período, cliente, etc.). Abaixo está uma explicação de cada indicador para extrair o máximo de informação.

### Indicadores Principais (KPIs)

Estes são os cartões no topo da tela, que dão um resumo rápido da saúde do negócio no período filtrado.

#### 1. Faturamento no Período
- **O que é?** A soma total em Reais (R$) de todos os serviços com status "Concluído" dentro do período selecionado.
- **Como interpretar?** É o indicador mais direto do seu resultado financeiro. Permite ver rapidamente o faturamento do dia, da semana, do mês ou de qualquer período customizado que você filtrar.

#### 2. Serviços Concluídos
- **O que é?** A contagem total de quantos serviços foram finalizados no período.
- **Como interpretar?** Ajuda a medir a produtividade e o volume de trabalho da oficina. Comparar este número com o faturamento ajuda a entender se um faturamento alto veio de muitos serviços pequenos ou de poucos serviços grandes.

#### 3. Ticket Médio
- **O que é?** O valor médio que cada serviço concluído gerou para a oficina (`Faturamento Total / Serviços Concluídos`).
- **Como interpretar?** Este número mostra a "qualidade" da sua venda.
    - **Ticket Médio Baixo:** Pode indicar que a maioria dos serviços são pequenos e de baixo valor. Ação: Treinar a equipe para oferecer serviços complementares e fazer um checklist de itens adicionais em cada veículo.
    - **Ticket Médio Alto:** Indica que você está realizando serviços de maior valor agregado, que geralmente possuem maior lucratividade. Ação: Reforçar a imagem de especialista nesses serviços.

#### 4. Taxa de Conversão
- **O que é?** A porcentagem de orçamentos que foram aprovados (ou faturados) e se tornaram um serviço.
- **Como interpretar?** Mede a eficiência do seu processo de venda e negociação.
    - **Taxa Baixa:** É um alerta. Pode significar que os preços estão altos, que os orçamentos não estão claros ou que a concorrência está mais atrativa. Ação: Investigar o motivo pelo qual os clientes não estão aprovando os orçamentos.
    - **Taxa Alta:** Excelente sinal. Indica que seus preços são competitivos e que seu atendimento gera confiança. Ação: Focar em atrair mais clientes para fazer orçamentos, já que a chance de fechar negócio é grande.

### Gráficos

#### Gráfico de Faturamento (Gráfico de Barras)
- **O que é?** Mostra a evolução do faturamento (serviços concluídos) ao longo do tempo, agrupado por dia, mês ou ano.
- **Como interpretar?** Permite identificar tendências de crescimento ou queda, além de sazonalidades (meses com mais ou menos movimento).

#### Gráfico de Status (Gráfico de Pizza)
- **O que é?** Divide todos os serviços filtrados em fatias, cada uma representando um status ("Em andamento", "Concluído", etc.).
- **Como interpretar?** É uma fotografia da sua operação. Uma fatia grande em "Aguardando peças" pode indicar problemas com fornecedores. Uma fatia grande em "Aguardando aprovação" pode significar que os clientes estão demorando para responder.

#### Top 10 Serviços Mais Realizados (Gráfico de Barras Horizontais)
- **O que é?** Um ranking que conta e exibe os 10 itens de serviço mais recorrentes em todas as ordens de serviço do período filtrado.
- **Como interpretar?** Mostra quais são os "carros-chefe" da sua oficina. Essa informação é valiosa para gerenciar o estoque de peças relacionadas a esses serviços e para criar promoções direcionadas.

---

## Melhorias Futuras

- Implementar um sistema de autenticação de usuários.
- Migrar o armazenamento de dados de arquivos JSON para um banco de dados (como SQLite ou PostgreSQL).
- Criar um módulo de controle de estoque de peças.

---

## Sobre o Autor

Este projeto foi desenvolvido por **Peterson Weschenfelder do Amaral**, estudante de **Análise e Desenvolvimento de 
Sistemas** na PUCRS. Com interesse em desenvolvimento de software, busco aplicar os conceitos aprendidos para criar 
aplicações funcionais e intuitivas.

---

## Licença

Este projeto é apenas para fins demonstrativos e educacionais.
