function _renderizarPagamentosSeguro(servicosPagina, tableElement, getStatusPagamentoBadge, formatarValor) {
  if (!tableElement) return;
  tableElement.innerHTML = "";
  servicosPagina.forEach((s) => {
    const row = tableElement.insertRow();
    const dataServico = s.dataEntrada
      ? new Date(s.dataEntrada).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        })
      : "N/A";

    row.insertCell(0).textContent = String(s.id).padStart(6, "0");
    row.insertCell(1).textContent = s.clienteNome || '';
    row.insertCell(2).textContent = s.placaVeiculo || '';
    row.insertCell(3).textContent = dataServico;
    row.insertCell(4).textContent = `R$ ${formatarValor(s.valorTotal || 0)}`;
    row.insertCell(5).textContent = s.formaPagamento || 'N/A';
    row.insertCell(6).innerHTML = getStatusPagamentoBadge(s.statusPagamento);
    
    const actionsCell = row.insertCell(7);
    actionsCell.innerHTML = `
      <button class="btn btn-sm btn-primary" onclick="abrirModalPagamentos(${s.id})">
        <i class="bi bi-cash-coin"></i> Pagamentos
      </button>
    `;
  });
}

// Expor para testes
if (typeof window.testHooks === 'undefined') {
  window.testHooks = {};
}
window.testHooks.renderizarPagamentos = _renderizarPagamentosSeguro;


