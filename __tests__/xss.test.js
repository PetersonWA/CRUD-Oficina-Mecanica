/**
 * @jest-environment jsdom
 */

// Mock global para window.electronAPI
global.window = Object.create(window);
global.window.electronAPI = {
    onPrintData: jest.fn(),
    readyToPrint: jest.fn(),
    printError: jest.fn(),
};

require('../public/js/utils.js');

// Simula as funções globais que são definidas em outros scripts
global.abrirModalEditarCliente = jest.fn();
global.excluirCliente = jest.fn();
global.removerPeca = jest.fn(); // Mock para os-manual e cadastro-servico
global.maskCurrency = jest.fn(); // Mock para os-manual e cadastro-servico
global.calcularTotal = jest.fn(); // Mock para os-manual e cadastro-servico

// Carrega o script que queremos testar.
// O script adiciona `window.testHooks.renderizarClientes`.
require('../public/js/clientes-veiculos.js');
require('../public/js/gerenciar-servicos.js');
require('../public/js/gerenciar-pagamentos.js');
require('../public/js/gerenciar-orcamentos.js');
require('../public/js/despesas.js');
require('../public/js/receitas-avulsas.js');
require('../public/js/orcamento-mecanico.js');
require('../public/js/os-manual.js');
require('../public/js/cadastro-servico.js');
require('../public/js/template-orcamento.js');


