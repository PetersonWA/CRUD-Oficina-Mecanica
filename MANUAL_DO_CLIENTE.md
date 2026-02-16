# Manual do Usuário - Oficina ADM

Bem-vindo ao **Oficina ADM**, seu sistema completo de gestão para oficina mecânica. Este guia foi elaborado para orientá-lo passo a passo no uso de todas as funcionalidades, desde o primeiro acesso até a análise financeira avançada.

---

## 1. Acesso e Primeiros Passos

### Login no Sistema
Ao abrir o aplicativo, você será recebido pela tela de login.
1.  Insira seu **Usuário** e **Senha**.
2.  **Credenciais Iniciais:** Se for seu primeiro acesso, use `admin` para usuário e senha.
3.  Clique em **Entrar**.

### Configurações Iniciais da Oficina
Antes de começar a operar, personalize o sistema com a identidade da sua empresa. Isso garante que orçamentos e relatórios saiam com seus dados.

1.  No menu lateral esquerdo, clique no ícone de engrenagem (**Configurações**).
2.  **Dados da Empresa:** Preencha Nome, Endereço, Telefone e CNPJ.
3.  **Personalização:**
    *   Clique em "Carregar Logo" para adicionar o logotipo da sua oficina.
    *   Clique em "Carregar Assinatura" para adicionar uma assinatura digitalizada (opcional).
4.  **Financeiro:**
    *   Defina a **Taxa de Juros Mensal** (se você cobrar juros no parcelamento).
    *   Configure o **Prazo de Liquidação de Cartão** (dias para o dinheiro cair na conta).
    *   Defina a **Margem de Lucro Padrão sobre Peças**.
5.  Clique em **Salvar Configurações**.

---

## 2. Fluxo Principal de Trabalho

O dia a dia da oficina segue um fluxo lógico: Cadastro -> Orçamento -> Serviço -> Pagamento.

### Passo 1: Cadastrar Clientes e Veículos
1.  Acesse o menu **Clientes e Veículos**.
2.  **Cliente:** Preencha o Nome Completo, CPF (o sistema valida automaticamente), Telefone e Endereço.
3.  Clique em **Salvar Cliente**.
4.  **Veículo:** Agora, no formulário de veículos (logo abaixo), busque e selecione o cliente que você acabou de cadastrar.
5.  Insira os dados do veículo: Placa, Modelo, Marca, Cor, Ano e Quilometragem.
6.  Clique em **Salvar Veículo**.

### Passo 2: Criar um Orçamento
1.  Vá para a tela **Orçamento** (menu lateral).
2.  **Cliente e Veículo:** Digite o nome do cliente no campo de busca e selecione-o. Em seguida, selecione o veículo correspondente no campo ao lado. As informações do veículo serão carregadas automaticamente.
3.  **Adicionar Itens:**
    *   Use os botões para adicionar **Peças** ou **Mão de Obra**.
    *   Descreva o item, quantidade e valor.
    *   *Nota:* O valor total é calculado automaticamente, então insira o valor unitário.
4.  **Finalizar:**
    *   Clique em **Gerar PDF** para visualizar, imprimir ou salvar o documento para enviar ao cliente e registrar no sistema.

### Passo 3: Aprovar Orçamento e Transformar em OS
Quando o cliente aprova o serviço:
1.  Acesse **Gerenciar Orçamentos**.
2.  Encontre o orçamento na lista e clique no botão de **Editar** (ícone de lápis).
3.  Altere o **Status** para **Aprovado** e clique em **Salvar Alterações**.
4.  De volta à lista de orçamentos, localize o item aprovado e clique no botão **Converter em OS** (ícone verde com um "check" <i class="bi bi-check-circle"></i>).
5.  Você será redirecionado para a tela de **Cadastro de Serviço** com os dados pré-preenchidos. Revise os itens e defina as **Informações de Pagamento**.
6.  Clique em **Salvar Serviço**.

**Opção Rápida:** Para atendimentos rápidos ou clientes sem cadastro prévio, você pode usar a tela **OS Manual** no menu.

---

## 3. Gestão de Serviços

Acompanhe o andamento dos trabalhos na oificina.

1.  Acesse **Gerenciar Serviços**.
2.  Aqui você vê todas as OS abertas.
3.  Use os filtros para ver apenas o que está "Em Andamento" ou "Pendente".
4.  Ao terminar o trabalho no carro, edite o serviço e mude o Status para **Concluído**.

---

## 4. Gestão Financeira

O sistema oferece controle total sobre suas receitas e despesas.

### Contas a Receber (Gerenciar Pagamentos)
1.  Acesse **Gerenciar Pagamentos**.
2.  Aqui você vê todas as parcelas de todos os serviços.
3.  **Dar Baixa:** Quando receber um pagamento (ou quando o cartão cair na conta), clique no botão de "check" (<i class="bi bi-check-circle"></i>) ao lado da parcela.
    *   Isso muda o status para **Pago** e lança o valor no seu caixa.

### Lançar Despesas
Registre tudo o que sai do caixa para ter um saldo real.
1.  Vá em **Lançar Despesas**.
2.  Escolha o tipo de despesa:
    *   **Deduções:** Impostos, taxas de cartão.
    *   **Custos Operacionais:** Peças compradas, comissões.
    *   **Despesas Gerais:** Aluguel, luz, água, internet.
3.  Preencha o valor e a data de vencimento.
4.  **Recorrência:** Marque "Repetir mensalmente" se for uma conta fixa, e o sistema já lança para os próximos meses.

### Lançar Receitas Avulsas
Vendeu uma peça no balcão sem abrir OS?
1.  Vá em **Receitas Avulsas**.
2.  Registre a venda rapidamente para que o valor entre no seu caixa.

---

## 5. Análise de Resultados (Dashboard)

Acesse a tela **Histórico** para ter uma visão de "Dono do Negócio".

*   **KPIs (Indicadores):** Veja rapidamente seu Faturamento Bruto, Lucro Líquido e Ticket Médio.
*   **DRE (Competência):** Entenda se sua operação está dando lucro ou prejuízo, considerando as vendas do mês (mesmo que parceladas).
*   **Fluxo de Caixa (Caixa):** Entenda a disponibilidade real de dinheiro na sua conta hoje.
*   **Projeção:** Veja no gráfico de barras o que você tem **A Receber** vs **A Pagar** nos próximos 30 dias.
*   **Top 10:** Descubra quais são seus melhores clientes, serviços mais rentáveis ou mecânicos mais produtivos.

---

## Dicas Extras
*   **Arquivamento:** Se precisar excluir um cliente ou serviço antigo, o sistema irá "arquivá-lo" para segurança. Você pode ver itens arquivados nas Configurações.
*   **Suporte:** Em caso de dúvidas, o administrador do sistema pode consultar os logs para diagnóstico.
