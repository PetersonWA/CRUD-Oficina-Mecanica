describe('Testes de Gerenciamento de Pagamentos', () => {
  let mockApi;
  const mockServicos = [
    { id: 1, clienteNome: 'João Silva', placaVeiculo: 'ABC-1234', dataEntrada: '2025-10-01', valorTotal: 500, statusPagamento: 'Pendente', pagamentos: [] },
    { id: 2, clienteNome: 'Maria Santos', placaVeiculo: 'DEF-5678', dataEntrada: '2025-10-02', valorTotal: 800, statusPagamento: 'Parcialmente Pago', pagamentos: [{ id: 1, valor: 400, data: '2025-10-02', metodo: 'PIX' }] },
    { id: 3, clienteNome: 'Pedro Costa', placaVeiculo: 'GHI-9012', dataEntrada: '2025-10-03', valorTotal: 300, statusPagamento: 'Pago', pagamentos: [{ id: 2, valor: 300, data: '2025-10-03', metodo: 'Dinheiro' }] },
  ];

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      writeData: cy.stub().as('writeData'),
    };

    mockApi.readData.withArgs('servicos.json').resolves(JSON.parse(JSON.stringify(mockServicos)));
    mockApi.writeData.resolves(true);

    cy.visit('gerenciar-pagamentos.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
        win.lerDados = mockApi.readData;
        win.salvarDados = mockApi.writeData;
      },
    });
  });

  it('Deve exibir a lista de serviços e seus status de pagamento', () => {
    cy.get('#lista-servicos-pagamentos tr').should('have.length', mockServicos.length);
    cy.contains('td', 'João Silva').parent('tr').should('contain', 'Pendente');
    cy.contains('td', 'Maria Santos').parent('tr').should('contain', 'Parcialmente Pago');
    cy.contains('td', 'Pedro Costa').parent('tr').should('contain', 'Pago');
  });

  it('Deve filtrar os serviços por status de pagamento', () => {
    cy.get('#campoBusca').select('status');
    cy.get('#inputBusca').type('Pendente');
    cy.contains('button', 'Buscar').click();

    cy.get('#lista-servicos-pagamentos tr').should('have.length', 1);
    cy.contains('td', 'João Silva');
    cy.get('#lista-servicos-pagamentos').should('not.contain', 'Maria Santos');
  });

  it('Deve abrir o modal, adicionar um novo pagamento e atualizar o status', () => {
    const servicoParaPagar = mockServicos[0];
    const valorPagamento = 200;

    cy.contains('td', servicoParaPagar.clienteNome).parent('tr').within(() => {
      cy.contains('button', 'Pagamentos').click();
    });

    cy.get('#modalPagamentos').should('be.visible');
    cy.get('#servico-id-modal').should('contain', String(servicoParaPagar.id).padStart(6, '0'));

    cy.get('#valor-pago').type(valorPagamento);
    cy.get('#data-pagamento').type('2025-10-04');
    cy.get('#metodo-pagamento').select('PIX');

    cy.get('#form-adicionar-pagamento').submit();

    cy.get('@writeData').should((stub) => {
      const servicos = stub.args[0][1];
      const servicoAtualizado = servicos.find(s => s.id === servicoParaPagar.id);
      expect(servicoAtualizado.pagamentos.length).to.equal(1);
      expect(servicoAtualizado.pagamentos[0].valor).to.equal(valorPagamento);
      expect(servicoAtualizado.statusPagamento).to.equal('Parcialmente Pago');
    });

    cy.get('#alert-container').should('contain', '✅ Pagamento adicionado com sucesso!');
    cy.get('#modalPagamentos').should('not.be.visible');
  });

   it('Deve quitar um serviço e atualizar o status para Pago', () => {
    const servicoParaQuitar = mockServicos[1]; // Maria Santos, deve 400
    const valorPagamento = 400;

    cy.contains('td', servicoParaQuitar.clienteNome).parent('tr').within(() => {
      cy.contains('button', 'Pagamentos').click();
    });

    cy.get('#modalPagamentos').should('be.visible');

    cy.get('#valor-pago').type(valorPagamento);
    cy.get('#data-pagamento').type('2025-10-04');
    cy.get('#metodo-pagamento').select('Cartão de Débito');

    cy.get('#form-adicionar-pagamento').submit();

    cy.get('@writeData').should((stub) => {
      const servicos = stub.args[0][1];
      const servicoAtualizado = servicos.find(s => s.id === servicoParaQuitar.id);
      const totalPago = servicoAtualizado.pagamentos.reduce((acc, p) => acc + p.valor, 0);

      expect(servicoAtualizado.pagamentos.length).to.equal(2);
      expect(totalPago).to.equal(servicoAtualizado.valorTotal);
      expect(servicoAtualizado.statusPagamento).to.equal('Pago');
    });

    cy.get('#alert-container').should('contain', '✅ Pagamento adicionado com sucesso!');
  });
});