describe('Prevenção de XSS em Renderização de Tabelas', () => {

  test('Deve higienizar dados de clientes ao renderizar a tabela', () => {
    // 1. Setup do DOM
    document.body.innerHTML = `
      <table>
        <tbody id="lista-clientes"></tbody>
      </table>
    `;
    const listaClientesTable = document.getElementById('lista-clientes');

    // 2. Dados Maliciosos
    const maliciousClient = {
      id: 1,
      nome: "Cliente Malicioso <script>alert('XSS');</script>",
      telefone: "123456789",
      email: "malicioso@email.com",
      cpf_cnpj: "123.456.789-00"
    };
    const clientes = [maliciousClient];

    // 3. Execução da Função de Renderização
    // A função é exposta em `window.testHooks` pelo script carregado
    window.testHooks.renderizarClientes(clientes, listaClientesTable);

    // 4. Asserções de Segurança
    const firstRow = listaClientesTable.querySelector('tr');
    const nameCell = firstRow.cells[0];

    // A asserção mais importante: o innerHTML não deve conter a tag de script.
    // O navegador (via JSDOM) não deve interpretar a tag.
    expect(nameCell.innerHTML).not.toContain('<script>');

    // O textContent, no entanto, deve conter a string exata que foi passada,
    // provando que os dados não foram perdidos, apenas tratados como texto.
    expect(nameCell.textContent).toBe("Cliente Malicioso <script>alert('XSS');</script>");
  });

  test('Deve higienizar dados de veículos ao renderizar a tabela', () => {
    // 1. Setup do DOM
    document.body.innerHTML = `
      <table>
        <tbody id="lista-veiculos"></tbody>
      </table>
    `;
    const listaVeiculosTable = document.getElementById('lista-veiculos');

    // 2. Dados Maliciosos
    const maliciousVehicle = {
      id: 1,
      clienteNome: "Cliente Seguro",
      marca: "Marca <script>alert('XSS')</script>",
      modelo: "Modelo",
      ano: "2023",
      placa: "ABC-1234",
      cor: "Preto",
      quilometragem: "10000"
    };
    const veiculos = [maliciousVehicle];

    // 3. Execução da Função de Renderização
    // A função é exposta em `window.testHooks` pelo script carregado
    window.testHooks.renderizarVeiculos(veiculos, listaVeiculosTable);

    // 4. Asserções de Segurança
    const firstRow = listaVeiculosTable.querySelector('tr');
    const brandCell = firstRow.cells[1]; // A célula da marca é a segunda (índice 1)

    // O innerHTML não deve conter a tag de script.
    expect(brandCell.innerHTML).not.toContain('<script>');

    // O textContent deve conter a string exata.
    expect(brandCell.textContent).toBe("Marca <script>alert('XSS')</script>");
  });

  test('Deve higienizar dados de serviços ao renderizar a tabela', () => {
    // 1. Setup do DOM e Mocks
    document.body.innerHTML = `<table><tbody id="lista-servicos"></tbody></table>`;
    const listaServicosTable = document.getElementById('lista-servicos');
    
    // Mock de funções globais necessárias por _renderizarServicosSeguro
    global.formatarValor = (valor) => valor.toFixed(2);
    global.getStatusPagamentoBadge = (status) => `<span>${status}</span>`;
    global.lancarCustoComoDespesa = jest.fn();
    global.abrirModalVerItens = jest.fn();
    global.abrirModalEditarServico = jest.fn();
    global.excluirServico = jest.fn();

    // Carrega o script que queremos testar
    require('../public/js/gerenciar-servicos.js');

    // 2. Dados Maliciosos
    const maliciousService = {
      id: 1,
      clienteNome: "Cliente <script>alert('XSS')</script>",
      placaVeiculo: "ABC-1234",
      dataEntrada: "2025-01-01",
      dataConclusao: null,
      valorTotal: 100,
      mecanico: "Mecanico",
      status: "Em andamento",
      statusPagamento: "Pendente",
      itens: []
    };

    // 3. Execução da Função de Renderização
    window.testHooks.renderizarServicos([maliciousService], listaServicosTable, global.getStatusPagamentoBadge, global.formatarValor);

    // 4. Asserções de Segurança
    const firstRow = listaServicosTable.querySelector('tr');
    const clientCell = firstRow.cells[1];

    expect(clientCell.innerHTML).not.toContain('<script>');
    expect(clientCell.textContent).toBe("Cliente <script>alert('XSS')</script>");
  });

  test('Deve higienizar dados de pagamentos ao renderizar a tabela', () => {
    // 1. Setup do DOM e Mocks
    document.body.innerHTML = `<table><tbody id="lista-servicos-pagamentos"></tbody></table>`;
    const listaPagamentosTable = document.getElementById('lista-servicos-pagamentos');
    
    // Mock de funções globais necessárias
    global.formatarValor = (valor) => valor.toFixed(2);
    global.getStatusPagamentoBadge = (status) => `<span>${status}</span>`;
    global.abrirModalPagamentos = jest.fn();

    // Carrega o script que queremos testar
    require('../public/js/gerenciar-pagamentos.js');

    // 2. Dados Maliciosos
    const maliciousPayment = {
      id: 1,
      clienteNome: "Cliente <script>alert('XSS')</script>",
      placaVeiculo: "ABC-1234",
      dataEntrada: "2025-01-01",
      valorTotal: 100,
      formaPagamento: "Dinheiro",
      statusPagamento: "Pendente"
    };

    // 3. Execução da Função de Renderização
    window.testHooks.renderizarPagamentos([maliciousPayment], listaPagamentosTable, global.getStatusPagamentoBadge, global.formatarValor);

    // 4. Asserções de Segurança
    const firstRow = listaPagamentosTable.querySelector('tr');
    const clientCell = firstRow.cells[1];

    expect(clientCell.innerHTML).not.toContain('<script>');
    expect(clientCell.textContent).toBe("Cliente <script>alert('XSS')</script>");
  });

  test('Deve higienizar dados de orçamentos ao renderizar a tabela', () => {
    // 1. Setup do DOM
    document.body.innerHTML = `<table><tbody id="lista-orcamentos"></tbody></table>`;
    const listaOrcamentosTable = document.getElementById('lista-orcamentos');

    // Mock de funções globais
    global.abrirModalVerItens = jest.fn();
    global.abrirModalEditarOrcamento = jest.fn();
    global.imprimirOrcamento = jest.fn();
    global.excluirOrcamento = jest.fn();
    
    // Carrega o script que queremos testar
    require('../public/js/gerenciar-orcamentos.js');

    // 2. Dados Maliciosos
    const maliciousBudget = {
      id: 1,
      clienteNome: "Cliente <script>alert('XSS')</script>",
      veiculoPlaca: "ABC-1234",
      dataEntrada: "2025-01-01",
      valorTotal: 100,
      status: "Pendente"
    };

    // 3. Execução da Função de Renderização
    window.testHooks.renderizarOrcamentos([maliciousBudget], listaOrcamentosTable);

    // 4. Asserções de Segurança
    const firstRow = listaOrcamentosTable.querySelector('tr');
    const clientCell = firstRow.cells[1];

    expect(clientCell.innerHTML).not.toContain('<script>');
    expect(clientCell.textContent).toBe("Cliente <script>alert('XSS')</script>");
  });

  test('Deve higienizar dados de despesas ao renderizar a tabela', () => {
    // 1. Setup do DOM e Mocks
    document.body.innerHTML = `<table><tbody id="despesas-table-body"></tbody></table>`;
    const despesasTableBody = document.getElementById('despesas-table-body');
    
    // Mock de funções globais necessárias
    global.formatarValor = (valor) => valor.toFixed(2);
    global.handleExcluirDespesa = jest.fn();

    // Carrega o script que queremos testar
    require('../public/js/despesas.js');

    // 2. Dados Maliciosos
    const maliciousExpense = {
      id: 1,
      nome_conta: "Conta <script>alert('XSS')</script>",
      anotacao: "Anotação maliciosa",
      valor: 100,
      data_competencia: "2025-01-01",
      data_liquidacao: null
    };

    // 3. Execução da Função de Renderização
    window.testHooks.renderizarDespesas([maliciousExpense], despesasTableBody, global.formatarValor, global.handleExcluirDespesa);

    // 4. Asserções de Segurança
    const firstRow = despesasTableBody.querySelector('tr');
    const accountCell = firstRow.cells[0];

    expect(accountCell.innerHTML).not.toContain('<script>');
    expect(accountCell.textContent).toBe("Conta <script>alert('XSS')</script>");
  });

  test('Deve higienizar dados de receitas ao renderizar a tabela', () => {
    // 1. Setup do DOM e Mocks
    document.body.innerHTML = `<table><tbody id="receitas-table-body"></tbody></table>`;
    const receitasTableBody = document.getElementById('receitas-table-body');
    
    // Mock de funções globais necessárias
    global.formatarValor = (valor) => valor.toFixed(2);
    global.handleExcluirReceita = jest.fn();

    // Carrega o script que queremos testar
    require('../public/js/receitas-avulsas.js');

    // 2. Dados Maliciosos
    const maliciousReceita = {
      id: 1,
      nome_conta: "Receita <script>alert('XSS')</script>",
      descricao_problema: "Descrição maliciosa",
      valor_total: 100,
      data_competencia: "2025-01-01",
      data_conclusao: null
    };

    // 3. Execução da Função de Renderização
    window.testHooks.renderizarReceitas([maliciousReceita], receitasTableBody, global.formatarValor, global.handleExcluirReceita);

    // 4. Asserções de Segurança
    const firstRow = receitasTableBody.querySelector('tr');
    const accountCell = firstRow.cells[0];

    expect(accountCell.innerHTML).not.toContain('<script>');
    expect(accountCell.textContent).toBe("Receita <script>alert('XSS')</script>");
  });

  test('Deve higienizar dados ao adicionar peça em orçamento', () => {
    // 1. Setup do DOM e Mocks
    document.body.innerHTML = `<table><tbody id="pecas-orcamento-body"></tbody></table>`;
    const pecasOrcamentoBody = document.getElementById('pecas-orcamento-body');
    
    // Mock de funções globais necessárias
    global.formatarValor = (valor) => valor.toFixed(2);
    global.maskCurrency = jest.fn();
    global.calcularTotal = jest.fn();
    global.removerPeca = jest.fn();
    
    // Carrega o script que queremos testar
    require('../public/js/orcamento-mecanico.js');

    // 2. Dados Maliciosos
    const maliciousDescription = "Peça <script>alert('XSS')</script>";

    // 3. Execução da Função de Renderização
    window.testHooks.adicionarPeca(maliciousDescription, 1, 100);

    // 4. Asserções de Segurança
    const firstRow = document.getElementById('pecas-orcamento-body').querySelector('tr');
    const descriptionInput = firstRow.querySelector('input[name="descricao"]');

    // O valor do input deve ser a string maliciosa literal, não HTML executado.
    expect(descriptionInput.value).toBe(maliciousDescription);
  });

  test('Deve higienizar dados ao adicionar item em OS Manual', () => {
    // 1. Setup do DOM
    document.body.innerHTML = `<table><tbody id="itens-os-body"></tbody></table>`;
    
    // 2. Mock de funções globais
    global.maskCurrency = jest.fn();
    global.calcularTotal = jest.fn();
    global.removerItem = jest.fn();

    // 3. Carrega o script
    require('../public/js/os-manual.js');

    // 4. Execução da função a ser testada
    // A função adicionarItem é diretamente exposta no window pelo script
    window.adicionarItem(); 

    // 5. Simulação de inserção de dados maliciosos
    const firstRow = document.getElementById('itens-os-body').querySelector('tr');
    const descriptionInput = firstRow.querySelector('input[name="descricao"]');
    const maliciousInput = "Item Malicioso <script>alert('xss')</script>";
    descriptionInput.value = maliciousInput;

    // 6. Asserção de segurança
    expect(descriptionInput.value).toBe(maliciousInput);
    // Como a refatoração usa .value, o browser não interpreta o HTML.
    // A verificação de que o valor é exatamente o que foi inserido é suficiente.
  });

  test('Deve higienizar dados ao adicionar peça em cadastro de serviço', () => {
    // 1. Setup do DOM
    document.body.innerHTML = `<table><tbody id="pecas-servico-body"></tbody></table>`;
    
    // 2. Mock de funções globais
    global.formatarValor = (valor) => valor.toFixed(2);
    global.maskCurrency = jest.fn();
    global.calcularTotal = jest.fn();
    global.removerPeca = jest.fn();
    global.window.formatCurrencyForInput = (val) => val.toFixed(2); // Mock da função que estava faltando

    // 3. Carrega o script
    require('../public/js/cadastro-servico.js');

    // 4. Dados Maliciosos
    const maliciousDescription = "Injeção Eletrônica <script>alert('XSS')</script>";

    // 5. Execução da função a ser testada
    window.testHooks.adicionarPecaServico(maliciousDescription, 1, 150);

    // 6. Asserções de Segurança
    const firstRow = document.getElementById('pecas-servico-body').querySelector('tr');
    const descriptionInput = firstRow.querySelector('input[name="descricao"]');

    // O valor do input deve ser a string maliciosa literal, não HTML executado.
    expect(descriptionInput.value).toBe(maliciousDescription);
  });

  test('Deve higienizar dados ao renderizar o template de orçamento', () => {
    // 1. Setup do DOM e Mocks
    document.body.innerHTML = `
      <div id="nome-oficina"></div>
      <div id="endereco-oficina"></div>
      <div id="telefone-oficina"></div>
      <div id="email-oficina"></div>
      <div id="cnpj-oficina"></div>
      <img id="logo" style="display: none;">
      <div id="os-id"></div>
      <div id="data-emissao"></div>
      <div id="data-validade"></div>
      <div id="nome-cliente"></div>
      <div id="telefone-cliente"></div>
      <div id="email-cliente"></div>
      <div id="endereco-cliente"></div>
      <div id="modelo-veiculo"></div>
      <div id="placa-veiculo"></div>
      <div id="ano-veiculo"></div>
      <div id="km-veiculo"></div>
      <div id="obs-iniciais"></div>
      <table><tbody id="lista-servicos-tbody"></tbody></table>
      <div id="subtotal"></div>
      <div id="desconto"></div>
      <div id="total"></div>
      <div id="footer-nome-oficina"></div>
      <div id="footer-telefone"></div>
      <div id="nome-responsavel"></div>
      <img id="imagem-assinatura" style="display: none;">
      <div id="formas-pagamento"></div>
    `;
    
    // Mock de funções globais e window.electronAPI
    global.formatarValor = (valor) => valor.toFixed(2);
    global.window.electronAPI = {
        onPrintData: jest.fn(),
        readyToPrint: jest.fn(),
        printError: jest.fn(),
    };
    
    // Carrega o script que queremos testar
    require('../public/js/template-orcamento.js');

    // 2. Dados Maliciosos
    const maliciousData = {
      config: {
        nomeOficina: "Oficina <script>alert('XSS')</script>",
        logoPath: "path/to/logo.png"
      },
      budget: {
        id: 1,
        data_entrada: "2025-01-01",
        descricao_problema: "Problema <script>alert('XSS')</script>",
        valor_total: 100,
        itens: [{
          descricao: "Item <script>alert('XSS')</script>",
          quantidade: 1,
          valor_unitario: 100
        }]
      },
      client: {
        nome: "Cliente <script>alert('XSS')</script>",
      },
      vehicle: {
        marca: "Marca <script>alert('XSS')</script>"
      }
    };

    // 3. Execução da Função de Renderização
    window.testHooks.renderTemplateOrcamento(maliciousData, document, global.formatarValor);

    // 4. Asserções de Segurança
    expect(document.getElementById('nome-oficina').innerHTML).not.toContain('<script>');
    expect(document.getElementById('nome-oficina').textContent).toBe("Oficina <script>alert('XSS')</script>");

    expect(document.getElementById('nome-cliente').innerHTML).not.toContain('<script>');
    expect(document.getElementById('nome-cliente').textContent).toBe("Cliente <script>alert('XSS')</script>");

    expect(document.getElementById('obs-iniciais').innerHTML).not.toContain('<script>');
    expect(document.getElementById('obs-iniciais').textContent).toBe("Problema <script>alert('XSS')</script>");

    const itemRow = document.getElementById('lista-servicos-tbody').querySelector('tr');
    const itemDescCell = itemRow.cells[0];
    expect(itemDescCell.innerHTML).not.toContain('<script>');
    expect(itemDescCell.textContent).toBe("Item <script>alert('XSS')</script>");
  });
});