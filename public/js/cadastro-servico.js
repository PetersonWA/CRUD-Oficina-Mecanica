// Definição de `adicionarPeca` no escopo global para testabilidade
function adicionarPeca(descricao = '', quantidade = 1, valor = 0) {
  const elements = { // Definir elements no escopo da função para teste
    pecasBody: document.getElementById("pecas-servico-body"),
  };
  if (!elements.pecasBody) return;

  const row = elements.pecasBody.insertRow();
  row.className = "peca-row";

  const cellDesc = row.insertCell(0);
  const inputDesc = document.createElement('input');
  inputDesc.type = 'text';
  inputDesc.className = 'form-control form-control-sm';
  inputDesc.name = 'descricao';
  inputDesc.placeholder = 'Descrição da peça/serviço';
  inputDesc.value = descricao;
  cellDesc.appendChild(inputDesc);

  const cellQtd = row.insertCell(1);
  const inputQtd = document.createElement('input');
  inputQtd.type = 'number';
  inputQtd.className = 'form-control form-control-sm';
  inputQtd.name = 'quantidade';
  inputQtd.value = quantidade;
  inputQtd.min = '1';
  cellQtd.appendChild(inputQtd);

  const cellValor = row.insertCell(2);
  const inputValor = document.createElement('input');
  inputValor.type = 'text';
  inputValor.className = 'form-control form-control-sm';
  inputValor.name = 'valor';
  inputValor.placeholder = 'R$ 0,00';
  inputValor.value = window.formatCurrencyForInput(valor);
  cellValor.appendChild(inputValor);

  const cellAcoes = row.insertCell(3);
  const btnRemover = document.createElement('button');
  btnRemover.type = 'button';
  btnRemover.className = 'btn btn-danger btn-sm';
  btnRemover.innerHTML = '<i class="bi bi-trash"></i>';
  btnRemover.addEventListener('click', () => removerPeca(btnRemover));
  cellAcoes.appendChild(btnRemover);

  row
    .querySelector("[name=valor]")
    .addEventListener("input", (e) => maskCurrency(e.target));

  // Fix: Use window.calcularTotal to access the function defined inside DOMContentLoaded
  row
    .querySelectorAll("input")
    .forEach((input) => input.addEventListener("input", () => {
      if (window.calcularTotal) window.calcularTotal();
    }));
}

