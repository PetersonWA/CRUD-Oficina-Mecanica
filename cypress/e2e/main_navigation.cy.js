describe('Navegação Principal', () => {
  beforeEach(() => {
    // Mock para a API do Electron, simulando as chamadas ao backend.
    // Para um teste de navegação, só precisamos garantir que as páginas carreguem sem erros.
    cy.on('window:before:load', (win) => {
      win.api = {
        // Mock para funções de leitura de dados, retornando arrays vazios
        getServicos: cy.stub().resolves([]),
        getClientes: cy.stub().resolves([]),
        getVeiculos: cy.stub().resolves([]),
        getOrcamentos: cy.stub().resolves([]),
        getPagamentos: cy.stub().resolves([]),
        getPlanoContas: cy.stub().resolves([]),
        getDespesas: cy.stub().resolves([]),
        getReceitasAvulsas: cy.stub().resolves([]),
        
        // Mock para configurações, retornando um objeto de configuração padrão
        getConfig: cy.stub().resolves({
          percentual_lucro_pecas: 30,
          taxa_juros_inicial: 2.99,
          acrescimo_juros_parcela: 1.0,
          prazo_liquidacao_cartao: 30,
          formas_pagamento_orcamento: 'Dinheiro, PIX, Cartão de Crédito'
        }),

        // Mock genérico para outras chamadas que não precisam de retorno específico
        send: cy.stub(),
        receive: cy.stub().returns(() => {}), // Retorna uma função vazia para evitar erros
        invoke: cy.stub().resolves({}), // Para handlers que esperam uma promessa
      };
    });

    // Visita a página inicial após o setup do mock
    cy.visit('index.html');
  });

  it('deve navegar corretamente para cada página a partir da barra lateral', () => {
    const pages = [
      { linkText: 'Início', expectedUrl: 'index.html' },
      { linkText: 'Cadastrar Serviço', expectedUrl: 'cadastro-servico.html' },
      { linkText: 'OS Manual', expectedUrl: 'os-manual.html' },
      { linkText: 'Clientes e Veículos', expectedUrl: 'clientes-veiculos.html' },
      { linkText: 'Orçamento', expectedUrl: 'orcamento-mecanico.html' },
      { linkText: 'Gerenciar Orçamentos', expectedUrl: 'gerenciar-orcamentos.html' },
      { linkText: 'Gerenciar Serviços', expectedUrl: 'gerenciar-servicos.html' },
      { linkText: 'Gerenciar Pagamentos', expectedUrl: 'gerenciar-pagamentos.html' },
      { linkText: 'Lançar Receita', expectedUrl: 'receitas-avulsas.html' },
      { linkText: 'Lançar Despesa', expectedUrl: 'despesas.html' },
      { linkText: 'Histórico', expectedUrl: 'historico-servicos.html' },
      { linkText: 'Configurações', expectedUrl: 'configuracoes.html' }
    ];

    pages.forEach(page => {
      // Garante que o sidebar esteja visível antes de clicar
      cy.get('body').then($body => {
        if ($body.find('#sidebar.collapsed').length) {
            cy.get('.sidebar-header .navbar-brand').click();
        }
      });
      cy.get('#sidebar').contains(page.linkText).click();
      cy.url().should('include', page.expectedUrl);
    });
  });

  it('deve navegar corretamente para cada página a partir dos cartões do painel', () => {
    const cards = [
      { cardTitle: 'Novo Serviço', expectedUrl: 'cadastro-servico.html' },
      { cardTitle: 'Gerenciar Serviços', expectedUrl: 'gerenciar-servicos.html' },
      { cardTitle: 'Histórico', expectedUrl: 'historico-servicos.html' },
      { cardTitle: 'Clientes e Veículos', expectedUrl: 'clientes-veiculos.html' },
      { cardTitle: 'Orçamentos', expectedUrl: 'orcamento-mecanico.html' },
      { cardTitle: 'OS Manual', expectedUrl: 'os-manual.html' },
      { cardTitle: 'Configurações', expectedUrl: 'configuracoes.html' },
      { cardTitle: 'Gerenciar Orçamentos', expectedUrl: 'gerenciar-orcamentos.html' },
      { cardTitle: 'Lançar Despesa', expectedUrl: 'despesas.html' },
      { cardTitle: 'Lançar Receita', expectedUrl: 'receitas-avulsas.html' }
    ];

    cards.forEach(card => {
      cy.contains('h5', card.cardTitle).click();
      cy.url().should('include', card.expectedUrl);
      cy.visit('index.html'); // Volta para a página inicial para o próximo teste de cartão
    });
  });

  it('deve expandir e recolher a barra lateral', () => {
    // Garante que a sidebar comece expandida
    cy.get('#sidebar').should('not.have.class', 'collapsed');

    // Clica para recolher
    cy.get('#sidebar-toggle').click();
    cy.get('#sidebar').should('have.class', 'collapsed');

    // Clica no ícone da marca para expandir
    cy.get('.sidebar-header .navbar-brand').click();
    cy.get('#sidebar').should('not.have.class', 'collapsed');
  });
});
