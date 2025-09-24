describe('Testes de Ordem de Serviço (OS) Manual', () => {
  let mockApi;

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      writeData: cy.stub().as('writeData'),
      // Mock de outras funções da API se necessário
    };

    // Mock para a leitura de configurações e ordens existentes
    mockApi.readData.withArgs('configuracao.json').resolves({ logoPath: '', nomeOficina: 'Oficina Teste' });
    mockApi.readData.withArgs('ordens.json').resolves([]);
    mockApi.writeData.resolves(true);

    cy.visit('os-manual.html', {
      onBeforeLoad(win) {
        win.api = mockApi;

        // Mock para a função fetch que busca o template
        cy.stub(win, 'fetch').withArgs('template-orcamento.html').resolves({
          text: () => Promise.resolve('<html><body>{{OS_ID}}</body></html>'),
        });

        // Mock para a janela de impressão para evitar que ela realmente abra
        cy.stub(win, 'open').returns({ 
          document: { 
            open: cy.stub(), 
            write: cy.stub(), 
            close: cy.stub() 
          }, 
          print: cy.stub() 
        }).as('printWindow');
      },
    });
  });

  it('Deve criar uma OS manual com sucesso', () => {
    const osData = {
      cliente: 'Cliente de Teste Manual',
      telefone: '999999999',
      veiculo: 'Carro de Teste Manual',
      problema: 'Motor falhando',
      itemDesc: 'Troca de velas',
      itemQty: '2',
      itemValue: '50,00',
      desconto: '10'
    };

    // Preenche os dados do cliente e veículo
    cy.get('#cliente').type(osData.cliente);
    cy.get('#telefone').type(osData.telefone);
    cy.get('#veiculo').type(osData.veiculo);
    cy.get('#problemaRelatado').type(osData.problema);

    // Preenche o primeiro item da OS (que já é adicionado por padrão)
    cy.get('.item-row').first().within(() => {
      cy.get('[name="descricao"]').type(osData.itemDesc);
      cy.get('[name="quantidade"]').clear().type(osData.itemQty);
      cy.get('[name="valor"]').type(osData.itemValue);
    });

    // Adiciona um segundo item
    cy.contains('button', 'Adicionar Item').click();
    cy.get('.item-row').last().within(() => {
      cy.get('[name="descricao"]').type('Limpeza de bicos');
      cy.get('[name="quantidade"]').clear().type('1');
      cy.get('[name="valor"]').type('80,00');
    });

    // Aplica o desconto
    cy.get('#desconto-percentual').clear().type(osData.desconto);

    // Verifica o cálculo do total
    // Subtotal: (2 * 50) + (1 * 80) = 180
    // Desconto: 10% de 180 = 18
    // Total: 180 - 18 = 162
    cy.get('#subtotal-os').should('contain', '180,00');
    cy.get('#valor-desconto').should('contain', '18,00');
    cy.get('#total-final-os').should('contain', '162,00');

    // Salva a OS
    cy.get('#os-manual-form button[type="submit"]').click();

    // Verifica se a função de salvar foi chamada com os dados corretos
    cy.get('@writeData').should('have.been.calledWith', 'ordens.json', Cypress.sinon.match(ordens => {
      const savedOS = ordens[0];
      return ordens.length === 1 &&
             savedOS.cliente === osData.cliente &&
             savedOS.valor === 162 &&
             savedOS.itens.length === 2 &&
             savedOS.itens[0].descricao === osData.itemDesc;
    }));

    // Verifica a mensagem de sucesso e o reset do formulário
    cy.get('#alert-container').should('contain', 'Ordem de Serviço salva com sucesso!');
    cy.get('#cliente').should('have.value', '');
    cy.get('.item-row').should('have.length', 1); // Deve resetar para apenas uma linha em branco
    cy.get('#total-final-os').should('contain', '0,00');

    // Verifica se a janela de impressão foi chamada
    cy.get('@printWindow').should('be.called');
  });
});
