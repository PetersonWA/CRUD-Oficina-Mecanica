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
      writeData: cy.stub().as('writeData'), // Adicionado para simular a chamada real
      saveFile: cy.stub().as('saveFile'),
    };

    // Mock para carregar as configurações iniciais
    mockApi.readData.withArgs('configuracao.json').resolves(initialConfig);
    // Mock para o salvamento de dados e arquivos
    mockApi.writeData.resolves(true); // A função real salvarDados chama writeData
    mockApi.saveFile.resolves('/novo/path/para/imagem.png');

    cy.visit('configuracoes.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
        // Mantemos as funções globais de renderer.js e apenas mockamos a camada da API
        win.lerDados = win.lerDados; 
        win.salvarDados = win.salvarDados;
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

    // Anexa um arquivo de imagem
    cy.get('#logo').selectFile('data/logo.png', { action: 'drag-drop', force: true });

    // Verifica o preview da imagem
    cy.get('#logo-preview').should('have.attr', 'src').and('match', /^data:image\/.*;base64,/);

    // Clica para salvar
    cy.get('#config-form').submit();

    // Verifica se a API para salvar o arquivo foi chamada
    cy.get('@saveFile').should('have.been.called');

    // Verifica se a API para salvar os dados de configuração foi chamada com os dados corretos
    cy.get('@writeData').should('have.been.calledWith', 'configuracao.json', Cypress.sinon.match({
      nomeOficina: newConfigData.nomeOficina, // Novo nome
      email: newConfigData.email,           // Novo email
      logoPath: '/novo/path/para/imagem.png', // Caminho retornado pelo mock de saveFile
      assinaturaPath: initialConfig.assinaturaPath // Assinatura deve ser mantida
    }));

    // Verifica a mensagem de sucesso
    cy.get('#alert-container').should('contain', '✅ Configurações salvas com sucesso!');
  });

  it('Deve excluir a imagem da assinatura', () => {
    // Clica no botão de excluir assinatura para abrir o modal
    cy.get('#delete-assinatura').click();

    // Aguarda o modal de confirmação ficar visível e clica em "Confirmar"
    cy.get('#modalConfirmarExclusao').should('be.visible');
    cy.get('#btnConfirmarExclusao').click();

    // Verifica se o preview voltou para o placeholder
    cy.get('#assinatura-preview').should('have.attr', 'src').and('match', /^data:image\/svg\+xml,/);

    // Salva o formulário
    cy.get('#config-form').submit();

    // Verifica se os dados foram salvos sem o caminho da assinatura
    cy.get('@writeData').should('have.been.calledWith', 'configuracao.json', Cypress.sinon.match({
      assinaturaPath: '' // O caminho da assinatura deve estar vazio
    }));

    cy.get('#alert-container').should('contain', '✅ Configurações salvas com sucesso!');
  });
});
