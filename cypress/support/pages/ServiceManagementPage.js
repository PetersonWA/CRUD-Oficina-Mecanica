/**
 * Page Object para a página de Gerenciamento de Serviços (`gerenciar-servicos.html`).
 * Encapsula os seletores e ações para interagir com a página.
 */
class ServiceManagementPage {
    /**
     * Visita a página de gerenciamento de serviços.
     */
    visit() {
        cy.visit('/gerenciar-servicos.html');
    }

    /**
     * @returns O corpo da tabela de serviços (tbody).
     */
    get serviceTableBody() {
        return cy.get('tbody#lista-servicos');
    }

    /**
     * @returns O campo de seleção (select) para o tipo de busca.
     */
    get searchField() {
        return cy.get('#campoBuscaServico');
    }

    /**
     * @returns O campo de entrada (input) para o termo de busca.
     */
    get searchInput() {
        return cy.get('#inputBuscaServico');
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
     * @returns O container da paginação.
     */
    get pagination() {
        return cy.get('#paginacao-servicos');
    }

    /**
     * Encontra e retorna uma linha da tabela com base no texto que ela contém.
     * @param {string} text - O texto para procurar na linha.
     * @returns Cypress.Chainable<JQuery<HTMLElement>>
     */
    getRowByText(text) {
        return this.serviceTableBody.contains('tr', text);
    }
}

export default new ServiceManagementPage();
