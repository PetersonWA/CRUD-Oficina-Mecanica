describe('Testes de Busca', () => {
  let mockApi;
  const mockClients = [
    { id: 1, nome: 'João da Silva', cpf_cnpj: '111.111.111-11', email: 'joao@test.com', telefone: '1111-1111' },
    { id: 2, nome: 'Maria Oliveira', cpf_cnpj: '222.222.222-22', email: 'maria@test.com', telefone: '2222-2222' }
  ];
  const mockVehicles = [
    { id: 101, cliente_id: 1, cliente_nome: 'João da Silva', marca: 'Fiat', modelo: 'Uno', ano: '2010', placa: 'ABC-1234', quilometragem: '10000', cor: 'Azul' },
    { id: 102, cliente_id: 2, cliente_nome: 'Maria Oliveira', marca: 'Chevrolet', modelo: 'Onix', ano: '2022', placa: 'XYZ-5678', quilometragem: '20000', cor: 'Preto' }
  ];

  beforeEach(() => {
    mockApi = {
      getClientes: cy.stub().as('getClientes'),
      getVeiculos: cy.stub().as('getVeiculos'),
      showAlert: cy.stub().as('showAlert'),
      // Outros IPCs podem ser adicionados se o frontend os chamar durante a busca
    };

    // Configuração inicial para retornar dados mockados.
    // Isso será sobrescrito ou usado nos beforeEach dos contextos.
    mockApi.getClientes.resolves(mockClients);
    mockApi.getVeiculos.resolves(mockVehicles);
  });

  context('Busca de Clientes e Veículos', () => {
    beforeEach(() => {
      // Configura os mocks para o carregamento inicial da página
      mockApi.getClientes.resolves(mockClients);
      mockApi.getVeiculos.resolves(mockVehicles);
      
      cy.visit('clientes-veiculos.html', {
        onBeforeLoad(win) {
          win.api = mockApi;
          win.showAlert = mockApi.showAlert; // Injetar showAlert também
        },
      });
    });

    it('Deve buscar um cliente pelo nome', () => {
      const searchTerm = 'João';
      const searchField = 'nome';

      // Realiza a busca
      cy.get('#inputBusca').type(searchTerm);
      cy.get('#campoBusca').select(searchField);
      cy.get('button:contains("Buscar")').click();

      // Não há mais verificação para '@readData', pois a busca é frontend

      // Verifica se a tabela de clientes foi atualizada com o resultado filtrado
      cy.get('#lista-clientes').should('contain', 'João da Silva');
      cy.get('#lista-clientes').should('not.contain', 'Maria Oliveira');
    });

    it('Deve buscar um veículo pela placa', () => {
      const searchTerm = 'ABC-1234';
      const searchField = 'placa';

      // Realiza a busca
      cy.get('#inputBusca').type(searchTerm);
      cy.get('#campoBusca').select(searchField);
      cy.get('button:contains("Buscar")').click();

      // Não há mais verificação para '@readData', pois a busca é frontend

      // Verifica se a tabela de veículos foi atualizada com o resultado
      cy.get('#lista-veiculos').should('contain', 'ABC-1234');
      cy.get('#lista-veiculos').should('not.contain', 'XYZ-5678');
    });

    it('Deve limpar a busca e mostrar todos os dados novamente', () => {
      // Realiza uma busca inicial para filtrar os dados
      cy.get('#inputBusca').type('João');
      cy.get('#campoBusca').select('nome');
      cy.get('button:contains("Buscar")').click();

      // Garante que o resultado foi filtrado
      cy.get('#lista-clientes').should('not.contain', 'Maria Oliveira');

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