if (typeof window.testHooks === 'undefined') {
  window.testHooks = {};
}
window.testHooks.adicionarPecaServico = adicionarPeca;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("servico-form");
  if (!form) return; // Sai se não estiver na página correta
  let idOrcamentoOrigem = null; // Variável para rastrear o orçamento de origem

  // Mapeamento de Elementos
  const elements = {
    searchClienteInput: document.getElementById("search-cliente-input"),
    clienteHiddenInput: document.getElementById("cliente"),
    clienteSearchResults: document.getElementById("cliente-search-results"),
    selectVeiculo: document.getElementById("veiculo"),
    quilometragemInput: document.getElementById("quilometragemVeiculo"),
    pecasBody: document.getElementById("pecas-servico-body"),
    btnAdicionarPeca: document.getElementById("adicionar-peca"),
    maoDeObraInput: document.getElementById("valor-mao-de-obra"),
    subtotalDisplay: document.getElementById("subtotal-servico"),
    descontoInput: document.getElementById("desconto-percentual"),
    descontoDisplay: document.getElementById("valor-desconto"),
    totalDisplay: document.getElementById("total-final-servico"),
    formaPagamentoSelect: document.getElementById("formaPagamento"),
    parcelasContainer: document.getElementById("parcelas-container"),
    numeroParcelasInput: document.getElementById("numeroParcelas"),
    dataEntradaInput: document.getElementById("dataEntrada"),
    problemaRelatadoInput: document.getElementById("problemaRelatado"),
    mecanicoInput: document.getElementById("mecanico"),
    statusServicoInput: document.getElementById("statusServico"),
  };

  let listaClientes = [];
  let listaVeiculos = [];
  let config = {};

  window.removerPeca = (button) => {
    button.closest("tr").remove();
    if (window.calcularTotal) window.calcularTotal();
  };

  async function inicializar() {
    try {
      [listaClientes, listaVeiculos, config] = await Promise.all([
        window.api.getClientes(),
        window.api.getVeiculos(),
        window.api.getAllConfigs(),
      ]);
      configurarParcelas();
      vincularEventos();
      await preencherComOrcamento();
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      showAlert(
        "Falha ao carregar dados. Verifique a conexão com o banco de dados.",
        "danger"
      );
    }
  }

  async function preencherComOrcamento() {
    const orcamentoId = sessionStorage.getItem('orcamentoParaServicoId');
    if (!orcamentoId) return;

    idOrcamentoOrigem = parseInt(orcamentoId);
    sessionStorage.removeItem('orcamentoParaServicoId');

    try {
      const orcamento = await window.api.getOrcamentoById(idOrcamentoOrigem);
      if (!orcamento) {
        showAlert('Orçamento para conversão não encontrado.', 'warning');
        return;
      }

      const cliente = listaClientes.find(c => c.id === orcamento.cliente_id);
      if (cliente) {
        elements.searchClienteInput.value = cliente.nome;
        elements.clienteHiddenInput.value = cliente.id;
        carregarVeiculosDoCliente(cliente.id);

        setTimeout(() => {
          elements.selectVeiculo.value = orcamento.veiculo_id;
          handleSelecaoVeiculo();
        }, 100);
      }

      elements.problemaRelatadoInput.value = orcamento.descricao_problema || '';
      elements.statusServicoInput.value = 'Em andamento';
      elements.mecanicoInput.value = orcamento.mecanico_responsavel || '';
      elements.dataEntradaInput.value = new Date(orcamento.data_entrada).toISOString().split('T')[0];

      elements.pecasBody.innerHTML = '';
      let maoDeObraValor = 0;
      orcamento.itens.forEach(item => {
        if (item.tipo === 'Mão de Obra') {
          maoDeObraValor += item.valor_unitario * item.quantidade;
        } else {
          adicionarPeca(item.descricao, item.quantidade, item.valor_unitario);
        }
      });

      elements.maoDeObraInput.value = window.formatCurrencyForInput(maoDeObraValor);
      if (window.calcularTotal) window.calcularTotal();

    } catch (error) {
      console.error('Erro ao preencher formulário com orçamento:', error);
      showAlert('Falha ao carregar dados do orçamento.', 'danger');
    } finally {
      sessionStorage.removeItem('orcamentoParaServicoId');
    }
  }

  function configurarParcelas() {
    const maxParcelas = parseInt(config.maxParcelas, 10) || 12;
    elements.numeroParcelasInput.innerHTML = "";
    for (let i = 1; i <= maxParcelas; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `${i}x`;
      elements.numeroParcelasInput.appendChild(option);
    }
  }

  function vincularEventos() {
    elements.searchClienteInput.addEventListener("input", handleBuscaCliente);
    elements.clienteSearchResults.addEventListener(
      "click",
      handleSelecaoCliente
    );
    elements.selectVeiculo.addEventListener("change", handleSelecaoVeiculo);
    elements.btnAdicionarPeca.addEventListener("click", () => adicionarPeca());
    elements.formaPagamentoSelect.addEventListener(
      "change",
      handleMudancaPagamento
    );
    elements.maoDeObraInput.addEventListener("input", () => {
      maskCurrency(elements.maoDeObraInput);
      if (window.calcularTotal) window.calcularTotal();
    });
    form.addEventListener("submit", salvarServico);
  }

  function handleBuscaCliente() {
    const termo = elements.searchClienteInput.value.toLowerCase();
    elements.clienteSearchResults.innerHTML = "";
    if (!termo) {
      elements.clienteHiddenInput.value = "";
      return;
    }
    const clientesFiltrados = listaClientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(termo))
    );
    clientesFiltrados.forEach((cliente) => {
      const item = document.createElement("a");
      item.href = "#";
      item.className = "list-group-item list-group-item-action";
      item.textContent = `${cliente.nome} (${cliente.cpf_cnpj || "N/A"})`;
      item.dataset.id = cliente.id;
      item.dataset.nome = cliente.nome;
      elements.clienteSearchResults.appendChild(item);
    });
  }

  function handleSelecaoCliente(e) {
    if (!e.target.matches("a.list-group-item")) return;
    e.preventDefault();
    const clienteId = parseInt(e.target.dataset.id);
    elements.searchClienteInput.value = e.target.dataset.nome;
    elements.clienteHiddenInput.value = clienteId;
    elements.clienteSearchResults.innerHTML = "";
    carregarVeiculosDoCliente(clienteId);
  }

  function carregarVeiculosDoCliente(clienteId) {
    const veiculosDoCliente = listaVeiculos.filter(
      (v) => v.cliente_id === clienteId
    );
    elements.selectVeiculo.innerHTML =
      '<option value="">Selecione um veículo...</option>';
    elements.quilometragemInput.value = "";
    if (veiculosDoCliente.length > 0) {
      veiculosDoCliente.forEach((veiculo) => {
        const option = document.createElement("option");
        option.value = veiculo.id;
        option.textContent = `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;
        elements.selectVeiculo.appendChild(option);
      });
      elements.selectVeiculo.disabled = false;
    } else {
      elements.selectVeiculo.disabled = true;
      showAlert("Este cliente não possui veículos cadastrados.", "warning");
    }
  }
  function handleSelecaoVeiculo() {
    const veiculoId = parseInt(elements.selectVeiculo.value);
    if (veiculoId) {
      const veiculo = listaVeiculos.find((v) => v.id === veiculoId);
      if (veiculo)
        elements.quilometragemInput.value = veiculo.quilometragem || "";
    } else {
      elements.quilometragemInput.value = "";
    }
  }

  // Expose calcularTotal globally
  window.calcularTotal = function () {
    let subtotal = 0;
    elements.pecasBody.querySelectorAll(".peca-row").forEach((row) => {
      const quantidade =
        parseFloat(row.querySelector("[name=quantidade]").value) || 0;
      const valor = window.parseCurrency(row.querySelector("[name=valor]").value);
      subtotal += quantidade * valor;
    });
    subtotal += window.parseCurrency(elements.maoDeObraInput.value);
    const descontoPercentual = parseFloat(elements.descontoInput.value) || 0;
    const descontoValor = subtotal * (descontoPercentual / 100);
    const totalFinal = subtotal - descontoValor;

    elements.subtotalDisplay.textContent = `R$ ${formatarValor(subtotal)}`;
    elements.descontoDisplay.textContent = `- R$ ${formatarValor(
      descontoValor
    )}`;
    elements.totalDisplay.textContent = `R$ ${formatarValor(totalFinal)}`;
    atualizarValorParcela(totalFinal);
  }

  function atualizarValorParcela(total) {
    const numParcelas = parseInt(elements.numeroParcelasInput.value);
    const {
      jurosInicial = 0,
      acrescimoParcela = 0,
      parcelasSemJuros = 0,
      maxParcelas = 12,
    } = config;

    if (elements.formaPagamentoSelect.value !== "Cartão de Crédito") {
      for (let i = 1; i <= maxParcelas; i++) {
        const opt = elements.numeroParcelasInput.querySelector(
          `option[value="${i}"]`
        );
        if (opt) opt.textContent = `${i}x`;
      }
      return;
    }

    for (let i = 1; i <= maxParcelas; i++) {
      const opt = elements.numeroParcelasInput.querySelector(
        `option[value="${i}"]`
      );
      if (opt) {
        let valorParcela;
        if (i <= parcelasSemJuros) {
          valorParcela = total / i;
          opt.textContent = `${i}x de R$ ${formatarValor(
            valorParcela
          )} (s/ juros)`;
        } else {
          const taxa =
            (jurosInicial + (i - parcelasSemJuros - 1) * acrescimoParcela) /
            100;
          valorParcela = window.calcularTabelaPrice(total, i, taxa);
          opt.textContent = `${i}x de R$ ${window.formatarValor(valorParcela)}`;
        }
      }
    }
  }

  function handleMudancaPagamento() {
    elements.parcelasContainer.style.display =
      elements.formaPagamentoSelect.value === "Cartão de Crédito"
        ? "block"
        : "none";
    calcularTotal();
  }

  async function salvarServico(e) {
    e.preventDefault();

    // Coleta e Validação
    const clienteId = parseInt(elements.clienteHiddenInput.value);
    const veiculoId = parseInt(elements.selectVeiculo.value);
    if (!clienteId || !veiculoId)
      return showAlert("Selecione um cliente e um veículo.", "warning");

    // Validação de Quilometragem
    const quilometragemStr = String(
      elements.quilometragemInput.value || ""
    ).trim();
    const novaQuilometragem = quilometragemStr
      ? parseInt(quilometragemStr)
      : null;

    if (
      novaQuilometragem !== null &&
      (isNaN(novaQuilometragem) || novaQuilometragem < 0)
    ) {
      return showAlert(
        "Quilometragem inválida. Digite apenas números.",
        "danger"
      );
    }

    const veiculo = listaVeiculos.find((v) => v.id === veiculoId);
    const quilometragemAntiga = veiculo.quilometragem
      ? parseInt(veiculo.quilometragem)
      : 0;

    // Só bloqueia se for MENOR (permite igual ou maior)
    if (novaQuilometragem !== null && novaQuilometragem < quilometragemAntiga) {
      return showAlert(
        `A quilometragem informada (${novaQuilometragem} km) não pode ser menor que a última registrada (${quilometragemAntiga} km). Por favor, corrija.`,
        "danger"
      );
    }

    const itens = [];
    elements.pecasBody.querySelectorAll(".peca-row").forEach((row) => {
      const descricao = row.querySelector("[name=descricao]").value.trim();
      const quantidade =
        parseFloat(row.querySelector("[name=quantidade]").value) || 0;
      const valor_unitario = window.parseCurrency(
        row.querySelector("[name=valor]").value
      );
      if (descricao && quantidade > 0 && valor_unitario > 0) {
        itens.push({ descricao, tipo: "Peça", quantidade, valor_unitario });
      }
    });
    const maoDeObra = window.parseCurrency(elements.maoDeObraInput.value);
    if (maoDeObra > 0)
      itens.push({
        descricao: "Mão de Obra",
        tipo: "Mão de Obra",
        quantidade: 1,
        valor_unitario: maoDeObra,
      });
    if (itens.length === 0)
      return showAlert("Adicione pelo menos um item ao serviço.", "warning");

    // Montagem do Objeto
    const totalSemDesconto = window.parseCurrency(
      elements.subtotalDisplay.textContent
    );
    const descontoValor = window.parseCurrency(elements.descontoDisplay.textContent);
    const totalFinal = window.parseCurrency(elements.totalDisplay.textContent);
    const formaPagamento = elements.formaPagamentoSelect.value;
    const numeroParcelas = parseInt(elements.numeroParcelasInput.value);

    const novoServico = {
      cliente_id: clienteId,
      veiculo_id: veiculoId,
      data_entrada: elements.dataEntradaInput.value,
      data_competencia: elements.dataEntradaInput.value, // Automação da data de competência
      problema_relatado: elements.problemaRelatadoInput.value,
      mecanico: elements.mecanicoInput.value,
      status: elements.statusServicoInput.value,
      valor_original: totalSemDesconto,
      valor_desconto: descontoValor,
      valor_total: totalFinal, // Valor final sem juros
      forma_pagamento: formaPagamento,
      numero_parcelas:
        formaPagamento === "Cartão de Crédito" ? numeroParcelas : null,
      status_pagamento: "Pendente",
      quilometragem: novaQuilometragem,
      itens: itens,
      pagamento_inicial: null,
      idOrcamentoOrigem: idOrcamentoOrigem,
    };

    // Envio para o Backend
    try {
      const result = await window.api.addServico(novoServico);
      if (result.success) {
        showAlert("✅ Serviço salvo com sucesso!", "success");
        form.reset();
        handleMudancaPagamento();
        elements.pecasBody.innerHTML = "";
        calcularTotal();
        idOrcamentoOrigem = null; // Limpa o ID do orçamento
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Erro ao salvar serviço:", error);
      showAlert("Falha ao salvar o serviço.", "danger");
    }
  }

  inicializar();
});

if (typeof window.testHooks === 'undefined') {
  window.testHooks = {};
}
window.testHooks.adicionarPeca = adicionarPeca;