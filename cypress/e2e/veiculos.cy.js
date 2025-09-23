describe('Fase 1: Testes de Veículos', () => {
  let mockApi;

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      writeData: cy.stub().as('writeData'),
      searchData: cy.stub().as('searchData'),
      editData: cy.stub().as('editData'),
      deleteData: cy.stub().as('deleteData'),
    };

    // Mock para um cliente existente, para que possamos associar um veículo
    const mockClient = [{
      nome: 'João da Silva',
      telefone: '(11) 99999-8888',
      email: 'joao.silva@example.com',
      documento: '215.682.573-41',
      endereco: 'Rua dos Testes, 123',
      cidade: 'São Paulo',
      bairro: 'Vila Teste',
      cep: '01234-567'
    }];

    mockApi.readData.withArgs('clientes.json').resolves(mockClient);
    mockApi.readData.withArgs('veiculos.json').resolves([]);
    mockApi.searchData.withArgs('clientes.json', '', '').resolves(mockClient);
    mockApi.searchData.withArgs('veiculos.json', '', '').resolves([]);

    cy.visit('clientes-veiculos.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
      },
    });
  });

  context('CRUD de Veículos', () => {
    it('Deve cadastrar um novo veículo com sucesso', () => {
      const novoVeiculo = {
        cliente: 'João da Silva',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: '2010',
        placa: 'ABC-1234',
        cor: 'Prata',
        quilometragem: '100000'
      };

      // Garante que o select de clientes foi populado
      cy.get('#selectClienteVeiculo').should('contain', 'João da Silva');

      // Preenche o formulário de cadastro de veículo
      cy.get('#selectClienteVeiculo').select(novoVeiculo.cliente);
      cy.get('#marcaVeiculo').type(novoVeiculo.marca);
      cy.get('#modeloVeiculo').type(novoVeiculo.modelo);
      cy.get('#anoVeiculo').type(novoVeiculo.ano);
      cy.get('#placaVeiculo').type(novoVeiculo.placa);
      cy.get('#corVeiculo').type(novoVeiculo.cor);
      cy.get('#quilometragemVeiculo').type(novoVeiculo.quilometragem);

      mockApi.readData
        .withArgs('clientes.json').resolves([{ nome: 'João da Silva' }]) // Cliente existente
        .withArgs('veiculos.json')
          .onFirstCall().resolves([]) // Verificação de existência
          .onSecondCall().resolves([novoVeiculo]); // Atualização da tabela

      mockApi.writeData.resolves(true);

      cy.get('#form-veiculo button[type="submit"]').click();

      cy.get('@writeData').should('have.been.calledWith', 'veiculos.json', Cypress.sinon.match(
        (veiculos) => veiculos.length === 1 && veiculos[0].placa === novoVeiculo.placa
      ));

      cy.get('#alert-container').should('contain', '✅ Veículo salvo com sucesso!');

      cy.get('#lista-veiculos').should('contain', novoVeiculo.marca);
      cy.get('#lista-veiculos').should('contain', novoVeiculo.modelo);
      cy.get('#lista-veiculos').should('contain', novoVeiculo.placa);
    });
  });
});