/* Scripts específicos para a página de Gerenciar Pagamentos */
document.addEventListener("DOMContentLoaded", () => {
  const listaServicosTable = document.getElementById(
    "lista-servicos-pagamentos"
  );
  if (!listaServicosTable) return; // Exit if not on the right page

  const inputBusca = document.getElementById("inputBusca");
  const campoBusca = document.getElementById("campoBusca");

  let servicosFiltrados = [];
  let paginaAtual = 1;
  const itensPorPagina = 10;

  let sortKey = 'id';
  let sortOrder = 'desc';

  // Attach functions to window for inline event handlers
  window.realizarBusca = realizarBusca;
  window.limparBusca = limparBusca;
  window.abrirModalPagamentos = abrirModalPagamentos;
  window.mudarPagina = mudarPagina;
  window.handleConfirmarPagamento = handleConfirmarPagamento; // Expose to global scope
  window.carregarDados = carregarDados; // Expor para testes
  
  function renderizarServicos() {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const servicosPagina = servicosFiltrados.slice(inicio, fim);
    _renderizarPagamentosSeguro(servicosPagina, listaServicosTable, getStatusPagamentoBadge, window.formatarValor);
  }
  window.renderizarServicosPagamentos = renderizarServicos; // Expor para testes

  async function handleConfirmarPagamento(e) {
    const pagamentoId = parseInt(e.currentTarget.dataset.id);
    showConfirm('Tem certeza que deseja confirmar o recebimento deste pagamento?', async () => {
        try {
            const result = await window.api.confirmarPagamento(pagamentoId);
            if (result.success) {
                showAlert('Pagamento confirmado com sucesso!', 'success');
                // Fecha o modal e recarrega os dados
                bootstrap.Modal.getInstance(document.getElementById("modalPagamentos")).hide();
                carregarDados();
            } else {
                throw new Error(result.error || 'Erro desconhecido ao confirmar pagamento.');
            }
        } catch (error) {
            console.error("Erro ao confirmar pagamento:", error);
            showAlert(`Falha ao confirmar pagamento: ${error.message}`, 'danger');
        }
    });
  }

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

  async function carregarDados() {
    try {
      const busca = {
        termo: inputBusca.value,
        campo: campoBusca.value,
        sortKey,
        sortOrder,
      };
      servicosFiltrados = await window.api.getServicosParaPagamentos(busca);
      paginaAtual = 1;
      renderizarPagina();
    } catch (error) {
      showAlert(`Erro ao carregar serviços: ${error.message}`, "danger");
    }
  }

  function renderizarPagina() {
    updateHeaderSortUI();
    renderizarServicos();
    renderizarPaginacao();
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
    carregarDados();
  }

  document.querySelectorAll('.sortable-header').forEach(header => {
    header.addEventListener('click', () => {
        handleSort(header.dataset.sortKey);
    });
  });

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

    // Função auxiliar para criar um item de paginação
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

    // Botão Anterior
    paginacaoEl.appendChild(criarItemPaginacao('&laquo;', paginaAtual - 1, paginaAtual === 1));

    // Links das páginas
    for (let i = 1; i <= totalPaginas; i++) {
      paginacaoEl.appendChild(criarItemPaginacao(i, i, false, i === paginaAtual));
    }

    // Botão Próximo
    paginacaoEl.appendChild(criarItemPaginacao('&raquo;', paginaAtual + 1, paginaAtual === totalPaginas));
  }

  function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(servicosFiltrados.length / itensPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaAtual = pagina;
    renderizarPagina(); 
  }

  function realizarBusca() {
    carregarDados();
  }

  function limparBusca() {
    inputBusca.value = "";
    campoBusca.value = "";
    carregarDados();
  }

  async function abrirModalPagamentos(servicoId) {
    try {
      const servico = await window.api.getServicoComPagamentos(servicoId);
      if (!servico) {
        showAlert("Serviço não encontrado!", "danger");
        return;
      }

      document.getElementById("servico-id-modal").textContent = String(
        servico.id
      ).padStart(6, "0");
      document.getElementById("servico-id-pagamento").value = servico.id;

      const historicoContainer = document.getElementById(
        "historico-pagamentos-container"
      );
      const pagamentos = servico.pagamentos || [];
      
      if (pagamentos.length > 0) {
        historicoContainer.innerHTML = pagamentos
          .map((p) => {
            const cardClass = p.liquidado ? 'bg-light' : 'bg-warning bg-opacity-25';
            const dataLabel = p.liquidado ? 'Data Pag.' : 'Vencimento';
            const confirmButton = p.liquidado ? '' : `
                <button class="btn btn-sm btn-success ms-2 btn-confirmar-pagamento" data-id="${p.id}" title="Confirmar Recebimento">
                    <i class="bi bi-check-circle"></i>
                </button>
            `;
            return `
            <div class="card card-body mb-2 ${cardClass}">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span><strong>${dataLabel}:</strong> ${new Date(
                      p.data
                    ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
                    <span class="ms-3"><strong>Método:</strong> ${p.metodo}</span>
                </div>
                <div class="d-flex align-items-center">
                    <span class="fw-bold">Valor: R$ ${formatarValor(p.valor)}</span>
                    ${confirmButton}
                </div>
              </div>
              ${
                p.anotacao
                  ? `<p class="mb-0 mt-1"><small><strong>Anotação:</strong> ${p.anotacao}</small></p>`
                  : ""
              }
            </div>
          `;
          })
          .join("");

        // Adiciona event listeners para os botões de confirmar pagamento
        historicoContainer.querySelectorAll('.btn-confirmar-pagamento').forEach(button => {
            button.addEventListener('click', handleConfirmarPagamento);
        });

      } else {
        historicoContainer.innerHTML = "<p>Nenhum pagamento registrado.</p>";
      }

      const saldoHtml = `
          <div class="mt-3 p-3 rounded" style="background-color: #e9f5e9;">
              <div class="d-flex justify-content-between align-items-center">
                  <span class="h5">Valor Total do Serviço:</span>
                  <span class="h5">R$ ${formatarValor(servico.valorTotal)}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center text-primary">
                  <span class="h5">Total Pago:</span>
                  <span class="h5">R$ ${formatarValor(servico.totalPago)}</span>
              </div>
              <hr>
              <div class="d-flex justify-content-between align-items-center fw-bold">
                  <span class="h4">Saldo Devedor:</span>
                  <span class="h4 text-danger">R$ ${formatarValor(
                    servico.saldoDevedor
                  )}</span>
              </div>
          </div>
      `;
      historicoContainer.insertAdjacentHTML("beforeend", saldoHtml);

      document.getElementById("form-adicionar-pagamento").reset();
      document.getElementById("data-pagamento").value = getLocalDateAsString(new Date());

      const modal = new bootstrap.Modal(
        document.getElementById("modalPagamentos")
      );
      modal.show();
    } catch (error) {
      showAlert(`Erro ao abrir detalhes do pagamento: ${error.message}`, 'danger');
    }
  }

  document
    .getElementById("form-adicionar-pagamento")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const servicoId = parseInt(
        document.getElementById("servico-id-pagamento").value
      );
      const valorPago = parseFloat(document.getElementById("valor-pago").value);
      const dataPagamento = document.getElementById("data-pagamento").value;
      const metodoPagamento = document.getElementById("metodo-pagamento").value;
      const anotacao = document.getElementById("anotacao-pagamento").value;

      if (!valorPago || valorPago <= 0 || !dataPagamento) {
        showAlert(
          "Por favor, preencha o valor e a data do pagamento.",
          "warning"
        );
        return;
      }

      const novoPagamento = {
        servico_id: servicoId,
        valor: valorPago,
        data_liquidacao: dataPagamento,
        metodo: metodoPagamento,
        anotacao: anotacao,
      };

      try {
        const result = await window.api.adicionarPagamento(novoPagamento);
        showAlert(result.message, "success");
        
        bootstrap.Modal.getInstance(
          document.getElementById("modalPagamentos")
        ).hide();

        carregarDados(); // Recarrega a lista de serviços para refletir o novo status
      } catch (error) {
        showAlert(`Erro ao adicionar pagamento: ${error.message}`, "danger");
      }
    });

  carregarDados();
});