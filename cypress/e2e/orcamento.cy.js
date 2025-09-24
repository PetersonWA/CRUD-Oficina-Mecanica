describe('Testes de Orçamento', () => {
  let mockApi;
  const mockClients = [
    { nome: 'João da Silva', documento: '111.111.111-11', email: 'joao@test.com', telefone: '1111-1111' }
  ];
  const mockVehicles = [
    { cliente: 'João da Silva', marca: 'Fiat', modelo: 'Uno', ano: '2010', placa: 'ABC-1234', quilometragem: '150000' }
  ];

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      writeData: cy.stub().as('writeData'),
    };

    // Mocks para dados iniciais
    mockApi.readData.withArgs('clientes.json').resolves(mockClients);
    mockApi.readData.withArgs('veiculos.json').resolves(mockVehicles);
    mockApi.readData.withArgs('orcamentos.json').resolves([]);
    mockApi.readData.withArgs('configuracao.json').resolves({});
    mockApi.writeData.resolves(true);

    cy.visit('orcamento-mecanico.html', {
      onBeforeLoad(win) {
        win.api = mockApi;

        // Mock para fetch do template
        cy.stub(win, 'fetch').withArgs('template-orcamento.html').resolves({
          text: () => Promise.resolve('<html><body>{{TOTAL}}</body></html>'),
        });

        // Mock para a janela de impressão
        cy.stub(win, 'open').returns({ 
          document: { open: cy.stub(), write: cy.stub(), close: cy.stub() }, 
          print: cy.stub() 
        }).as('printWindow');
      },
    });
  });

  it('Deve criar um novo orçamento com sucesso', () => {
    const orcamentoInfo = {
      problema: 'Barulho no motor',
      itemDesc: 'Troca de óleo',
      itemQty: '1',
      itemValue: '150,00',
      desconto: '5'
    };

    // Seleciona cliente e veículo
    cy.get('#clienteOrcamento').select(mockClients[0].nome);
    cy.get('#veiculoOrcamento').should('be.enabled');
    cy.get('#veiculoOrcamento').select(mockVehicles[0].placa);

    // Verifica se os dados do cliente/veículo foram preenchidos
    cy.get('#telefoneOrcamento').should('have.value', mockClients[0].telefone);
    cy.get('#modeloVeiculo').should('have.value', `${mockVehicles[0].marca} ${mockVehicles[0].modelo}`);

    // Preenche o formulário
    cy.get('#problemaRelatado').type(orcamentoInfo.problema);
    
    // Adiciona um item (o primeiro já existe por padrão)
    cy.get('.item-row').first().within(() => {
        cy.get('[name="descricao"]').type(orcamentoInfo.itemDesc);
        cy.get('[name="quantidade"]').clear().type(orcamentoInfo.itemQty);
        cy.get('[name="valor"]').type(orcamentoInfo.itemValue);
    });

    // Aplica desconto
    cy.get('#desconto-percentual').clear().type(orcamentoInfo.desconto);

    // Verifica o cálculo do total
    // Subtotal: 150.00
    // Desconto: 5% de 150 = 7.50
    // Total: 142.50
    cy.get('#total-final-orcamento').should('contain', '142,50');

    // Salva o orçamento
    cy.contains('button', 'Gerar PDF do Orçamento').click();

    // Verifica a chamada da API de escrita
    cy.get('@writeData').should('have.been.calledWith', 'orcamentos.json', Cypress.sinon.match(orcamentos => {
      const savedOrcamento = orcamentos[0];
      return orcamentos.length === 1 &&
             savedOrcamento.clienteNome === mockClients[0].nome &&
             savedOrcamento.placaVeiculo === mockVehicles[0].placa &&
             savedOrcamento.valor === 142.5 &&
             savedOrcamento.itens[0].descricao === orcamentoInfo.itemDesc;
    }));

    // Verifica a mensagem de sucesso e a chamada de impressão
    cy.get('#alert-container').should('contain', '✅ Orçamento salvo com sucesso!');
    cy.get('@printWindow').should('be.called');
  });
});
