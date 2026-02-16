/**
 * Page Object para a página de Gerenciamento de Pagamentos (`gerenciar-pagamentos.html`).
 * Encapsula os seletores e ações para interagir com a página.
 */
class PaymentManagementPage {
    /**
     * Visita a página de gerenciamento de pagamentos.
     */
    visit() {
        cy.visit('/gerenciar-pagamentos.html');
    }

    /**
     * @returns O corpo da tabela de pagamentos (tbody).
     */
    get paymentTableBody() {
        return cy.get('tbody#lista-servicos-pagamentos');
    }

    /**
     * Encontra e retorna uma linha da tabela com base no texto que ela contém.
     * @param {string} text - O texto para procurar na linha.
     * @returns Cypress.Chainable<JQuery<HTMLElement>>
     */
    getRowByText(text) {
        return this.paymentTableBody.contains('tr', text);
    }
}

export default new PaymentManagementPage();
