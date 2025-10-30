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

  const getStatusPagamentoBadge = (status) => {
    switch (status) {
      case "Pago":
        return '<span class="badge bg-success">Pago</span>';
      case "Parcialmente Pago":
        return '<span class="badge bg-info">Parcialmente Pago</span>';
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

  function renderizarServicos() {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const servicosPagina = servicosFiltrados.slice(inicio, fim);

    listaServicosTable.innerHTML = servicosPagina
      .map((s) => {
        const dataServico = s.dataEntrada
          ? new Date(s.dataEntrada).toLocaleDateString("pt-BR", {
              timeZone: "UTC",
            })
          : "N/A";

        return `
      <tr>
        <td>${String(s.id).padStart(6, "0")}</td>
        <td>${s.clienteNome}</td>
        <td>${s.placaVeiculo}</td>
        <td>${dataServico}</td>
        <td>R$ ${formatarValor(s.valorTotal)}</td>
        <td>${s.formaPagamento || 'N/A'}</td>
        <td>${getStatusPagamentoBadge(s.statusPagamento)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="abrirModalPagamentos(${
            s.id
          })"><i class="bi bi-cash-coin"></i> Pagamentos</button>
        </td>
      </tr>
    `;
      })
      .join("");
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

    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${paginaAtual === 1 ? "disabled" : ""}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="mudarPagina(${
      paginaAtual - 1
    })">&laquo;</a>`;
    paginacaoEl.appendChild(prevLi);

    for (let i = 1; i <= totalPaginas; i++) {
      const li = document.createElement("li");
      li.className = `page-item ${i === paginaAtual ? "active" : ""}`;
      li.innerHTML = `<a class="page-link" href="#" onclick="mudarPagina(${i})">${i}</a>`;
      paginacaoEl.appendChild(li);
    }

    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${
      paginaAtual === totalPaginas ? "disabled" : ""
    }`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="mudarPagina(${
      paginaAtual + 1
    })">&raquo;</a>`;
    paginacaoEl.appendChild(nextLi);
  }

  function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(servicosFiltrados.length / itensPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaAtual = pagina;
    renderizarServicos(); // Apenas renderiza a nova página, não recarrega os dados
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
            return `
            <div class="card card-body mb-2 bg-light">
              <div class="d-flex justify-content-between">
                <span><strong>Data:</strong> ${new Date(
                  p.data
                ).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
                <span><strong>Método:</strong> ${p.metodo}</span>
                <span class="fw-bold">Valor: R$ ${formatarValor(p.valor)}</span>
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
        data: dataPagamento,
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