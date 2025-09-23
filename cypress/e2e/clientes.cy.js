describe('Fase 1: Testes de Clientes e Veículos', () => {
  let mockApi; // Declarado aqui para ser acessível em todo o describe

  beforeEach(() => {
    // Inicializa o mock com novos stubs para cada teste
    mockApi = {
      readData: cy.stub().as('readData'),
      writeData: cy.stub().as('writeData'),
      searchData: cy.stub().as('searchData'),
      // showAlert não é mockado, pois a função real manipula o DOM
      editData: cy.stub().as('editData'),
      deleteData: cy.stub().as('deleteData'),
    };

    // Configura o mock para a função de carregar dados
    mockApi.readData.withArgs('clientes.json').resolves([]);
    mockApi.readData.withArgs('veiculos.json').resolves([]);
    mockApi.searchData.withArgs('clientes.json', '', '').resolves([]);
    mockApi.searchData.withArgs('veiculos.json', '', '').resolves([]);
    
    // Visita a página e injeta o mock
    cy.visit('clientes-veiculos.html', {
      onBeforeLoad(win) {
        // Funções da API do Electron são mockadas
        win.api = mockApi;
        // A função showAlert do renderer.js é mantida, mas podemos espiá-la se necessário
        // cy.spy(win, 'showAlert').as('showAlertSpy');
      },
    });
  });

  context('CRUD de Clientes', () => {
    it('Deve cadastrar um novo cliente com sucesso', () => {
      // Dados do novo cliente
      const novoCliente = {
        nome: 'João da Silva',
        telefone: '(11) 99999-8888', // Corrigido para formato com máscara
        email: 'joao.silva@example.com',
        documento: '215.682.573-41',
        endereco: 'Rua dos Testes, 123',
        cidade: 'São Paulo',
        bairro: 'Vila Teste',
        cep: '01234-567'
      };

      // Preenche o formulário de cadastro de cliente
      cy.get('#nomeCliente').type(novoCliente.nome);
      cy.get('#telefoneCliente').type('11999998888');
      cy.get('#emailCliente').type(novoCliente.email);
      cy.get('#documentoCliente').type(novoCliente.documento);
      cy.get('#enderecoCliente').type(novoCliente.endereco);
      cy.get('#cidadeCliente').type(novoCliente.cidade);
      cy.get('#bairroCliente').type(novoCliente.bairro);
      cy.get('#cepCliente').type(novoCliente.cep);

      // Configura o stub EXISTENTE de readData para se comportar dinamicamente
      mockApi.readData
        .withArgs('veiculos.json').resolves([]) // Mock para veículos não muda
        .withArgs('clientes.json')
          .onFirstCall().resolves([]) // Na 1ª chamada (verificação de existência), retorna []
          .onSecondCall().resolves([novoCliente]); // Na 2ª chamada (atualização da tabela), retorna o novo cliente

      // Simula o retorno da função writeData
      mockApi.writeData.resolves(true);

      // Clica no botão para salvar o cliente
      cy.get('#form-cliente button[type="submit"]').click();

      // Verifica se a função de salvar foi chamada com os dados corretos
      cy.get('@writeData').should('have.been.calledWith', 'clientes.json', Cypress.sinon.match(
        (clientes) => clientes.length === 1 && clientes[0].documento === novoCliente.documento
      ));

      // Verifica se a mensagem de sucesso foi exibida no DOM
      cy.get('#alert-container').should('contain', '✅ Cliente salvo com sucesso!');

      // Verifica se o novo cliente é exibido na tabela
      cy.get('#lista-clientes').should('contain', novoCliente.nome);
      cy.get('#lista-clientes').should('contain', novoCliente.telefone); // Agora com a máscara
      cy.get('#lista-clientes').should('contain', novoCliente.email);
      cy.get('#lista-clientes').should('contain', novoCliente.documento);
    });
  });
});
