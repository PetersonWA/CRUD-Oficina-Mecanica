/* Scripts específicos para a página de Gerenciar Serviços */

function _renderizarServicosSeguro(servicosPagina, tableElement, getStatusPagamentoBadge, formatarValor) {
  if (!tableElement) return;
  tableElement.innerHTML = "";
  servicosPagina.forEach((s) => {
    const row = tableElement.insertRow();
    const valorServico = s.valorTotal || 0;

    let lancarCustoBtnHtml = '';
    if (s.status === 'Concluído') {
      const custoTotalPecas = (s.itens || [])
        .filter(item => item.tipo === 'Peça' && item.valor_custo > 0)
        .reduce((acc, item) => acc + (item.valor_custo * item.quantidade), 0);

      if (custoTotalPecas > 0) {
        lancarCustoBtnHtml = `
                    <button 
                        class="btn btn-sm btn-success mt-1" 
                        onclick='lancarCustoComoDespesa(${s.id}, ${custoTotalPecas})' 
                        title="Lançar Custo de peças referente à OS #${String(s.id).padStart(6, "0")}">
                        <i class="bi bi-currency-dollar"></i> Lançar Custo
                    </button>`;
      }
    }

    row.insertCell(0).textContent = String(s.id).padStart(6, "0");
    row.insertCell(1).textContent = s.clienteNome || '';
    row.insertCell(2).textContent = s.placaVeiculo || '';
    row.insertCell(3).textContent = s.dataEntrada ? new Date(s.dataEntrada + "T00:00:00").toLocaleDateString("pt-BR") : '';
    row.insertCell(4).textContent = s.dataConclusao ? new Date(s.dataConclusao + "T00:00:00").toLocaleDateString("pt-BR") : "-";
    row.insertCell(5).textContent = `R$ ${formatarValor(valorServico)}`;
    row.insertCell(6).textContent = s.mecanico || '';
    row.insertCell(7).textContent = s.status;
    row.insertCell(8).innerHTML = getStatusPagamentoBadge(s.statusPagamento);

    const actionsCell = row.insertCell(9);
    actionsCell.classList.add('text-center');
    actionsCell.innerHTML = `
          <button class="btn btn-sm btn-info" onclick="abrirModalVerItens(${s.id})"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-warning" onclick="abrirModalEditarServico(${s.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger" onclick="excluirServico(${s.id})"><i class="bi bi-trash"></i></button>
          ${lancarCustoBtnHtml}
        `;
  });
}

// Expor para testes
if (typeof window.testHooks === 'undefined') {
  window.testHooks = {};
}
window.testHooks.renderizarServicos = _renderizarServicosSeguro;

