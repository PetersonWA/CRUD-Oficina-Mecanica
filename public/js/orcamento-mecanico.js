// Funções no escopo global para testabilidade
function adicionarPeca(descricao = "", quantidade = 1, valor = 0.0) {
    console.log("DEBUG: adicionarPeca called. Desc:", descricao); // Debug log
    const pecasBody = document.getElementById("pecas-orcamento-body");
    if (!pecasBody) {
        console.log("DEBUG: pecasBody not found."); // Debug log
        return;
    }
    // ... restante da função ...

    const row = pecasBody.insertRow();
    row.className = "peca-row";

    const cellDesc = row.insertCell(0);
    const inputDesc = document.createElement('input');
    inputDesc.type = 'text';
    inputDesc.className = 'form-control form-control-sm';
    inputDesc.placeholder = 'Descrição da Peça/Serviço';
    inputDesc.name = 'descricao';
    inputDesc.value = descricao;
    cellDesc.appendChild(inputDesc);

    const cellQtd = row.insertCell(1);
    const inputQtd = document.createElement('input');
    inputQtd.type = 'number';
    inputQtd.className = 'form-control form-control-sm';
    inputQtd.value = quantidade;
    inputQtd.min = "1";
    inputQtd.name = 'quantidade';
    cellQtd.appendChild(inputQtd);

    const cellValor = row.insertCell(2);
    const inputValor = document.createElement('input');
    inputValor.type = 'text';
    inputValor.className = 'form-control form-control-sm';
    inputValor.value = formatarValor(valor);
    inputValor.placeholder = 'R$ 0,00';
    inputValor.name = 'valor';
    cellValor.appendChild(inputValor);
    
    const cellAcoes = row.insertCell(3);
    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.className = 'btn btn-danger btn-sm';
    btnRemover.innerHTML = '<i class="bi bi-trash"></i>';
    btnRemover.addEventListener('click', () => removerPeca(btnRemover));
    cellAcoes.appendChild(btnRemover);

    inputValor.addEventListener("input", (e) => maskCurrency(e.target));
    row
      .querySelectorAll("input")
      .forEach((input) => input.addEventListener("input", calcularTotal));
    
    if (document.readyState === "complete" || document.readyState === "interactive") {
      calcularTotal();
    }
}

