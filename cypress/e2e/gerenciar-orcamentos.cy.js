describe('Testes de Gerenciamento de Orçamentos', () => {
  let mockApi;
  const mockOrcamentos = [
    { id: 1, clienteNome: 'João da Silva', placaVeiculo: 'ABC-1234', data: '20/09/2025', valor: 150, status: 'Pendente', itens: [{descricao: 'Item 1', quantidade: 1, valor: 150}], problemaRelatado: 'Problema 1' },
    { id: 2, clienteNome: 'Maria Oliveira', placaVeiculo: 'XYZ-5678', data: '21/09/2025', valor: 300, status: 'Aprovado', itens: [{descricao: 'Item 2', quantidade: 2, valor: 150}], problemaRelatado: 'Problema 2' },
    { id: 3, clienteNome: 'Pedro Costa', placaVeiculo: 'QWE-9876', data: '22/09/2025', valor: 500, status: 'Pendente', itens: [{descricao: 'Item 3', quantidade: 1, valor: 500}], problemaRelatado: 'Problema 3' }
  ];

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      writeData: cy.stub().as('writeData'),
      salvarDados: cy.stub().as('salvarDados'), // Alias for writeData used in app
    };

    mockApi.readData.withArgs('orcamentos.json').resolves(mockOrcamentos);
    mockApi.writeData.resolves(true);
    mockApi.salvarDados.resolves(true);

    cy.visit('gerenciar-orcamentos.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
        // Mock da função de confirmação para aceitar automaticamente
        cy.stub(win, 'showConfirm').callsFake((message, callback) => callback());
      },
    });
  });

  it('Deve exibir a lista de orçamentos', () => {
    cy.get('#lista-orcamentos tr').should('have.length', mockOrcamentos.length);
    cy.get('#lista-orcamentos').should('contain', 'João da Silva');
    cy.get('#lista-orcamentos').should('contain', 'Maria Oliveira');
  });

  it('Deve filtrar orçamentos por status', () => {
    const status = 'Aprovado';
    cy.get('#campoBusca').select('status');
    cy.get('#inputBusca').type(status);
    cy.contains('button', 'Buscar').click();

    cy.get('#lista-orcamentos tr').should('have.length', 1);
    cy.get('#lista-orcamentos').should('contain', 'Maria Oliveira');
    cy.get('#lista-orcamentos').should('not.contain', 'João da Silva');
  });

  it('Deve abrir o modal de edição, alterar o status e salvar', () => {
    const orcamentoParaEditar = mockOrcamentos[0];
    const novoStatus = 'Recusado';

    // Clica no botão de editar do primeiro orçamento
    cy.get(`#lista-orcamentos tr:contains(${orcamentoParaEditar.clienteNome})`).within(() => {
      cy.get('button.btn-primary').click();
    });

    // Modal de edição deve estar visível
    cy.get('#modalEditarOrcamento').should('be.visible');
    cy.get('#editClienteNome').should('have.value', orcamentoParaEditar.clienteNome);

    // Altera o status
    cy.get('#editStatus').select(novoStatus);
    
    // Salva as alterações
    cy.get('#form-editar-orcamento button[type="submit"]').click();

    // Verifica a chamada para salvar os dados
    cy.get('@salvarDados').should('have.been.calledWith', 'orcamentos.json', Cypress.sinon.match(orcamentos => {
      const orcamentoAtualizado = orcamentos.find(o => o.id === orcamentoParaEditar.id);
      return orcamentoAtualizado && orcamentoAtualizado.status === novoStatus;
    }));

    // Verifica o feedback e o fechamento do modal
    cy.get('#alert-container').should('contain', '✅ Orçamento atualizado com sucesso!');
    cy.get('#modalEditarOrcamento').should('not.be.visible');
  });

  it('Deve excluir um orçamento', () => {
    const orcamentoParaExcluir = mockOrcamentos[1]; // Maria Oliveira

    // Verifica que o orçamento existe na lista
    cy.get('#lista-orcamentos').should('contain', orcamentoParaExcluir.clienteNome);

    // Clica no botão de excluir
    cy.get(`#lista-orcamentos tr:contains(${orcamentoParaExcluir.clienteNome})`).within(() => {
      cy.get('button.btn-danger').click();
    });

    // A confirmação é mockada para aceitar
    // Verifica se a função de salvar foi chamada com a lista atualizada
    cy.get('@salvarDados').should('have.been.calledWith', 'orcamentos.json', Cypress.sinon.match(orcamentos => {
      return orcamentos.length === mockOrcamentos.length - 1 && !orcamentos.find(o => o.id === orcamentoParaExcluir.id);
    }));

    // Verifica o alerta de sucesso
    cy.get('#alert-container').should('contain', '✅ Orçamento excluído com sucesso!');

    // Para verificar a remoção da UI, precisamos mockar a releitura dos dados
    const orcamentosRestantes = mockOrcamentos.filter(o => o.id !== orcamentoParaExcluir.id);
    mockApi.readData.withArgs('orcamentos.json').resolves(orcamentosRestantes);
    
    // Recarrega os dados (simulando a lógica da aplicação)
    cy.window().invoke('carregarDados');

    cy.get('#lista-orcamentos').should('not.contain', orcamentoParaExcluir.clienteNome);
  });
});
