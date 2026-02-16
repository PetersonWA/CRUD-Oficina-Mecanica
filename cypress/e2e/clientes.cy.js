describe('Fase 1: Testes de Clientes e Veículos', () => {
  let mockApi; // Declarado aqui para ser acessível em todo o describe

  beforeEach(() => {
    // Inicializa o mock com novos stubs para cada teste
    mockApi = {
      // Funções IPC para Clientes
      getClientes: cy.stub().as('getClientes'),
      addCliente: cy.stub().as('addCliente'),
      updateCliente: cy.stub().as('updateCliente'),
      deleteCliente: cy.stub().as('deleteCliente'),

      // Funções IPC para Veículos
      getVeiculos: cy.stub().as('getVeiculos'),
      addVeiculo: cy.stub().as('addVeiculo'),
      updateVeiculo: cy.stub().as('updateVeiculo'),
      deleteVeiculo: cy.stub().as('deleteVeiculo'),

      // Mock para showAlert, já que o alerta é exibido no DOM
      showAlert: cy.stub().as('showAlert'),
    };

    // Configura o mock inicial para retornar arrays vazios
    mockApi.getClientes.resolves([]);
    mockApi.getVeiculos.resolves([]);
  });

  context('CRUD de Clientes', () => {
    beforeEach(() => {
      // Visita a página antes de cada teste no contexto de clientes
      cy.visit('clientes-veiculos.html', {
        onBeforeLoad(win) {
          win.api = mockApi;
          win.showAlert = mockApi.showAlert;
        },
      });
    });

    it('Deve cadastrar um novo cliente com sucesso', () => {
      // Dados do novo cliente alinhados com a implementação real
      const novoCliente = {
        id: 1,
        nome: 'João da Silva',
        telefone: '(11) 99999-8888',
        email: 'joao.silva@example.com',
        cpf_cnpj: '215.682.573-41',
        endereco: 'Rua dos Testes, 123',
      };

      // Configura os stubs para este teste específico
      mockApi.addCliente.resolves(novoCliente.id);
      // Simula a recarga da lista após o cadastro
      mockApi.getClientes.onFirstCall().resolves([]).onSecondCall().resolves([novoCliente]);
      
      // Preenche apenas os campos usados pela aplicação
      cy.get('#nomeCliente').type(novoCliente.nome);
      cy.get('#telefoneCliente').type('11999998888'); // Digitar sem máscara
      cy.get('#emailCliente').type(novoCliente.email);
      cy.get('#documentoCliente').type(novoCliente.cpf_cnpj);
      cy.get('#enderecoCliente').type(novoCliente.endereco);

      // Clica no botão para salvar o cliente
      cy.get('#form-cliente button[type="submit"]').click();

      // Verifica se a função addCliente foi chamada com os dados corretos
      cy.get('@addCliente').should('have.been.calledWith', Cypress.sinon.match(
        (cliente) => cliente.nome === novoCliente.nome && cliente.cpf_cnpj === novoCliente.cpf_cnpj
      ));

      

      // Verifica se o novo cliente é exibido na tabela
      cy.get('#lista-clientes').should('contain', novoCliente.nome);
      cy.get('#lista-clientes').should('contain', novoCliente.telefone);
      cy.get('#lista-clientes').should('contain', novoCliente.email);
      cy.get('#lista-clientes').should('contain', novoCliente.cpf_cnpj);
    });
  });

      context('CRUD de Veículos', () => {

        let clienteExistente; // Declarado aqui para ser acessível no contexto

    

        beforeEach(() => {

          // Definir o cliente que será usado neste contexto de testes

          clienteExistente = {

            id: 1,

            nome: 'João da Silva',

            cpf_cnpj: '215.682.573-41',

          };

          // Configurar o mock de getClientes ANTES da visita à página

          mockApi.getClientes.resolves([clienteExistente]);

    

          // Visita a página após os mocks específicos do contexto estarem prontos

          cy.visit('clientes-veiculos.html', {

            onBeforeLoad(win) {

              win.api = mockApi;

              win.showAlert = mockApi.showAlert;

            },

          });

        });

    

        it('Deve cadastrar um novo veículo com sucesso', () => {

          // Dados do novo veículo alinhados com a implementação real

          const novoVeiculo = {

            id: 1, // ID simulado para o veículo

            cliente_id: clienteExistente.id,

            marca: 'Fiat',

            modelo: 'Uno',

            ano: '2020',

            cor: 'Preto',

            placa: 'ABC-1234',

            quilometragem: '50000',

          };

    

          // Configura os outros stubs necessários para este teste

          mockApi.addVeiculo.resolves(novoVeiculo.id);

          // getVeiculos será chamado para atualizar a tabela

          mockApi.getVeiculos.resolves([{ ...novoVeiculo, cliente_nome: clienteExistente.nome }]);

    

          // 1. Digita no campo de busca para encontrar o cliente

          cy.get('#search-cliente-veiculo-input').type('João');

    

          // 2. Clica no resultado que aparece

          cy.get('#cliente-veiculo-search-results .list-group-item').contains('João da Silva').click();

    

          // 3. Verifica se o input escondido foi preenchido corretamente

          cy.get('#clienteVeiculo').should('have.value', String(clienteExistente.id));

    

          // 4. Preenche o resto do formulário de cadastro de veículo

          cy.get('#marcaVeiculo').type(novoVeiculo.marca);

          cy.get('#modeloVeiculo').type(novoVeiculo.modelo);

          cy.get('#anoVeiculo').type(novoVeiculo.ano);

          cy.get('#corVeiculo').type(novoVeiculo.cor);

          cy.get('#placaVeiculo').type(novoVeiculo.placa);

          cy.get('#quilometragemVeiculo').type(novoVeiculo.quilometragem);

    

          // Clica no botão para salvar o veículo

          cy.get('#form-veiculo button[type="submit"]').click();

    

          // Verifica se a função addVeiculo foi chamada com os dados corretos

          cy.get('@addVeiculo').should('have.been.calledWith', Cypress.sinon.match(

            (veiculo) => veiculo.cliente_id === novoVeiculo.cliente_id && veiculo.placa === novoVeiculo.placa

          ));

    

             

          // Verifica se o novo veículo é exibido na tabela

          cy.get('#lista-veiculos').should('contain', novoVeiculo.placa);

          cy.get('#lista-veiculos').should('contain', novoVeiculo.marca);

          cy.get('#lista-veiculos').should('contain', novoVeiculo.modelo);

          cy.get('#lista-veiculos').should('contain', clienteExistente.nome);

        });

      });});
