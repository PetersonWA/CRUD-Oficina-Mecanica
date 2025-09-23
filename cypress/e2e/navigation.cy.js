describe('Navegação Principal', () => {
  beforeEach(() => {
    // Cria os stubs ANTES do listener 'window:before:load'
    const readDataStub = cy.stub().resolves([]);
    const writeDataStub = cy.stub().resolves(true);
    const searchDataStub = cy.stub().resolves([]);
    const editDataStub = cy.stub().resolves(true);
    const deleteDataStub = cy.stub().resolves(true);
    const saveFileStub = cy.stub().resolves(null);
    const bufferFromStub = cy.stub();

    // Ouve o evento 'window:before:load'
    cy.on('window:before:load', (win) => {
      // Atribui os stubs já criados à API mockada
      win.api = {
        readData: readDataStub,
        writeData: writeDataStub,
        searchData: searchDataStub,
        editData: editDataStub,
        deleteData: deleteDataStub,
        saveFile: saveFileStub,
        Buffer: { from: bufferFromStub }
      };
    });
  });

  it('deve navegar da página inicial para a página de Clientes e Veículos', () => {
    // 1. Visita a página inicial (o mock do beforeEach será aplicado)
    cy.visit('index.html');

    // 2. Encontra o link no menu lateral e clica nele (o mock será reaplicado na nova página)
    cy.get('#sidebar').contains('Clientes e Veículos').click();

    // 3. Verifica se a URL mudou para a página correta
    cy.url().should('include', '/clientes-veiculos.html');

    // 4. Verifica se o título principal da nova página está correto
    cy.get('h2').should('contain', 'Clientes e Veículos Cadastrados');
  });
});
