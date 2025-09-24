describe('Testes de Gerenciamento de Serviços', () => {
  let mockApi;
  const mockServicos = [
    { id: 101, clienteNome: 'Cliente A', placaVeiculo: 'AAA-1111', dataEntrada: '2025-09-20', dataConclusao: null, valorTotal: 250, mecanico: 'Carlos', status: 'Em andamento', itens: [{descricao: 'Serviço 1', quantidade: 1, valor: 250}] },
    { id: 102, clienteNome: 'Cliente B', placaVeiculo: 'BBB-2222', dataEntrada: '2025-09-21', dataConclusao: '2025-09-22', valorTotal: 400, mecanico: 'Daniel', status: 'Concluído', itens: [{descricao: 'Serviço 2', quantidade: 2, valor: 200}] },
    { id: 103, clienteNome: 'Cliente C', placaVeiculo: 'CCC-3333', dataEntrada: '2025-09-22', dataConclusao: null, valorTotal: 100, mecanico: 'Carlos', status: 'Aguardando peças', itens: [{descricao: 'Serviço 3', quantidade: 1, valor: 100}] }
  ];

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
      salvarDados: cy.stub().as('salvarDados'),
    };

    mockApi.readData.withArgs('servicos.json').resolves(mockServicos);
    mockApi.salvarDados.resolves(true);

    cy.visit('gerenciar-servicos.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
        win.lerDados = mockApi.readData;
        win.salvarDados = mockApi.salvarDados;
        cy.stub(win, 'showConfirm').callsFake((message, callback) => callback());
      },
    });
  });

  it('Deve exibir a lista de serviços corretamente', () => {
    cy.get('#lista-servicos tr').should('have.length', mockServicos.length);
    cy.get('#lista-servicos').should('contain', 'Cliente A');
    cy.get('#lista-servicos').should('contain', 'Concluído');
  });

  it('Deve filtrar os serviços por mecânico', () => {
    const mecanico = 'Daniel';
    cy.get('#campoBuscaServico').select('mecanico');
    cy.get('#inputBuscaServico').type(mecanico);
    cy.contains('button', 'Buscar').click();

    cy.get('#lista-servicos tr').should('have.length', 1);
    cy.get('#lista-servicos').should('contain', 'Cliente B');
    cy.get('#lista-servicos').should('not.contain', 'Cliente A');
  });

  it('Deve abrir o modal de edição, alterar o status e salvar', () => {
    const servicoParaEditar = mockServicos[0];
    const novoStatus = 'Concluído';
    const novoMecanico = 'Roberto';

    cy.get(`#lista-servicos tr:contains(${servicoParaEditar.clienteNome})`).within(() => {
      cy.get('button.btn-warning').click();
    });

    cy.get('#modalEditarServico').should('be.visible');
    cy.get('#editServicoCliente').should('have.value', servicoParaEditar.clienteNome);

    cy.get('#editServicoStatus').select(novoStatus);
    cy.get('#editServicoMecanico').clear().type(novoMecanico);

    cy.get('#form-editar-servico').submit();

    cy.get('@salvarDados').should('have.been.calledWith', 'servicos.json', Cypress.sinon.match(servicos => {
      const servicoAtualizado = servicos.find(s => s.id === servicoParaEditar.id);
      return servicoAtualizado && servicoAtualizado.status === novoStatus && servicoAtualizado.mecanico === novoMecanico;
    }));

    cy.get('#alert-container').should('contain', '✅ Serviço atualizado com sucesso!');
    cy.get('#modalEditarServico').should('not.be.visible');
  });

  it('Deve excluir um serviço da lista', () => {
    const servicoParaExcluir = mockServicos[2]; // Cliente C

    cy.get('#lista-servicos').should('contain', servicoParaExcluir.clienteNome);

    cy.get(`#lista-servicos tr:contains(${servicoParaExcluir.clienteNome})`).within(() => {
      cy.get('button.btn-danger').click();
    });

    cy.get('@salvarDados').should('have.been.calledWith', 'servicos.json', Cypress.sinon.match(servicos => {
      return servicos.length === mockServicos.length - 1 && !servicos.find(s => s.id === servicoParaExcluir.id);
    }));

    cy.get('#alert-container').should('contain', '✅ Serviço excluído com sucesso!');

    // Simula a atualização da UI após a exclusão
    const servicosRestantes = mockServicos.filter(s => s.id !== servicoParaExcluir.id);
    mockApi.readData.withArgs('servicos.json').resolves(servicosRestantes);
    cy.window().invoke('carregarServicos');

    cy.get('#lista-servicos').should('not.contain', servicoParaExcluir.clienteNome);
  });
});
