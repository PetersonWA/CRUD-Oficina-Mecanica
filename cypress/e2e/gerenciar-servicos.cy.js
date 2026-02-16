import ServiceManagementPage from '../support/pages/ServiceManagementPage';

describe('Testes de Gerenciamento de Serviços (Refatorado)', () => {

    const mockServicos = [
        { id: 1, clienteNome: 'Cliente Serv-A', placaVeiculo: 'SRV-0001', dataEntrada: '2025-11-01', dataConclusao: null, valorTotal: 450, mecanico: 'Carlos', status: 'Em andamento', statusPagamento: 'Pendente', itens: [{id: 1, descricao: 'Troca de oleo', tipo: 'Mão de Obra', quantidade: 1, valor_unitario: 150}, {id: 2, descricao: 'Filtro de oleo', tipo: 'Peça', quantidade: 1, valor_unitario: 50}] },
        { id: 2, clienteNome: 'Cliente Serv-B', placaVeiculo: 'SRV-0002', dataEntrada: '2025-11-02', dataConclusao: '2025-11-03', valorTotal: 800, mecanico: 'Ana', status: 'Concluído', statusPagamento: 'Pago', itens: [] }
    ];

    const servicosAtualizadosMock = [
        { ...mockServicos[0], status: 'Concluído', mecanico: 'Roberto' },
        mockServicos[1]
    ];


    beforeEach(() => {
        cy.visit('/gerenciar-servicos.html', {
            onBeforeLoad(win) {
                cy.spy(win.console, 'error').as('consoleError');

                if (!win.api) win.api = {};
                win.api.getServicos = () => {};
                win.api.updateServico = () => {};

                const getServicosStub = cy.stub(win.api, 'getServicos').as('stubGetServicos');
                getServicosStub.onFirstCall().resolves(mockServicos);
                getServicosStub.onSecondCall().resolves(servicosAtualizadosMock);
                
                cy.stub(win.api, 'updateServico').resolves({ success: true }).as('stubUpdateServico');
            }
        });
    });

    it('Deve exibir a lista de serviços na tabela', () => {
        ServiceManagementPage.serviceTableBody.find('tr').should('have.length', 2);
        ServiceManagementPage.getRowByText('Cliente Serv-A').should('contain', 'Em andamento');
        ServiceManagementPage.getRowByText('Cliente Serv-B').should('contain', 'Concluído');
    });

    it('Deve abrir o modal de edição, alterar dados e salvar', () => {
        // Clica no botão de edição do Cliente Serv-A
        ServiceManagementPage.getRowByText('Cliente Serv-A').find('.bi-pencil').click();
        
        // Modal deve estar visível
        cy.get('#modalEditarServico').should('be.visible');
        cy.get('#edit-os-id').should('contain', '000001');

        // Altera o status e o mecânico
        cy.get('#editServicoStatus').select('Concluído');
        cy.get('#editServicoMecanico').clear().type('Roberto');

        // Salva o formulário
        cy.get('#form-editar-servico').submit();

        // Verifica se a API de update foi chamada
        cy.get('@stubUpdateServico').should('be.calledOnce');
        cy.get('@stubUpdateServico').its('firstCall.args.0').should('deep.include', {
            id: 1,
            status: 'Concluído',
            mecanico: 'Roberto'
        });

        // O modal deve fechar e a lista deve recarregar
        cy.get('#modalEditarServico').should('not.be.visible');
        cy.get('@stubGetServicos').should('have.been.calledTwice');

        // Verifica a atualização na tabela
        ServiceManagementPage.getRowByText('Cliente Serv-A').should('contain', 'Concluído').and('contain', 'Roberto');
    });

});
