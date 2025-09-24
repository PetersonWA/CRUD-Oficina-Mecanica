describe('Testes do Dashboard de Histórico e Análises', () => {
  let mockApi;
  const mockServicos = [
    // Serviço concluído no período para faturamento
    { id: 1, clienteNome: 'Cliente Faturado', placaVeiculo: 'FAT-1234', dataEntrada: '2025-09-15', dataConclusao: '2025-09-20', valorTotal: 500, status: 'Concluído', itens: [], mecanico: 'Carlos' },
    { id: 2, clienteNome: 'Cliente Antigo', placaVeiculo: 'OLD-4321', dataEntrada: '2025-08-10', dataConclusao: '2025-08-15', valorTotal: 300, status: 'Concluído', itens: [], mecanico: 'Daniel' },
    // Serviço em andamento
    { id: 3, clienteNome: 'Cliente Andamento', placaVeiculo: 'AND-5678', dataEntrada: '2025-09-18', dataConclusao: null, valorTotal: 700, status: 'Em andamento', itens: [], mecanico: 'Carlos' },
  ];
  const mockOrcamentos = [
    // Orçamento aprovado para taxa de conversão
    { id: 10, clienteNome: 'Cliente Aprovou', data: '15/09/2025', status: 'Aprovado' },
    { id: 11, clienteNome: 'Cliente Recusou', data: '16/09/2025', status: 'Recusado' },
    { id: 12, clienteNome: 'Cliente Pendente', data: '17/09/2025', status: 'Pendente' },
    { id: 13, clienteNome: 'Cliente Faturado', data: '18/09/2025', status: 'Faturado' },
  ];

  beforeEach(() => {
    mockApi = {
      readData: cy.stub().as('readData'),
    };

    mockApi.readData.withArgs('servicos.json').resolves(mockServicos);
    mockApi.readData.withArgs('orcamentos.json').resolves(mockOrcamentos);

    cy.visit('historico-servicos.html', {
      onBeforeLoad(win) {
        win.api = mockApi;
        win.lerDados = mockApi.readData;
        // Mock Chart.js para não renderizar gráficos e causar erros
        win.Chart = class MockChart {
          constructor(ctx, config) {
            this.ctx = ctx;
            this.config = config;
          }
          destroy() {}
        };
      },
    });
  });

  it('Deve calcular e exibir os KPIs corretamente na carga inicial', () => {
    // Faturamento: 500 (FAT-1234) + 300 (OLD-4321) = 800
    cy.get('#kpi-faturamento').should('contain', '800,00');
    // Serviços Concluídos: 2
    cy.get('#kpi-servicos-concluidos').should('contain', '2');
    // Ticket Médio: 800 / 2 = 400
    cy.get('#kpi-ticket-medio').should('contain', '400,00');
    // Taxa de Conversão: 2 Aprovados/Faturados de 4 total = 50%
    cy.get('#kpi-taxa-conversao').should('contain', '50.0');
  });

  it('Deve filtrar os dados por data e atualizar os KPIs e a lista', () => {
    // Filtra para um período que só inclui o 'Cliente Faturado'
    cy.get('#filtro-data-inicio').type('2025-09-01');
    cy.get('#filtro-data-fim').type('2025-09-21');
    cy.get('#tipoDataConclusao').check(); // Filtra por data de conclusão
    cy.contains('button', 'Aplicar Filtros').click();

    // KPIs atualizados para o período
    cy.get('#kpi-faturamento').should('contain', '500,00');
    cy.get('#kpi-servicos-concluidos').should('contain', '1');
    cy.get('#kpi-ticket-medio').should('contain', '500,00');
    // A taxa de conversão também é afetada pelo filtro de data
    cy.get('#kpi-taxa-conversao').should('contain', '50.0'); // 2 de 4 ainda estão no período

    // Lista de serviços deve conter apenas o serviço filtrado
    cy.get('#cards-servicos').children().should('have.length', 1);
    cy.get('#cards-servicos').should('contain', 'Cliente Faturado');
    cy.get('#cards-servicos').should('not.contain', 'Cliente Antigo');
  });

  it('Deve abrir o modal de detalhes ao clicar em um card', () => {
    const servico = mockServicos[0];
    // Clica no botão de ver detalhes do primeiro card
    cy.get('#cards-servicos').contains(servico.clienteNome).parents('.servico-card').find('button').click();

    // Verifica se o modal abriu com as informações corretas
    cy.get('#modalDetalhesServico').should('be.visible');
    cy.get('#detalhe-os-id').should('contain', servico.id);
    cy.get('#detalhe-cliente').should('contain', servico.clienteNome);
    cy.get('#detalhe-veiculo').should('contain', servico.placaVeiculo);
  });
});
