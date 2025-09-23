
describe('Navegação Principal', () => {
  beforeEach(() => {
    // Intercepta a chamada para a leitura do arquivo de configuração e retorna um mock
    cy.intercept('GET', '**/configuracao.json', { fixture: 'configuracao.json' }).as('getConfig');
    
    // Garante que o mock da API do Electron esteja no lugar ANTES de a página carregar
    cy.on('window:before:load', (win) => {
      // Simula a API do Electron que não está disponível no navegador de teste
      win.api = {
        readData: cy.stub().resolves([]), // Mock genérico para qualquer leitura
        writeData: cy.stub().resolves(true),
        searchData: cy.stub().resolves([]),
        editData: cy.stub().resolves(true),
        deleteData: cy.stub().resolves(true),
        saveFile: cy.stub().resolves(null),
        Buffer: { from: cy.stub() },
        send: cy.stub(),
        receive: cy.stub()
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
      { linkText: 'Histórico', expectedUrl: 'historico-servicos.html' },
      { linkText: 'Configurações', expectedUrl: 'configuracoes.html' }
    ];

    pages.forEach(page => {
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
      { cardTitle: 'Gerenciar Orçamentos', expectedUrl: 'gerenciar-orcamentos.html' }
    ];

    cards.forEach(card => {
      cy.contains('h5', card.cardTitle).click();
      cy.url().should('include', card.expectedUrl);
      cy.visit('index.html'); // Volta para a página inicial para o próximo teste de cartão
    });
  });

  it('deve expandir e recolher a barra lateral', () => {
    // Verifica o estado inicial (expandido)
    cy.get('#sidebar').should('not.have.class', 'collapsed');

    // Clica para recolher
    cy.get('#sidebar-toggle').click();
    cy.get('#sidebar').should('have.class', 'collapsed');

    // Clica no ícone da marca para expandir
    cy.get('.sidebar-header .navbar-brand').click();
    cy.get('#sidebar').should('not.have.class', 'collapsed');
  });
});
