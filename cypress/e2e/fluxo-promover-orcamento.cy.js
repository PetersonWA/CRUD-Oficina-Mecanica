/// <reference types="cypress" />

context('Fluxo Completo de Promoção de Orçamento para Ordem de Serviço', () => {
  let orcamentoMockPendente;
  let orcamentoMockAprovado;
  let clienteMock;
  let veiculoMock;
  let orcamentoDetalhadoMock;
  let configsMock;

  beforeEach(() => {
    // --- Mocks de Dados ---
    clienteMock = { id: 1, nome: 'Cliente Teste E2E', cpf_cnpj: '123.456.789-00' };
    veiculoMock = { id: 1, cliente_id: 1, placa: 'ABC-1234', marca: 'Marca Teste', modelo: 'Modelo E2E' };
    orcamentoMockPendente = {
      id: 101,
      clienteId: 1,
      clienteNome: clienteMock.nome,
      veiculoId: 1,
      veiculoPlaca: veiculoMock.placa,
      dataEntrada: new Date().toISOString().split('T')[0],
      valorTotal: 350.00,
      status: 'Pendente'
    };
    orcamentoMockAprovado = { ...orcamentoMockPendente, status: 'Aprovado' };
    
    orcamentoDetalhadoMock = {
        ...orcamentoMockPendente,
        cliente_id: clienteMock.id,
        veiculo_id: veiculoMock.id,
        descricao_problema: 'Motor falhando em baixa rotação.',
        mecanico_responsavel: 'Carlos',
        data_entrada: orcamentoMockPendente.dataEntrada,
        itens: [
            { id: 1, servico_id: 101, descricao: 'Vela de ignição', tipo: 'Peça', quantidade: 4, valor_unitario: 50.00 },
            { id: 2, servico_id: 101, descricao: 'Mão de Obra', tipo: 'Mão de Obra', quantidade: 1, valor_unitario: 150.00 }
        ]
    };
    configsMock = {
      jurosInicial: 2.99,
      acrescimoParcela: 1.0,
      parcelasSemJuros: 1,
      maxParcelas: 12
    };
  });

    it('ETAPA 1: Deve carregar a lista de orçamentos e permitir a aprovação', () => {

      cy.visit('gerenciar-orcamentos.html', {

        onBeforeLoad(win) {

          win.api = {

            getOrcamentos: () => {},

            getOrcamentoById: () => {},

            updateOrcamento: () => {}

          };

          cy.stub(win.api, 'getOrcamentoById').withArgs(orcamentoMockPendente.id).resolves(orcamentoDetalhadoMock).as('getOrcamentoById');

          cy.stub(win.api, 'updateOrcamento').resolves({ success: true }).as('updateOrcamento');

        }

      });

  

      cy.window().its('testHooks').invoke('renderizarTabela', [orcamentoMockPendente]);

      

      cy.get('table#lista-orcamentos tbody tr').should('have.length', 1);

      cy.contains('td', 'Pendente').should('be.visible');

  

      cy.contains('td', String(orcamentoMockPendente.id).padStart(6, '0'))

        .parent('tr')

        .within(() => {

          cy.get('button.btn-warning').click(); // Botão de editar

        });

  

      cy.get('#modalEditarOrcamento').should('be.visible');

      cy.get('#editStatus').select('Aprovado');

      cy.get('#form-editar-orcamento').submit();

      

      cy.get('@updateOrcamento').should('have.been.called');

      

      cy.get('#modalEditarOrcamento').should('not.be.visible');

      

      cy.window().its('testHooks').invoke('renderizarTabela', [orcamentoMockAprovado]);

      

      cy.get('span.badge').should('have.text', 'Aprovado');

    });

    

    it('ETAPA 2: Deve redirecionar para a página de serviço ao promover um orçamento', () => {

      cy.visit('gerenciar-orcamentos.html', {

        onBeforeLoad(win) {

          win.api = { getOrcamentos: () => {} };

          cy.stub(win.api, 'getOrcamentos').resolves([orcamentoMockAprovado]).as('getOrcamentos');

        }

      });

      

      cy.window().its('testHooks').invoke('renderizarTabela', [orcamentoMockAprovado]);

      cy.get('table#lista-orcamentos tbody tr').should('have.length', 1);

  

      cy.contains('td', String(orcamentoMockAprovado.id).padStart(6, '0'))

        .parent('tr')

        .within(() => {

          cy.get('button[title="Promover para Ordem de Serviço"]').click();

        });

        

      cy.url().should('include', 'cadastro-servico.html');

    });

  it('ETAPA 3 e 4: Deve preencher o formulário de serviço e salvar a OS', () => {
    // Simula que viemos da página anterior
    cy.window().then(win => {
      win.sessionStorage.setItem('orcamentoParaServicoId', orcamentoMockAprovado.id);
    });

    cy.visit('cadastro-servico.html', {
      onBeforeLoad(win) {
        win.api = {
          getOrcamentoById: () => {},
          getClientes: () => {},
          getVeiculos: () => {},
          getAllConfigs: () => {},
          addServico: () => {}
        };
        cy.stub(win.api, 'getOrcamentoById').withArgs(orcamentoMockAprovado.id).resolves(orcamentoDetalhadoMock).as('getOrcamentoById');
        cy.stub(win.api, 'getClientes').resolves([clienteMock]).as('getClientes');
        cy.stub(win.api, 'getVeiculos').resolves([veiculoMock]).as('getVeiculos');
        cy.stub(win.api, 'getAllConfigs').resolves(configsMock).as('getConfigs');
        cy.stub(win.api, 'addServico').resolves({ success: true, id: 202 }).as('addServico');
      }
    });
    
    // Valida o preenchimento automático
    cy.get('#search-cliente-input').should('have.value', clienteMock.nome);
    cy.get('#valor-mao-de-obra').should('have.value', 'R$ 150,00');

    // Preenche o resto do formulário
    cy.get('#formaPagamento').select('Cartão de Crédito');
    cy.get('#numeroParcelas').select('3');
    cy.get('#mecanico').clear().type('Mecanico Final');
    cy.get('#statusServico').select('Em andamento');

    // Salva
    cy.get('form#servico-form').submit();

    // Verifica a chamada à API
    cy.get('@addServico').should('have.been.called');
    cy.get('@addServico').then((interception) => {
      const body = interception.args[0];
      expect(body.idOrcamentoOrigem).to.eq(orcamentoMockAprovado.id);
      expect(body.forma_pagamento).to.eq('Cartão de Crédito');
    });

    // Verifica se o formulário foi resetado
    cy.get('#search-cliente-input').should('have.value', '');
  });
});
