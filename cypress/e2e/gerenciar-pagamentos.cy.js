import PaymentManagementPage from '../support/pages/PaymentManagementPage';

describe('Testes de Gerenciamento de Pagamentos (Refatorado)', () => {

    const mockServicos = [
        { id: 1, clienteNome: 'Cliente A', placaVeiculo: 'PAG-0001', dataEntrada: '2025-10-01', valorTotal: 300, formaPagamento: 'Cartão de Crédito', statusPagamento: 'Pendente' },
        { id: 2, clienteNome: 'Cliente B', placaVeiculo: 'PAG-0002', dataEntrada: '2025-10-02', valorTotal: 500, formaPagamento: 'PIX', statusPagamento: 'Pago' }
    ];

    const servicoComPagamentosMock = {
        id: 1,
        valorTotal: 300,
        totalPago: 0,
        saldoDevedor: 300,
        pagamentos: []
    };

    const servicosAtualizadosMock = [
        { ...mockServicos[0], statusPagamento: 'Parcialmente Pago' },
        mockServicos[1]
    ];

    beforeEach(() => {
        cy.visit('/gerenciar-pagamentos.html', {
            onBeforeLoad(win) {
                if (!win.api) win.api = {};
                win.api.getServicosParaPagamentos = () => {};
                win.api.getServicoComPagamentos = () => {};
                win.api.adicionarPagamento = () => {};

                const getServicosStub = cy.stub(win.api, 'getServicosParaPagamentos').as('stubGetServicos');
                getServicosStub.onFirstCall().resolves(mockServicos);
                getServicosStub.onSecondCall().resolves(servicosAtualizadosMock);

                cy.stub(win.api, 'getServicoComPagamentos').resolves(servicoComPagamentosMock);
                cy.stub(win.api, 'adicionarPagamento').resolves({ success: true, message: 'Pagamento adicionado!' }).as('stubAdicionarPagamento');
            }
        });
    });

    it('Deve exibir a lista de serviços e seus status de pagamento', () => {
        PaymentManagementPage.paymentTableBody.find('tr').should('have.length', 2);
        PaymentManagementPage.getRowByText('Cliente A').should('contain', 'Pendente');
        PaymentManagementPage.getRowByText('Cliente B').should('contain', 'Pago');
    });

    it('Deve abrir o modal, adicionar um novo pagamento e atualizar o status', () => {
        // Clica no botão "Pagamentos" do Cliente A
        PaymentManagementPage.getRowByText('Cliente A').contains('button', 'Pagamentos').click();

        // Modal deve estar visível
        cy.get('#modalPagamentos').should('be.visible');
        cy.get('#servico-id-modal').should('contain', '000001');

        // Preenche o formulário de novo pagamento
        cy.get('#valor-pago').type('150.00');
        cy.get('#data-pagamento').type('2025-10-10');
        cy.get('#metodo-pagamento').select('PIX');
        cy.get('#anotacao-pagamento').type('Pagamento parcial.');

        // Envia o formulário
        cy.get('#form-adicionar-pagamento').submit();

        // Verifica se a API foi chamada corretamente
        cy.get('@stubAdicionarPagamento').should('be.calledOnce');
        cy.get('@stubAdicionarPagamento').its('firstCall.args.0').should('deep.include', {
            servico_id: 1,
            valor: 150,
            metodo: 'PIX',
            anotacao: 'Pagamento parcial.'
        });

        // O modal deve fechar e a lista principal deve ser recarregada
        cy.get('#modalPagamentos').should('not.be.visible');
        cy.get('@stubGetServicos').should('have.been.calledTwice');

        // Verifica se o status do pagamento na tabela foi atualizado
        PaymentManagementPage.paymentTableBody.find('tr').should('have.length', 2);
        PaymentManagementPage.getRowByText('Cliente A').should('contain', 'Parcialmente Pago');
    });

});