document.addEventListener("DOMContentLoaded", () => {
  const listaServicosTable = document.getElementById("lista-servicos");
  if (!listaServicosTable) return; // Exit if not on the right page

  const inputBuscaServico = document.getElementById("inputBuscaServico");
  const campoBuscaServico = document.getElementById("campoBuscaServico");
  const itensServicoModalBody = document.getElementById(
    "itens-servico-modal-body"
  );
  const osIdModal = document.getElementById("os-id-modal");

  // Elementos do Modal de Edição
  const formEditar = document.getElementById("form-editar-servico");
  const editOsId = document.getElementById("edit-os-id");
  const editServicoId = document.getElementById("editServicoId");
  const editServicoCliente = document.getElementById("editServicoCliente");
  const editServicoVeiculo = document.getElementById("editServicoVeiculo");
  const editServicoDataEntrada = document.getElementById(
    "editServicoDataEntrada"
  );
  const editServicoMecanico = document.getElementById("editServicoMecanico");
  const editServicoStatus = document.getElementById("editServicoStatus");
  const editItensBody = document.getElementById("edit-itens-servico-body");
  const editTotalServico = document.getElementById("edit-total-servico");
  const btnEditAdicionarItem = document.getElementById("edit-adicionar-item");

  let todosServicos = [];
  let servicosFiltrados = [];
  let paginaAtual = 1;
  const itensPorPagina = 10;
  let confirmacaoCallback = () => { };
  let editModalInstance = null;

  let sortKey = 'id';
  let sortOrder = 'desc';

  const modalConfirmacaoEl = document.getElementById("modalConfirmarExclusao");
  const modalConfirmacao = new bootstrap.Modal(modalConfirmacaoEl);
  const corpoModalConfirmacao = document.getElementById(
    "corpoModalConfirmacao"
  );
  const btnConfirmarExclusao = document.getElementById("btnConfirmarExclusao");

  // Attach functions to window for inline event handlers
  window.realizarBuscaServico = realizarBuscaServico;
  window.limparBuscaServico = limparBuscaServico;
  window.abrirModalVerItens = abrirModalVerItens;
  window.abrirModalEditarServico = abrirModalEditarServico;
  window.excluirServico = excluirServico;
  window.mudarPagina = mudarPagina;
  window.editRemoverItem = editRemoverItem;
  window.carregarServicos = carregarServicos; // Já exposta, mas para clareza
  window.renderizarServicos = renderizarServicos; // Expor para testes
  window.editCalcularTotal = editCalcularTotal; // Expor para testes

  function lancarCustoComoDespesa(servicoId, custoTotal) {
    const despesaData = {
      valor: custoTotal.toFixed(2),
      anotacao: `Custo de peças referente à OS #${String(servicoId).padStart(6, "0")}`,
      id_plano_contas: 311 // ID para "Custo das Peças Vendidas (CMV)"
    };

    sessionStorage.setItem('despesaPreenchida', JSON.stringify(despesaData));
    window.location.href = 'despesas.html';
  }
  window.lancarCustoComoDespesa = lancarCustoComoDespesa;

  const getStatusPagamentoBadge = (status) => {
    switch (status) {
      case "Pago":
        return '<span class="badge bg-success">Pago</span>';
      case "Parcialmente Pago":
        return '<span class="badge bg-info">Parcialmente Pago</span>';
      case "Aguardando Liquidação":
        return '<span class="badge bg-primary">Aguardando Liquidação</span>';
      case "Pendente":
      default:
        return '<span class="badge bg-warning text-dark">Pendente</span>';
    }
  };

  async function carregarServicos() {
    try {
      todosServicos = await window.api.getServicos();
      servicosFiltrados = [...todosServicos];
      ordenarErenderizar();
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      showAlert("Falha ao carregar serviços do banco de dados.", "danger");
    }
  }

  window.carregarServicos = carregarServicos;

  function ordenarErenderizar() {
    servicosFiltrados.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA == null) return 1;
      if (valB == null) return -1;

      let comparison = 0;
      if (sortKey === 'dataEntrada' || sortKey === 'dataConclusao') {
        try {
          const dateA = new Date(valA);
          const dateB = new Date(valB);
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          comparison = dateA.getTime() - dateB.getTime();
        } catch (e) {
          console.error("Erro ao ordenar por data:", e);
          return 0;
        }
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
    updateHeaderSortUI();
    renderizarPagina();
  }

  function updateHeaderSortUI() {
    document.querySelectorAll('.sortable-header').forEach(header => {
      header.classList.remove('sort-asc', 'sort-desc');
      if (header.dataset.sortKey === sortKey) {
        header.classList.add(`sort-${sortOrder}`);
      }
    });
  }

  function handleSort(key) {
    if (sortKey === key) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortOrder = 'asc';
    }
    paginaAtual = 1;
    ordenarErenderizar();
  }

  document.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
      handleSort(header.dataset.sortKey);
    });
  });

  function renderizarPagina() {
    renderizarServicos();
    renderizarPaginacao();
  }

  function renderizarServicos() {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const servicosPagina = servicosFiltrados.slice(inicio, fim);
    _renderizarServicosSeguro(servicosPagina, listaServicosTable, getStatusPagamentoBadge, window.formatarValor);
  }

  function renderizarPaginacao() {
    const totalPaginas = Math.ceil(servicosFiltrados.length / itensPorPagina);
    const paginacaoEl = document.getElementById("paginacao-servicos");
    if (!paginacaoEl) return;

    paginacaoEl.innerHTML = "";

    if (totalPaginas <= 1) {
      paginacaoEl.style.display = "none";
      return;
    }

    paginacaoEl.style.display = "flex";

    const criarItemPaginacao = (texto, pagina, desabilitado = false, ativo = false) => {
      const li = document.createElement("li");
      li.className = `page-item ${desabilitado ? "disabled" : ""} ${ativo ? "active" : ""}`;

      const a = document.createElement("a");
      a.className = "page-link";
      a.href = "#";
      a.innerHTML = texto;
      if (!desabilitado) {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          mudarPagina(pagina);
        });
      }
      li.appendChild(a);
      return li;
    };

    paginacaoEl.appendChild(criarItemPaginacao('&laquo;', paginaAtual - 1, paginaAtual === 1));

    for (let i = 1; i <= totalPaginas; i++) {
      paginacaoEl.appendChild(criarItemPaginacao(i, i, false, i === paginaAtual));
    }

    paginacaoEl.appendChild(criarItemPaginacao('&raquo;', paginaAtual + 1, paginaAtual === totalPaginas));
  }

  function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(servicosFiltrados.length / itensPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaAtual = pagina;
    renderizarPagina();
  }

  function realizarBuscaServico() {
    const termo = inputBuscaServico.value.toLowerCase();
    const campo = campoBuscaServico.value;
    if (!termo || !campo) {
      servicosFiltrados = [...todosServicos];
    } else {
      servicosFiltrados = todosServicos.filter((s) => {
        let valorCampo = "";
        switch (campo) {
          case "clienteNome":
            valorCampo = s.clienteNome;
            break;
          case "placaVeiculo":
            valorCampo = s.placaVeiculo;
            break;
          case "mecanico":
            valorCampo = s.mecanico;
            break;
          case "status":
            valorCampo = s.status;
            break;
        }
        return valorCampo.toLowerCase().includes(termo);
      });
    }
    paginaAtual = 1;
    ordenarErenderizar();
  }

  function limparBuscaServico() {
    inputBuscaServico.value = "";
    campoBuscaServico.value = "";
    servicosFiltrados = [...todosServicos];
    paginaAtual = 1;
    ordenarErenderizar();
  }

  function abrirModalVerItens(id) {
    const servico = todosServicos.find((s) => s.id === id);
    if (servico) {
      osIdModal.textContent = String(id).padStart(6, "0");
      itensServicoModalBody.innerHTML = servico.itens
        .map(
          (item) => `
        <tr>
          <td>${item.descricao}</td>
          <td>${item.tipo || "Mão de Obra"}</td>
          <td>${item.quantidade}</td>
          <td>R$ ${formatarValor(item.valor_unitario)}</td>
          <td>R$ ${formatarValor(item.quantidade * item.valor_unitario)}</td>
        </tr>
      `
        )
        .join("");
      new bootstrap.Modal(document.getElementById("modalVerItens")).show();
    }
  }

  function abrirModalEditarServico(id) {
    const servico = todosServicos.find((s) => s.id === id);
    if (servico) {
      editOsId.textContent = String(id).padStart(6, "0");
      editServicoId.value = servico.id;
      editServicoCliente.value = servico.clienteNome || '';
      editServicoVeiculo.value = servico.placaVeiculo || '';
      editServicoDataEntrada.value = servico.dataEntrada;
      editServicoMecanico.value = servico.mecanico;
      editServicoStatus.value = servico.status;
      document.getElementById('editServicoDataConclusao').value = servico.dataConclusao || '';

      editItensBody.innerHTML = "";
      servico.itens.forEach((item) => editAdicionarItem(item));
      editCalcularTotal();

      editModalInstance = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalEditarServico")
      );
      editModalInstance.show();
    }
  }

  function editAdicionarItem(item = null) {
    const row = document.createElement("tr");
    row.classList.add("item-row");
    const tipoSelecionado = (item && item.tipo) || "Mão de Obra";
    row.innerHTML = `
        <td><input type="text" class="form-control form-control-sm" name="descricao" placeholder="Descrição do item" value="${item ? item.descricao : ""
      }" required></td>
        <td>
          <select class="form-select form-select-sm" name="tipo">
            <option value="Mão de Obra" ${tipoSelecionado === "Mão de Obra" ? "selected" : ""
      }>Mão de Obra</option>
            <option value="Peça" ${tipoSelecionado === "Peça" ? "selected" : ""
      }>Peça</option>
          </select>
        </td>
        <td><input type="number" class="form-control form-control-sm" name="quantidade" value="${item ? item.quantidade : 1
      }" min="1" step="1" required></td>
        <td><input type="number" class="form-control form-control-sm" name="valor_unitario" placeholder="0.00" value="${item ? item.valor_unitario.toFixed(2) : "0.00"
      }" min="0" step="0.01" required></td>
        <td><button type="button" class="btn btn-danger btn-sm" onclick="editRemoverItem(this)"><i class="bi bi-trash"></i></button></td>
    `;
    editItensBody.appendChild(row);
    row
      .querySelectorAll("input, select")
      .forEach((input) => input.addEventListener("input", editCalcularTotal));
    editCalcularTotal();
  }

  function editRemoverItem(button) {
    if (editItensBody.querySelectorAll("tr").length > 1) {
      button.closest("tr").remove();
      editCalcularTotal();
    } else {
      alert("É necessário pelo menos um item no serviço.");
    }
  }

  function editCalcularTotal() {
    let total = 0;
    editItensBody.querySelectorAll(".item-row").forEach((row) => {
      const quantidade =
        parseFloat(row.querySelector("[name=quantidade]").value) || 0;
      const valor =
        parseFloat(row.querySelector("[name=valor_unitario]").value.replace(",", ".")) ||
        0;
      total += quantidade * valor;
    });
    editTotalServico.textContent = `R$ ${formatarValor(total)}`;
  }

  btnEditAdicionarItem.addEventListener("click", () => editAdicionarItem());

  formEditar.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = parseInt(editServicoId.value);

    const itens = [];
    let valorTotal = 0;
    editItensBody.querySelectorAll(".item-row").forEach((row) => {
      const descricao = row.querySelector("[name=descricao]").value;
      const tipo = row.querySelector("[name=tipo]").value;
      const quantidade =
        parseFloat(row.querySelector("[name=quantidade]").value) || 0;
      const valor_unitario = parseFloat(row.querySelector("[name=valor_unitario]").value) || 0;
      if (descricao && quantidade > 0 && valor_unitario >= 0) {
        itens.push({ descricao, tipo, quantidade, valor_unitario });
        valorTotal += quantidade * valor_unitario;
      }
    });

    if (itens.length === 0) {
      alert("Adicione pelo menos um item válido ao serviço.");
      return;
    }

    const servicoOriginal = todosServicos.find((s) => s.id === id);

    const servicoAtualizado = {
      ...servicoOriginal,
      dataEntrada: editServicoDataEntrada.value,
      mecanico: editServicoMecanico.value,
      status: editServicoStatus.value,
      itens: itens,
      valor_total: valorTotal,
      dataConclusao: document.getElementById('editServicoDataConclusao').value,
    };

    if (
      servicoAtualizado.status === "Concluído" &&
      !servicoOriginal.data_conclusao
    ) {
      servicoAtualizado.data_conclusao = getLocalDateAsString(new Date());
    }

    try {
      const sucesso = await window.api.updateServico(servicoAtualizado);
      if (sucesso) {
        showAlert("✅ Serviço atualizado com sucesso!", "success");

        const modalEl = document.getElementById("modalEditarServico");
        if (editModalInstance) {
          // Garante que os dados só serão recarregados após o modal ser completamente fechado
          modalEl.addEventListener(
            "hidden.bs.modal",
            () => {
              carregarServicos();
            },
            { once: true }
          );
          editModalInstance.hide();
        } else {
          await carregarServicos(); // Fallback
        }
      } else {
        showAlert("Nenhuma alteração detectada ou erro ao atualizar o serviço.", "warning");
      }
    } catch (error) {
      console.error("Erro ao atualizar serviço:", error);
      showAlert("Erro ao atualizar serviço.", "danger");
    }
  });

  async function excluirServico(id) {
    const servico = todosServicos.find((s) => s.id === id);
    showConfirm(
      `Tem certeza que deseja excluir o serviço #${String(id).padStart(
        6,
        "0"
      )} do cliente "${servico.clienteNome}"?`,
      async () => {
        try {
          const result = await window.api.deleteServico(id);
          if (result.success) {
            showAlert("✅ Serviço excluído com sucesso!", "success");
            await carregarServicos();
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          console.error("Erro ao excluir serviço:", error);
          showAlert(`Erro ao excluir serviço: ${error.message}`, "danger");
        }
      }
    );
  }

  carregarServicos();

  // Expor para testes
  if (typeof window.testHooks === 'undefined') {
    window.testHooks = {};
  }
  window.testHooks.renderizarServicos = _renderizarServicosSeguro;
});