if (typeof window.testHooks === 'undefined') {
    window.testHooks = {};
}
window.testHooks.adicionarPeca = adicionarPeca;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("orcamentoForm");
  if (!form) return;

  const elements = {
    pageTitle: document.querySelector("h2.text-primary"),
    submitButton: form.querySelector(".btn-lg"),
    searchClienteInput: document.getElementById("search-cliente-input"),
    clienteHiddenInput: document.getElementById("clienteOrcamento"),
    clienteSearchResults: document.getElementById("cliente-search-results"),
    selectVeiculo: document.getElementById("veiculoOrcamento"),
    telefoneInput: document.getElementById("telefoneOrcamento"),
    emailInput: document.getElementById("emailOrcamento"),
    modeloVeiculoInput: document.getElementById("modeloVeiculo"),
    placaVeiculoInput: document.getElementById("placaVeiculo"),
    kmVeiculoInput: document.getElementById("kmVeiculo"),
    problemaRelatadoInput: document.getElementById("problemaRelatado"),
    statusContainer: document.getElementById("statusOrcamentoContainer"),
    statusSelect: document.getElementById("statusOrcamento"),
    pecasBody: document.getElementById("pecas-orcamento-body"),
    btnAdicionarPeca: document.getElementById("adicionar-peca"),
    maoDeObraInput: document.getElementById("valor-mao-de-obra"),
    subtotalDisplay: document.getElementById("subtotal-orcamento"),
    descontoInput: document.getElementById("desconto-percentual"),
    descontoDisplay: document.getElementById("valor-desconto"),
    totalDisplay: document.getElementById("total-final-orcamento"),
  };

  let listaClientes = [];
  let listaVeiculos = [];
  let orcamentoIdEmEdicao = null;

  window.salvarEGerarPDF = salvarEGerarPDF;
  window.removerPeca = removerPeca;
  window.calcularTotal = calcularTotal;

  async function inicializar() {
    const urlParams = new URLSearchParams(window.location.search);
    orcamentoIdEmEdicao = urlParams.get("id") ? parseInt(urlParams.get("id")) : null;
    try {
      [listaClientes, listaVeiculos] = await Promise.all([
        window.api.getClientes(),
        window.api.getVeiculos(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      showAlert("Falha ao carregar clientes e veículos.", "danger");
      return;
    }
    if (orcamentoIdEmEdicao) {
      elements.pageTitle.textContent = "Editar Orçamento Mecânico";
      elements.submitButton.innerHTML =
        '<i class="bi bi-save me-2"></i>Salvar Alterações e Gerar PDF';
      elements.statusContainer.style.display = "block";
      await carregarOrcamentoParaEdicao(orcamentoIdEmEdicao);
    } else {
      elements.statusContainer.style.display = "none";
    }
    vincularEventos();
  }

  async function carregarOrcamentoParaEdicao(id) {
    const orcamento = await window.api.getOrcamentoById(id);
    if (!orcamento) {
      showAlert("Orçamento não encontrado para edição.", "danger");
      return;
    }
    const cliente = listaClientes.find((c) => c.id === orcamento.cliente_id);
    if (cliente) {
      elements.searchClienteInput.value = cliente.nome;
      elements.clienteHiddenInput.value = cliente.id;
      elements.telefoneInput.value = cliente.telefone;
      elements.emailInput.value = cliente.email;
      carregarVeiculosDoCliente(cliente.id, orcamento.veiculo_id);
    }
    elements.problemaRelatadoInput.value = orcamento.descricao_problema;
    elements.statusSelect.value = orcamento.status;
    elements.pecasBody.innerHTML = "";
    (orcamento.itens || []).forEach((item) => {
      if (item.descricao.toLowerCase() === "mão de obra") {
        elements.maoDeObraInput.value = formatarValor(item.valor_unitario);
      } else {
        adicionarPeca(item.descricao, item.quantidade, item.valor_unitario);
      }
    });
    calcularTotal();
  }

  function vincularEventos() {
    elements.searchClienteInput.addEventListener("input", handleBuscaCliente);
    elements.clienteSearchResults.addEventListener("click", handleSelecaoCliente);
    document.addEventListener("click", (e) => {
      if (!elements.searchClienteInput.contains(e.target) && !elements.clienteSearchResults.contains(e.target)) {
        elements.clienteSearchResults.innerHTML = "";
      }
    });
    elements.selectVeiculo.addEventListener("change", handleSelecaoVeiculo);
    elements.btnAdicionarPeca.addEventListener("click", () => adicionarPeca());
    elements.maoDeObraInput.addEventListener("input", () => {
      maskCurrency(elements.maoDeObraInput);
      calcularTotal();
    });
    elements.descontoInput.addEventListener("input", calcularTotal);
  }

  function handleBuscaCliente() {
    const termo = elements.searchClienteInput.value.toLowerCase();
    elements.clienteSearchResults.innerHTML = "";
    if (!termo) {
      elements.clienteHiddenInput.value = "";
      return;
    }
    const clientesFiltrados = listaClientes.filter(
      (c) => c.nome.toLowerCase().includes(termo) || c.cpf_cnpj.toLowerCase().includes(termo)
    );
    clientesFiltrados.forEach((cliente) => {
      const item = document.createElement("a");
      item.href = "#";
      item.className = "list-group-item list-group-item-action";
      item.textContent = `${cliente.nome} (${cliente.cpf_cnpj})`;
      item.dataset.id = cliente.id;
      item.dataset.nome = cliente.nome;
      elements.clienteSearchResults.appendChild(item);
    });
  }

  function handleSelecaoCliente(e) {
    if (e.target && e.target.matches("a.list-group-item")) {
      e.preventDefault();
      const clienteId = parseInt(e.target.dataset.id);
      const cliente = listaClientes.find((c) => c.id === clienteId);
      if (cliente) {
        elements.searchClienteInput.value = cliente.nome;
        elements.clienteHiddenInput.value = cliente.id;
        elements.telefoneInput.value = cliente.telefone;
        elements.emailInput.value = cliente.email;
        elements.clienteSearchResults.innerHTML = "";
        carregarVeiculosDoCliente(cliente.id);
      }
    }
  }

  function handleSelecaoVeiculo() {
    const veiculoId = parseInt(elements.selectVeiculo.value);
    const veiculo = listaVeiculos.find((v) => v.id === veiculoId);
    if (veiculo) {
      elements.modeloVeiculoInput.value = `${veiculo.marca} ${veiculo.modelo}`;
      elements.placaVeiculoInput.value = veiculo.placa;
      elements.kmVeiculoInput.value = veiculo.quilometragem || "";
    } else {
      [elements.modeloVeiculoInput, elements.placaVeiculoInput, elements.kmVeiculoInput].forEach((el) => (el.value = ""));
    }
  }

  function carregarVeiculosDoCliente(clienteId, veiculoSelecionadoId = null) {
    const veiculosDoCliente = listaVeiculos.filter((v) => v.cliente_id === clienteId);
    elements.selectVeiculo.innerHTML = '<option value="">Selecione um veículo...</option>';
    if (veiculosDoCliente.length > 0) {
      veiculosDoCliente.forEach((veiculo) => {
        const option = document.createElement("option");
        option.value = veiculo.id;
        option.textContent = `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;
        if (veiculo.id === veiculoSelecionadoId) {
          option.selected = true;
        }
        elements.selectVeiculo.appendChild(option);
      });
      elements.selectVeiculo.disabled = false;
      if (veiculoSelecionadoId) {
        handleSelecaoVeiculo();
      }
    } else {
      elements.selectVeiculo.disabled = true;
    }
  }

  function removerPeca(button) {
    button.closest("tr").remove();
    calcularTotal();
  }

  function calcularTotal() {
    let subtotal = 0;
    elements.pecasBody.querySelectorAll(".peca-row").forEach((row) => {
      const quantidade = parseFloat(row.querySelector("[name=quantidade]").value) || 0;
      const valor = getNumericValue(row.querySelector("[name=valor]").value);
      subtotal += quantidade * valor;
    });
    subtotal += getNumericValue(elements.maoDeObraInput.value);
    const descontoPercentual = parseFloat(elements.descontoInput.value) || 0;
    const descontoValor = subtotal * (descontoPercentual / 100);
    const totalFinal = subtotal - descontoValor;
    elements.subtotalDisplay.textContent = `R$ ${formatarValor(subtotal)}`;
    elements.descontoDisplay.textContent = `- R$ ${formatarValor(descontoValor)}`;
    elements.totalDisplay.textContent = `R$ ${formatarValor(totalFinal)}`;
    return totalFinal;
  }

  async function salvarEGerarPDF() {
    const clienteId = parseInt(elements.clienteHiddenInput.value);
    const veiculoId = parseInt(elements.selectVeiculo.value);
    if (!clienteId || !veiculoId) {
      return showAlert("Por favor, selecione um cliente e um veículo.", "warning");
    }
    const veiculo = listaVeiculos.find((v) => v.id === veiculoId);
    const quilometragemStr = String(elements.kmVeiculoInput.value || "").trim();
    const novaQuilometragem = quilometragemStr ? parseInt(quilometragemStr) : null;
    if (novaQuilometragem !== null && (isNaN(novaQuilometragem) || novaQuilometragem < 0)) {
      return showAlert("Quilometragem inválida. Digite apenas números.", "danger");
    }
    const quilometragemAntiga = veiculo.quilometragem ? parseInt(veiculo.quilometragem) : 0;
    if (novaQuilometragem !== null && novaQuilometragem < quilometragemAntiga) {
      return showAlert(`A quilometragem informada (${novaQuilometragem} km) não pode ser menor que a última registrada (${quilometragemAntiga} km). Por favor, corrija.`, "danger");
    }
    let hasInvalidItem = false;
    const itens = [];
    elements.pecasBody.querySelectorAll(".peca-row").forEach((row, index) => {
      const descricao = row.querySelector("[name=descricao]").value.trim();
      const quantidade = parseFloat(row.querySelector("[name=quantidade]").value) || 0;
      const valor_unitario = getNumericValue(row.querySelector("[name=valor]").value);
      if (descricao) {
        if (quantidade <= 0) {
          showAlert(`O item "${descricao}" (linha ${index + 1}) está com quantidade inválida.`, "danger");
          hasInvalidItem = true;
        }
        if (valor_unitario <= 0) {
          showAlert(`O item "${descricao}" (linha ${index + 1}) está com valor inválido.`, "danger");
          hasInvalidItem = true;
        }
        if (!hasInvalidItem) {
          itens.push({ descricao, tipo: "Peça", quantidade, valor_unitario });
        }
      }
    });
    if (hasInvalidItem) return;
    const maoDeObraValor = getNumericValue(elements.maoDeObraInput.value);
    if (maoDeObraValor > 0) {
      itens.push({ descricao: "Mão de Obra", tipo: "Mão de Obra", quantidade: 1, valor_unitario: maoDeObraValor });
    }
    if (itens.length === 0) {
      return showAlert("Adicione pelo menos uma peça ou um valor de mão de obra com valores válidos.", "warning");
    }
    const orcamentoData = {
      id: orcamentoIdEmEdicao,
      cliente_id: clienteId,
      veiculo_id: veiculoId,
      data_entrada: getLocalDateAsString(new Date()),
      descricao_problema: elements.problemaRelatadoInput.value,
      valor_total: calcularTotal(),
      status: orcamentoIdEmEdicao ? elements.statusSelect.value : "Orçamento",
      itens: itens,
      quilometragem: novaQuilometragem,
    };
    try {
      const result = orcamentoIdEmEdicao ? await window.api.updateOrcamento(orcamentoData) : await window.api.addOrcamento(orcamentoData);
      if (result.success) {
        showAlert(`✅ Orçamento ${orcamentoIdEmEdicao ? "atualizado" : "salvo"} com sucesso!`, "success");
        window.api.printOrcamento(result.id);
        setTimeout(() => {
          if (orcamentoIdEmEdicao) {
            window.location.href = "gerenciar-orcamentos.html";
          } else {
            form.reset();
            elements.pecasBody.innerHTML = "";
            calcularTotal();
          }
        }, 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
      showAlert("Erro ao salvar orçamento no banco de dados.", "danger");
    }
  }

  function getNumericValue(valueString) {
    return parseFloat(String(valueString).replace(/R\$\s?/, "").replace(/\./g, "").replace(",", ".")) || 0;
  }

  function formatarValor(valor) {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  inicializar();
});
