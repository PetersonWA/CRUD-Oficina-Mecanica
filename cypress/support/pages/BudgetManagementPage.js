/**
 * Page Object para a página de Gerenciamento de Orçamentos (`gerenciar-orcamentos.html`).
 * Encapsula os seletores e ações para interagir com a página.
 */
class BudgetManagementPage {
    /**
     * Visita a página de gerenciamento de orçamentos.
     */
    visit() {
        cy.visit('/gerenciar-orcamentos.html');
    }

    /**
     * @returns O corpo da tabela de orçamentos (tbody).
     */
    get budgetTableBody() {
        return cy.get('tbody#lista-orcamentos');
    }

    /**
     * @returns O campo de seleção (select) para o tipo de busca.
     */
    get searchField() {
        return cy.get('#campoBusca');
    }


    /**
     * @returns O campo de entrada (input) para o termo de busca.
     */
    get searchInput() {
        return cy.get('#inputBusca');
    }

    /**
     * @returns O botão "Buscar".
     */
    get searchButton() {
        return cy.contains('button', 'Buscar');
    }

    /**
     * @returns O botão "Limpar".
     */
    get clearSearchButton() {
        return cy.contains('button', 'Limpar');
    }

    /**
     * Retorna uma linha da tabela de orçamentos que contém o texto especificado.
     * @param {string} text - O texto para encontrar na linha.
     * @returns Cypress.Chainable<JQuery<HTMLElement>>
     */
    getRowByBudgetText(text) {
        return this.budgetTableBody.contains('tr', text);
    }

    // --- Seletores do Modal de Edição ---

    /**
     * @returns O contêiner principal do modal de edição.
     */
    get editModal() {
        return cy.get('#modalEditarOrcamento');
    }

    /**
     * @returns O campo de texto para o problema relatado no modal de edição.
     */
    get problemaRelatadoInput() {
        return this.editModal.find('#editProblemaRelatado');
    }

    /**
     * @returns O campo de seleção de status no modal de edição.
     */
    get statusSelect() {
        return this.editModal.find('#editStatus');
    }

    /**
     * @returns O contêiner onde os itens do orçamento são renderizados no modal.
     */
    get itensContainer() {
        return this.editModal.find('#edit-itens-orcamento-container');
    }

    /**
     * @returns O botão para adicionar um novo item no modal de edição.
     */
    get adicionarItemButton() {
        return this.editModal.find('#btn-adicionar-item-edicao');
    }

    /**
     * @returns O botão "Salvar Alterações" no rodapé do modal de edição.
     */
    get salvarAlteracoesButton() {
        return this.editModal.find('.modal-footer .btn-primary');
    }
}

export default new BudgetManagementPage();
