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
  });

  context('CRUD de Veículos', () => {
    it('Deve cadastrar um novo veículo com sucesso', () => {
      cy.visit('clientes-veiculos.html', {
        onBeforeLoad(win) {
          win.api = mockApi;
          win.lerDados = mockApi.readData;
          win.salvarDados = mockApi.writeData;
          win.buscarDados = mockApi.searchData;
          win.editarDados = mockApi.editData;
          win.excluirDados = mockApi.deleteData;
        }
      });

      cy.get('#lista-veiculos').find('tr').should('have.length', 0);

      // Preenche o formulário
      cy.get('#selectClienteVeiculo').select(mockVehicle.cliente);
      cy.get('#marcaVeiculo').type(mockVehicle.marca);
      cy.get('#modeloVeiculo').type(mockVehicle.modelo);
      cy.get('#anoVeiculo').type(mockVehicle.ano);
      cy.get('#placaVeiculo').type(mockVehicle.placa);
      cy.get('#corVeiculo').type(mockVehicle.cor);
      cy.get('#quilometragemVeiculo').type(mockVehicle.quilometragem);

      // Após o cadastro, a aplicação recarrega os dados usando searchData.
      // Mockamos essa chamada para retornar o veículo novo.
      mockApi.searchData.withArgs('veiculos.json', '', '').resolves([mockVehicle]);

      // Submete o formulário
      cy.get('#form-veiculo button[type="submit"]').click();

      // Verifica se writeData foi chamado com um array contendo o novo veículo
      cy.get('@writeData').should('have.been.calledWith', 'veiculos.json', 
        Cypress.sinon.match(veiculos => veiculos.some(v => v.placa === mockVehicle.placa))
      );
      
      // Verifica o alerta e a atualização na UI
      cy.get('#alert-container').should('contain', '✅ Veículo salvo com sucesso!');
      cy.get('#lista-veiculos').should('contain', mockVehicle.placa);
    });

it('Deve editar um veículo existente com sucesso', () => {
      const veiculoOriginal = {
        cliente: 'João da Silva',
        marca: 'Fiat',
        modelo: 'Uno',
        ano: '2010',
        placa: 'ABC-1234',
        cor: 'Prata',
        quilometragem: '100000'
      };

      // Configura o mock para este teste e visita a página
      mockApi.searchData.withArgs('veiculos.json', '', '').resolves([veiculoOriginal]);

      cy.visit('clientes-veiculos.html', {
        onBeforeLoad(win) {
          win.api = mockApi;
          win.lerDados = mockApi.readData;
          win.salvarDados = mockApi.writeData;
          win.buscarDados = mockApi.searchData;
          win.editarDados = mockApi.editData;
          win.excluirDados = mockApi.deleteData;
        }
      });

      cy.get('#lista-veiculos').should('contain', veiculoOriginal.placa);

      // Clica no botão de editar
      cy.get(`#lista-veiculos tr:contains(${veiculoOriginal.placa})`).within(() => {
        cy.get('button.btn-warning').click();
      });

      // O modal de edição deve abrir e conter os dados originais
      cy.get('#modalEditarVeiculo').should('be.visible');
      cy.get('#editMarcaVeiculo').should('have.value', veiculoOriginal.marca);

      // Edita os campos
      const dadosEditados = { marca: 'Chevrolet', modelo: 'Onix' };
      cy.get('#editMarcaVeiculo').clear().type(dadosEditados.marca);
      cy.get('#editModeloVeiculo').clear().type(dadosEditados.modelo);

      // Mock para a atualização da UI após a edição
      const veiculoEditado = { ...veiculoOriginal, ...dadosEditados };
      mockApi.searchData.withArgs('veiculos.json', '', '').resolves([veiculoEditado]);

      // Salva as alterações
      cy.get('#form-editar-veiculo button[type="submit"]').click();

      // Verifica a chamada da API de edição
      cy.get('@editData').should('have.been.calledWith', 'veiculos.json', 'placa', veiculoOriginal.placa, Cypress.sinon.match.has('marca', dadosEditados.marca));

      // Verifica o feedback e a atualização na UI
      cy.get('#alert-container').should('contain', '✅ Veículo atualizado com sucesso!');
      cy.get('#modalEditarVeiculo').should('not.be.visible');
      cy.get('#lista-veiculos').should('contain', dadosEditados.marca);
      cy.get('#lista-veiculos').should('not.contain', veiculoOriginal.marca);
    });

it('Deve excluir um veículo existente com sucesso', () => {
      const veiculoParaExcluir = {
        cliente: 'João da Silva',
        marca: 'VW',
        modelo: 'Gol',
        ano: '2015',
        placa: 'XYZ-7890',
        cor: 'Branco',
        quilometragem: '50000'
      };

      // Configura o mock para este teste e visita a página
      mockApi.searchData.withArgs('veiculos.json', '', '').resolves([veiculoParaExcluir]);

      cy.visit('clientes-veiculos.html', {
        onBeforeLoad(win) {
          win.api = mockApi;
          win.lerDados = mockApi.readData;
          win.salvarDados = mockApi.writeData;
          win.buscarDados = mockApi.searchData;
          win.editarDados = mockApi.editData;
          win.excluirDados = mockApi.deleteData;
        }
      });

      cy.get('#lista-veiculos').should('contain', veiculoParaExcluir.placa);

      // Mock para a função de confirmação
      cy.window().then((win) => {
        cy.stub(win, 'showConfirm').callsFake((message, callback) => callback());
      });

      // Clica no botão de excluir
      cy.get(`#lista-veiculos tr:contains(${veiculoParaExcluir.placa})`).within(() => {
        cy.get('button.btn-danger').click();
      });

      // Mock para a atualização da UI (lista vazia)
      mockApi.searchData.withArgs('veiculos.json', '', '').resolves([]);

      // Verifica a chamada da API de exclusão
      cy.get('@deleteData').should('have.been.calledWith', 'veiculos.json', 'placa', veiculoParaExcluir.placa);

      // Verifica o feedback e a remoção da UI
      cy.get('#alert-container').should('contain', '✅ Veículo e seus serviços associados excluídos com sucesso!');
      cy.get('#lista-veiculos').should('not.contain', veiculoParaExcluir.placa);
    });
  });
});
