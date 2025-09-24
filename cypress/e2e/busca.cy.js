describe('Testes de Busca', () => {
  let mockApi;
  const mockClients = [
    { nome: 'João da Silva', documento: '111.111.111-11', email: 'joao@test.com', telefone: '1111-1111' },
    { nome: 'Maria Oliveira', documento: '222.222.222-22', email: 'maria@test.com', telefone: '2222-2222' }
  ];
  const mockVehicles = [
    { cliente: 'João da Silva', marca: 'Fiat', modelo: 'Uno', ano: '2010', placa: 'ABC-1234' },
    { cliente: 'Maria Oliveira', marca: 'Chevrolet', modelo: 'Onix', ano: '2022', placa: 'XYZ-5678' }
  ];

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      writeData: cy.stub().as('writeData'),
      searchData: cy.stub().as('searchData'),
      editData: cy.stub().as('editData'),
      deleteData: cy.stub().as('deleteData'),
    };

    // Mock para carregamento inicial de dados
    mockApi.readData.withArgs('clientes.json').resolves(mockClients);
    mockApi.readData.withArgs('veiculos.json').resolves(mockVehicles);

    cy.visit('clientes-veiculos.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
      },
    });
  });

  context('Busca de Clientes e Veículos', () => {
    it('Deve buscar um cliente pelo nome', () => {
      const searchTerm = 'João';
      const searchField = 'nome';
      const searchResult = [mockClients[0]];

      // Mock da função de busca
      mockApi.searchData.withArgs('clientes.json', searchTerm, searchField).resolves(searchResult);
      mockApi.searchData.withArgs('veiculos.json', searchTerm, '').resolves([]); // Busca de veículos retorna vazio

      // Realiza a busca
      cy.get('#inputBusca').type(searchTerm);
      cy.get('#campoBusca').select(searchField);
      cy.get('button:contains("Buscar")').click();

      // Verifica a chamada da API
      cy.get('@searchData').should('have.been.calledWith', 'clientes.json', searchTerm, searchField);

      // Verifica se a tabela de clientes foi atualizada com o resultado
      cy.get('#lista-clientes').should('contain', 'João da Silva');
      cy.get('#lista-clientes').should('not.contain', 'Maria Oliveira');
    });

    it('Deve buscar um veículo pela placa', () => {
      const searchTerm = 'ABC-1234';
      const searchField = 'placa';
      const searchResult = [mockVehicles[0]];

      // Mock da função de busca
      mockApi.searchData.withArgs('clientes.json', searchTerm, '').resolves([]); // Busca de clientes retorna vazio
      mockApi.searchData.withArgs('veiculos.json', searchTerm, searchField).resolves(searchResult);

      // Realiza a busca
      cy.get('#inputBusca').type(searchTerm);
      cy.get('#campoBusca').select(searchField);
      cy.get('button:contains("Buscar")').click();

      // Verifica a chamada da API
      cy.get('@searchData').should('have.been.calledWith', 'veiculos.json', searchTerm, searchField);

      // Verifica se a tabela de veículos foi atualizada com o resultado
      cy.get('#lista-veiculos').should('contain', 'ABC-1234');
      cy.get('#lista-veiculos').should('not.contain', 'XYZ-5678');
    });

    it('Deve limpar a busca e mostrar todos os dados novamente', () => {
      // Simula uma busca inicial que retorna um resultado filtrado
      mockApi.searchData.withArgs('clientes.json', 'João', 'nome').resolves([mockClients[0]]);
      mockApi.searchData.withArgs('veiculos.json', 'João', '').resolves([]);

      cy.get('#inputBusca').type('João');
      cy.get('#campoBusca').select('nome');
      cy.get('button:contains("Buscar")').click();

      // Garante que o resultado foi filtrado
      cy.get('#lista-clientes').should('not.contain', 'Maria Oliveira');

      // Mock para a chamada de `carregarClientesEVeiculos` que acontece ao limpar
      // A função `carregarClientesEVeiculos` chama `buscarDados` que por sua vez chama `searchData` com termos vazios
      mockApi.searchData.withArgs('clientes.json', '', '').resolves(mockClients);
      mockApi.searchData.withArgs('veiculos.json', '', '').resolves(mockVehicles);

      // Clica no botão de limpar
      cy.get('button:contains("Limpar")').click();

      // Verifica se os campos de busca foram limpos
      cy.get('#inputBusca').should('have.value', '');
      cy.get('#campoBusca').should('have.value', '');

      // Verifica se as tabelas foram recarregadas com todos os dados
      cy.get('#lista-clientes').should('contain', 'João da Silva');
      cy.get('#lista-clientes').should('contain', 'Maria Oliveira');
      cy.get('#lista-veiculos').should('contain', 'ABC-1234');
      cy.get('#lista-veiculos').should('contain', 'XYZ-5678');
    });
  });
});
