describe('Testes da Página de Configurações', () => {
  let mockApi;
  const initialConfig = {
    nomeOficina: 'Oficina Padrão',
    endereco: 'Rua dos Testes, 123',
    telefone: '(11) 98765-4321',
    email: 'contato@oficinapadrao.com',
    cnpj: '12.345.678/0001-99',
    nomeResponsavel: 'Fulano de Tal',
    logoPath: '/path/to/logo.png',
    assinaturaPath: '/path/to/assinatura.png'
  };

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      salvarDados: cy.stub().as('salvarDados'),
      saveFile: cy.stub().as('saveFile'),
    };

    // Mock para carregar as configurações iniciais
    mockApi.readData.withArgs('configuracao.json').resolves(initialConfig);
    // Mock para o salvamento de dados e arquivos
    mockApi.salvarDados.resolves(true);
    mockApi.saveFile.resolves('/novo/path/para/imagem.png');

    cy.visit('configuracoes.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
        // Sobrescreve a função global `lerDados` e `salvarDados` que são usadas no renderer.js
        win.lerDados = mockApi.readData;
        win.salvarDados = mockApi.salvarDados;
      },
    });
  });

  it('Deve carregar e exibir as configurações existentes', () => {
    cy.get('#nomeOficina').should('have.value', initialConfig.nomeOficina);
    cy.get('#endereco').should('have.value', initialConfig.endereco);
    cy.get('#telefone').should('have.value', initialConfig.telefone);
    cy.get('#email').should('have.value', initialConfig.email);
    cy.get('#cnpj').should('have.value', initialConfig.cnpj);
    cy.get('#nomeResponsavel').should('have.value', initialConfig.nomeResponsavel);
    cy.get('#logo-preview').should('have.attr', 'src').and('include', initialConfig.logoPath);
    cy.get('#assinatura-preview').should('have.attr', 'src').and('include', initialConfig.assinaturaPath);
  });

  it('Deve salvar novas informações de texto e uma nova imagem de logo', () => {
    const newConfigData = {
      nomeOficina: 'Minha Nova Oficina Super',
      email: 'novo@email.com'
    };

    // Altera os campos de texto
    cy.get('#nomeOficina').clear().type(newConfigData.nomeOficina);
    cy.get('#email').clear().type(newConfigData.email);

    // Anexa um arquivo de imagem (usando um fixture do Cypress)
    // O cypress/fixtures/example.json será tratado como um png para este teste
    cy.get('#logo').selectFile('cypress/fixtures/example.json', { action: 'drag-drop' });

    // Verifica o preview da imagem
    cy.get('#logo-preview').should('have.attr', 'src').and('match', /^data:image\/.*;base64,/);

    // Clica para salvar
    cy.get('#config-form').submit();

    // Verifica se a API para salvar o arquivo foi chamada
    cy.get('@saveFile').should('have.been.called');

    // Verifica se a API para salvar os dados de configuração foi chamada com os dados corretos
    cy.get('@salvarDados').should('have.been.calledWith', 'configuracao.json', Cypress.sinon.match({
      nomeOficina: newConfigData.nomeOficina, // Novo nome
      email: newConfigData.email,           // Novo email
      logoPath: '/novo/path/para/imagem.png', // Caminho retornado pelo mock de saveFile
      assinaturaPath: initialConfig.assinaturaPath // Assinatura deve ser mantida
    }));

    // Verifica a mensagem de sucesso
    cy.get('#alert-container').should('contain', '✅ Configurações salvas com sucesso!');
  });

  it('Deve excluir a imagem da assinatura', () => {
    // Mock da confirmação
    cy.window().then(win => {
        cy.stub(win, 'showConfirm').callsFake((message, callback) => callback());
    });

    // Clica no botão de excluir assinatura
    cy.get('#delete-assinatura').click();

    // Verifica se o preview voltou para o placeholder
    cy.get('#assinatura-preview').should('have.attr', 'src').and('contain', 'placeholder');

    // Salva o formulário
    cy.get('#config-form').submit();

    // Verifica se os dados foram salvos sem o caminho da assinatura
    cy.get('@salvarDados').should('have.been.calledWith', 'configuracao.json', Cypress.sinon.match({
      assinaturaPath: '' // O caminho da assinatura deve estar vazio
    }));

    cy.get('#alert-container').should('contain', '✅ Configurações salvas com sucesso!');
  });
});
