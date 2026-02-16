import BudgetManagementPage from '../support/pages/BudgetManagementPage';

describe('Testes de Gerenciamento de Orçamentos (Refatorado)', () => {
    
    const initialMockOrcamentos = [
        { id: 1, clienteNome: 'João da Silva', veiculoPlaca: 'ABC-1234', dataEntrada: '2025-12-25T10:00:00Z', valorTotal: 550.00, status: 'Pendente' },
        { id: 2, clienteNome: 'Maria Souza', veiculoPlaca: 'XYZ-5678', dataEntrada: '2025-12-26T11:30:00Z', valorTotal: 1200.75, status: 'Aprovado' },
        { id: 3, clienteNome: 'Carlos Pereira', veiculoPlaca: 'QWE-9101', dataEntrada: '2025-12-27T14:00:00Z', valorTotal: 300.00, status: 'Recusado' }
    ];
    const orcamentosAposExclusao = initialMockOrcamentos.filter(o => o.id !== 2);
    const orcamentoParaEditar = {
        id: 2,
        cliente_id: 2,
        veiculo_id: 2,
        data_entrada: '2025-12-26T11:30:00Z',
        descricao_problema: 'Motor falhando em baixa rotação.',
        status: 'Aprovado',
        desconto_percentual: 0,
        valor_total: 1200.75,
        itens: [
            { id: 1, descricao: 'Velas de ignição', tipo: 'Peça', quantidade: 4, valor_unitario: 50.00 },
            { id: 2, descricao: 'mão de obra', tipo: 'Mão de Obra', quantidade: 1, valor_unitario: 300.00 }
        ]
    };
    const orcamentosAposEdicao = [
        { id: 1, clienteNome: 'João da Silva', veiculoPlaca: 'ABC-1234', dataEntrada: '2025-12-25T10:00:00Z', valorTotal: 550.00, status: 'Pendente' },
        { id: 2, clienteNome: 'Maria Souza', veiculoPlaca: 'XYZ-5678', dataEntrada: '2025-12-26T11:30:00Z', valorTotal: 950.00, status: 'Recusado' }, // Valor atualizado
        { id: 3, clienteNome: 'Carlos Pereira', veiculoPlaca: 'QWE-9101', dataEntrada: '2025-12-27T14:00:00Z', valorTotal: 300.00, status: 'Recusado' }
    ];

    beforeEach(() => {
        cy.visit('/gerenciar-orcamentos.html', {
            onBeforeLoad(win) {
                cy.spy(win.console, 'error').as('consoleError');
                if (!win.api) win.api = {};

                // Stubs da API
                cy.stub(win.api, 'getOrcamentos').as('getOrcamentosStub');
                cy.stub(win.api, 'deleteOrcamento').resolves(true).as('stubDeleteOrcamento');
                cy.stub(win.api, 'getOrcamentoById').resolves(orcamentoParaEditar).as('stubGetOrcamentoById');
                cy.stub(win.api, 'updateOrcamento').resolves({ success: true }).as('stubUpdateOrcamento');
                
                // Comportamento dos stubs
                win.api.getOrcamentos.onCall(0).resolves(initialMockOrcamentos);
                win.api.getOrcamentos.onCall(1).resolves(orcamentosAposExclusao);
                win.api.getOrcamentos.onCall(2).resolves(orcamentosAposEdicao);
                win.api.getOrcamentos.onCall(3).resolves(initialMockOrcamentos); // Para o 4º teste
            }
        });
    });

    it('Deve exibir a lista de orçamentos na tabela', () => {
        BudgetManagementPage.budgetTableBody.find('tr').should('have.length', initialMockOrcamentos.length);
        BudgetManagementPage.getRowByBudgetText('João da Silva').should('be.visible');
        cy.get('@consoleError').should('not.have.been.called');
    });

    it('Deve filtrar os orçamentos por cliente e limpar a busca', () => {
        BudgetManagementPage.searchField.select('clienteNome');
        BudgetManagementPage.searchInput.type('Maria');
        BudgetManagementPage.searchButton.click();
        
        BudgetManagementPage.budgetTableBody.find('tr').should('have.length', 1);
        BudgetManagementPage.getRowByBudgetText('Maria Souza').should('be.visible');

        BudgetManagementPage.clearSearchButton.click();
        BudgetManagementPage.budgetTableBody.find('tr').should('have.length', 3);
        cy.get('@consoleError').should('not.have.been.called');
    });

    it('Deve excluir um orçamento após confirmação', () => {
        cy.window().then(win => {
            cy.stub(win, 'showConfirm').callsFake((_m, callback) => callback()).as('stubShowConfirm');
        });

        BudgetManagementPage.getRowByBudgetText('Maria Souza').find('.bi-trash').click();
        cy.get('@stubShowConfirm').should('have.been.calledOnce');
        cy.get('@stubDeleteOrcamento').should('have.been.calledOnceWith', 2);
        cy.get('@getOrcamentosStub').should('have.been.calledTwice');
        BudgetManagementPage.budgetTableBody.find('tr').should('have.length', orcamentosAposExclusao.length);
        BudgetManagementPage.budgetTableBody.contains('tr', 'Maria Souza').should('not.exist');
        cy.get('@consoleError').should('not.have.been.called');
    });

    it('Deve editar um orçamento, adicionar um item e salvar as alterações', () => {
        BudgetManagementPage.getRowByBudgetText('Maria Souza').find('.bi-pencil').click();
        cy.get('@stubGetOrcamentoById').should('have.been.calledOnceWith', 2);
        BudgetManagementPage.editModal.should('be.visible');
        
        const novoProblema = 'Veículo superaquecendo.';
        BudgetManagementPage.problemaRelatadoInput.clear().type(novoProblema);
        BudgetManagementPage.statusSelect.select('Recusado');
        
        BudgetManagementPage.adicionarItemButton.click();
        const novoItemRow = BudgetManagementPage.itensContainer.find('.item-row').last();
        novoItemRow.find('.item-descricao').type('Bomba d\'água');
        novoItemRow.find('.item-quantidade').clear().type('1');
        novoItemRow.find('.item-valor').type('450,00');

        BudgetManagementPage.salvarAlteracoesButton.click();

        cy.get('@stubUpdateOrcamento').should('be.calledOnce').then(spy => {
            const orcamentoData = spy.args[0][0];
            expect(orcamentoData.id).to.equal(2);
            expect(orcamentoData.cliente_id).to.equal(orcamentoParaEditar.cliente_id); // Verifica preservação
            expect(orcamentoData.veiculo_id).to.equal(orcamentoParaEditar.veiculo_id); // Verifica preservação
            expect(orcamentoData.data_entrada).to.equal(orcamentoParaEditar.data_entrada); // Verifica preservação
            expect(orcamentoData.descricao_problema).to.equal(novoProblema);
            expect(orcamentoData.status).to.equal('Recusado');
            expect(orcamentoData.itens).to.have.lengthOf(3);
            
            const itemAdicionado = orcamentoData.itens.find(i => i.descricao === "Bomba d'água");
            expect(itemAdicionado).to.exist;
            expect(itemAdicionado.quantidade).to.equal(1);
            expect(itemAdicionado.valor_unitario).to.equal(450);
        });

        cy.get('@getOrcamentosStub').should('have.been.calledTwice');
        cy.get('.alert-success').should('be.visible');
        cy.get('@consoleError').should('not.have.been.called');
    });

    it('Deve editar apenas a descrição e manter os dados originais (status, data, etc)', () => {
        BudgetManagementPage.getRowByBudgetText('Maria Souza').find('.bi-pencil').click();
        cy.get('@stubGetOrcamentoById').should('have.been.calledOnceWith', 2);
        
        const novaDescricao = 'Apenas um teste de descrição.';
        BudgetManagementPage.problemaRelatadoInput.clear().type(novaDescricao);
        BudgetManagementPage.salvarAlteracoesButton.click();

        cy.get('@stubUpdateOrcamento').should('be.calledOnce').then(spy => {
            const data = spy.args[0][0];
            expect(data.id).to.equal(2);
            expect(data.data_entrada).to.equal(orcamentoParaEditar.data_entrada); // CRÍTICO: Verifica se a data foi enviada
            expect(data.status).to.equal(orcamentoParaEditar.status); // CRÍTICO: Verifica se o status foi mantido
            expect(data.descricao_problema).to.equal(novaDescricao);
            expect(data.itens.length).to.equal(orcamentoParaEditar.itens.length);
        });

        cy.get('@consoleError').should('not.have.been.called');
    });
});
