describe('Fase 1: Testes de Veículos', () => {
  let mockApi;
  const mockClient = {
    nome: 'João da Silva',
    documento: '215.682.573-41',
    // ... outros dados do cliente
  };
  const mockVehicle = {
    cliente: 'João da Silva',
    marca: 'Fiat',
    modelo: 'Uno',
    ano: '2010',
    placa: 'ABC-1234',
    cor: 'Prata',
    quilometragem: '100000'
  };

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      writeData: cy.stub().as('writeData'),
      searchData: cy.stub().as('searchData'),
      editData: cy.stub().as('editData'),
      deleteData: cy.stub().as('deleteData'),
    };

    // Configuração padrão dos mocks
    mockApi.readData.withArgs('clientes.json').resolves([mockClient]);
    mockApi.searchData.withArgs('clientes.json', '', '').resolves([mockClient]);
    mockApi.readData.withArgs('veiculos.json').resolves([]);
    mockApi.searchData.withArgs('veiculos.json', '', '').resolves([]);
    mockApi.writeData.resolves(true);
    mockApi.editData.resolves(true);
    mockApi.deleteData.resolves(true);

    cy.visit('clientes-veiculos.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
        // Mock da função de confirmação para aceitar automaticamente
        cy.stub(win, 'showConfirm').callsFake((message, callback) => callback());
      },
    });
  });

  context('CRUD de Veículos', () => {
    it('Deve cadastrar um novo veículo com sucesso', () => {
      // O beforeEach já configura o cliente. O teste foca no cadastro do veículo.
      mockApi.readData.withArgs('veiculos.json').resolves([]); // Nenhum veículo no início

      // Garante que o select de clientes foi populado
      cy.get('#selectClienteVeiculo').should('contain', mockClient.nome);

      // Preenche o formulário
      cy.get('#selectClienteVeiculo').select(mockVehicle.cliente);
      cy.get('#marcaVeiculo').type(mockVehicle.marca);
      cy.get('#modeloVeiculo').type(mockVehicle.modelo);
      cy.get('#anoVeiculo').type(mockVehicle.ano);
      cy.get('#placaVeiculo').type(mockVehicle.placa);
      cy.get('#corVeiculo').type(mockVehicle.cor);
      cy.get('#quilometragemVeiculo').type(mockVehicle.quilometragem);

      // Simula a atualização da lista após o cadastro
      mockApi.readData.withArgs('veiculos.json').onSecondCall().resolves([mockVehicle]);

      cy.get('#form-veiculo button[type="submit"]').click();

      cy.get('@writeData').should('have.been.calledWith', 'veiculos.json', Cypress.sinon.match.some(
        Cypress.sinon.match.has('placa', mockVehicle.placa)
      ));
      cy.get('#alert-container').should('contain', '✅ Veículo salvo com sucesso!');
      cy.get('#lista-veiculos').should('contain', mockVehicle.placa);
    });

    it('Deve editar um veículo existente com sucesso', () => {
      // Começamos com um veículo já existente
      mockApi.readData.withArgs('veiculos.json').resolves([mockVehicle]);
      // Recarrega a página para garantir que os dados do mock sejam carregados na tabela
      cy.reload();

      const dadosEditados = {
        marca: 'Chevrolet',
        modelo: 'Onix',
        ano: '2022',
      };

      // Encontra o veículo na lista e clica no botão de editar
      cy.get(`#lista-veiculos tr:contains(${mockVehicle.placa})`).within(() => {
        cy.get('button.btn-warning').click();
      });

      // O modal de edição deve abrir e conter os dados originais
      cy.get('#modalEditarVeiculo').should('be.visible');
      cy.get('#editMarcaVeiculo').should('have.value', mockVehicle.marca);

      // Edita os campos
      cy.get('#editMarcaVeiculo').clear().type(dadosEditados.marca);
      cy.get('#editModeloVeiculo').clear().type(dadosEditados.modelo);
      cy.get('#editAnoVeiculo').clear().type(dadosEditados.ano);

      // Simula a atualização da lista após a edição
      const veiculoEditado = { ...mockVehicle, ...dadosEditados };
      mockApi.readData.withArgs('veiculos.json').onSecondCall().resolves([veiculoEditado]);

      // Salva as alterações
      cy.get('#form-editar-veiculo button[type="submit"]').click();

      // Verifica a chamada da API de edição
      cy.get('@editData').should('have.been.calledWith', 'veiculos.json', 'placa', mockVehicle.placa, Cypress.sinon.match.has('marca', dadosEditados.marca));

      // Verifica o feedback e a atualização na UI
      cy.get('#alert-container').should('contain', '✅ Veículo atualizado com sucesso!');
      cy.get('#modalEditarVeiculo').should('not.be.visible');
      cy.get('#lista-veiculos').should('contain', dadosEditados.marca);
      cy.get('#lista-veiculos').should('not.contain', mockVehicle.marca);
    });

    it('Deve excluir um veículo existente com sucesso', () => {
      // Começamos com um veículo já existente
      mockApi.readData.withArgs('veiculos.json').resolves([mockVehicle]);
      cy.reload();

      // Verifica se o veículo está na lista
      cy.get('#lista-veiculos').should('contain', mockVehicle.placa);

      // Encontra o veículo e clica no botão de excluir
      cy.get(`#lista-veiculos tr:contains(${mockVehicle.placa})`).within(() => {
        cy.get('button.btn-danger').click();
      });

      // A confirmação é mockada no beforeEach para aceitar automaticamente
      // Simula a atualização da lista (vazia) após a exclusão
      mockApi.readData.withArgs('veiculos.json').onSecondCall().resolves([]);

      // Verifica a chamada da API de exclusão
      cy.get('@deleteData').should('have.been.calledWith', 'veiculos.json', 'placa', mockVehicle.placa);

      // Verifica o feedback e a atualização na UI
      cy.get('#alert-container').should('contain', '✅ Veículo e seus serviços associados excluídos com sucesso!');
      cy.get('#lista-veiculos').should('not.contain', mockVehicle.placa);
    });
  });
});
