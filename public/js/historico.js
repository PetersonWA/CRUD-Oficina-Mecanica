/* Scripts específicos para a página de histórico */

// State variables
let paginaAtual = 1;
const itensPorPagina = 9;
let receitaChartType = "bar";
let tipoChartAnalysis = "receita";

// Chart instances
let receitaRealizadaChart = null;
let tipoItemChart = null;
let topItensChart = null;

let dashboardData = {}; // Variável global para armazenar os dados do dashboard

// Main function to load data and initialize dashboard
async function carregarDados() {
  await aplicarFiltros();
}

// Filter and sort data, then update the dashboard
async function aplicarFiltros() {
    const filtros = {
        cliente: document.getElementById("filtro-cliente").value,
        veiculo: document.getElementById("filtro-veiculo").value,
        status: document.getElementById("filtro-status").value,
        dataInicio: document.getElementById("filtro-data-inicio").value,
        dataFim: document.getElementById("filtro-data-fim").value,
        groupBy: document.querySelector('input[name="groupBy"]:checked').value || 'month',
        page: paginaAtual,
        itemsPerPage: itensPorPagina
    };

    try {
        const dados = await window.api.getDadosDashboard(filtros);
        atualizarDashboard(dados);
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        // Tratar erro, talvez mostrando um alerta para o usuário
    }
}

// Clear all filter inputs and re-apply
function limparFiltros() {
  document.getElementById("filtro-cliente").value = "";
  document.getElementById("filtro-veiculo").value = "";
  document.getElementById("filtro-status").value = "";
  document.getElementById("filtro-data-inicio").value = "";
  document.getElementById("filtro-data-fim").value = "";
  document.getElementById("group-month").checked = true;
  paginaAtual = 1;
  aplicarFiltros();
}

// Main update function for the entire dashboard
function atualizarDashboard(dados) {
  if (!dados) return;
  dashboardData = dados; // Armazena os dados globalmente
  const { kpis, charts, servicos, totalServicos } = dados;

  atualizarKpis(kpis.lucroBruto, kpis.receitaRealizada, kpis.ticketMedio, kpis.pendente);
  atualizarCards(servicos || []);
  atualizarPaginacao(totalServicos || 0);
  atualizarContador(totalServicos || 0);

  renderReceitaRealizadaChart(charts.receitaRealizada, receitaChartType);
  renderTipoItemChart(charts.tipoItem.receita, charts.tipoItem.status, tipoChartAnalysis);
  renderTopItensChart(charts.topItens);
}

// Update KPI cards
function atualizarKpis(
  lucroBruto,
  receitaRealizada,
  ticketMedio,
  pendente
) {
  document.getElementById(
    "kpi-receita-realizada"
  ).textContent = `R$ ${formatarValor(receitaRealizada)}`;
  document.getElementById(
    "kpi-faturamento-bruto"
  ).textContent = `R$ ${formatarValor(lucroBruto)}`;
  document.getElementById("kpi-pendente").textContent = `R$ ${formatarValor(
    pendente < 0 ? 0 : pendente
  )}`;
  document.getElementById("kpi-ticket-medio").textContent = `R$ ${formatarValor(
    ticketMedio
  )}`;
}

// Get bootstrap color class based on service status
function getStatusClass(status) {
  const classes = {
    Concluído: "success",
    "Em andamento": "warning",
    "Aguardando peças": "info",
    "Aguardando aprovação": "danger",
  };
  return classes[status] || "secondary";
}

// Render the paginated service cards
function atualizarCards(servicos) {
  const container = document.getElementById("cards-servicos");
  container.innerHTML = servicos
    .map(
      (servico) => `
    <div class="col-md-4 mb-3">
      <div class="card servico-card h-100">
        <div class="card-header d-flex justify-content-between align-items-center py-2">
          <span class="badge bg-${getStatusClass(servico.status)}">${servico.status}</span>
          <div>
            <small class="text-muted d-block text-end">Entrada: ${new Date(servico.dataEntrada + "T00:00:00").toLocaleDateString("pt-BR")}</small>
            ${servico.dataConclusao ? `<small class="text-muted d-block text-end">Conclusão: ${new Date(servico.dataConclusao + "T00:00:00").toLocaleDateString("pt-BR")}</small>` : ""}
          </div>
        </div>
        <div class="card-body py-2"><h6 class="card-title mb-1">${servico.clienteNome}</h6><p class="card-text text-muted small mb-2">${servico.placaVeiculo}</p></div>
        <div class="card-footer bg-transparent py-2 d-flex justify-content-between align-items-center">
          <span class="fw-bold text-primary">R$ ${formatarValor(servico.valorTotal)}</span>
          <button class="btn btn-sm btn-outline-primary" onclick="verDetalhes(${servico.id})"><i class="bi bi-eye"></i></button>
        </div>
      </div>
    </div>`
    )
    .join("");
}

// Render the revenue chart
function renderReceitaRealizadaChart(chartData, chartType = "bar") {
  const ctx = document.getElementById("receitaRealizadaChart").getContext("2d");

  if (receitaRealizadaChart) receitaRealizadaChart.destroy();
  receitaRealizadaChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: "Receita Realizada",
          data: chartData.data,
          backgroundColor: "rgba(46, 125, 50, 0.7)",
          borderColor: "rgba(46, 125, 50, 1)", // For line chart
          tension: 0.1, // For line chart
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Receita Realizada (Pagamentos Recebidos)",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += "R$ " + formatarValor(context.parsed.y);
              }
              return label;
            },
          },
        },
      },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// Render the pie chart
function renderTipoItemChart(receitaPorTipoData, statusCountsData, analysisType) {
  const ctx = document.getElementById("tipoItemChart").getContext("2d");
  if (tipoItemChart) tipoItemChart.destroy();

  let labels, values, title, tooltipCallback;
  let colors = [];

  if (analysisType === "receita") {
    title = "Receita por Tipo";
    const colorMap = {
      Peça: "#FFC107",
      "Mão de Obra": "#2E7D32",
      "Não Classificado": "#6c757d",
    };
    labels = receitaPorTipoData.map(item => item.tipo || 'Não Classificado');
    values = receitaPorTipoData.map(item => item.total);
    colors = labels.map((k) => colorMap[k] || "#0dcaf0");
    tooltipCallback = function (context) {
      let label = context.label || "";
      if (label) {
        label += ": ";
      }
      if (context.parsed !== null) {
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const percentage =
          total > 0 ? ((context.parsed / total) * 100).toFixed(2) : 0;
        label += "R$ " + formatarValor(context.parsed) + ` (${percentage}%)`;
      }
      return label;
    };
  } else {
    // analysisType === 'status'
    title = "Serviços por Status";
    const statusColorMap = {
      success: "#198754",
      warning: "#ffc107",
      info: "#0dcaf0",
      danger: "#dc3545",
      secondary: "#6c757d",
    };
    labels = Object.keys(statusCountsData);
    values = Object.values(statusCountsData);
    colors = labels.map((k) => statusColorMap[getStatusClass(k)] || "#6c757d");
    tooltipCallback = function (context) {
      let label = context.label || "";
      if (label) {
        label += ": ";
      }
      if (context.parsed !== null) {
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const percentage =
          total > 0 ? ((context.parsed / total) * 100).toFixed(2) : 0;
        label += context.parsed + ` serviço(s) (${percentage}%)`;
      }
      return label;
    };
  }

  tipoItemChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: title },
        tooltip: {
          callbacks: {
            label: tooltipCallback,
          },
        },
      },
    },
  });
}

// Render the top items chart
function renderTopItensChart(topItensData) {
  const ctx = document.getElementById("topItensChart").getContext("2d");

  if (topItensChart) topItensChart.destroy();
  topItensChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: topItensData.map((item) => item.descricao),
      datasets: [
        {
          label: "Faturamento Gerado",
          data: topItensData.map((item) => item.total),
          backgroundColor: "rgba(75, 192, 192, 0.7)",
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: false }, // Título removido daqui
        tooltip: {
          callbacks: {
            label: function (context) {
              return "Faturamento: R$ " + formatarValor(context.parsed.x);
            },
          },
        },
      },
    },
  });
}

// --- Pagination and Modal Logic ---
function atualizarPaginacao(totalServicos) {
  const totalPaginas = Math.ceil(totalServicos / itensPorPagina);
  const paginacaoEl = document.querySelector("#paginacao .pagination");
  if (!paginacaoEl) return;

  paginacaoEl.innerHTML = "";

  if (totalPaginas <= 1) {
    document.getElementById("paginacao").style.display = "none";
    return;
  }

  document.getElementById("paginacao").style.display = "block";

  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${paginaAtual === 1 ? "disabled" : ""}`;
  prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" onclick="mudarPagina(${paginaAtual - 1})"><span aria-hidden="true">&laquo;</span></a>`;
  paginacaoEl.appendChild(prevLi);

  for (let i = 1; i <= totalPaginas; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === paginaAtual ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#" onclick="mudarPagina(${i})">${i}</a>`;
    paginacaoEl.appendChild(li);
  }

  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${paginaAtual === totalPaginas ? "disabled" : ""}`;
  nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" onclick="mudarPagina(${paginaAtual + 1})"><span aria-hidden="true">&raquo;</span></a>`;
  paginacaoEl.appendChild(nextLi);
}

function mudarPagina(pagina) {
  if (pagina < 1) return;
  // A verificação de página máxima é desnecessária aqui, pois o backend lida com isso.
  paginaAtual = pagina;
  aplicarFiltros();
  window.scrollTo(0, 0);
}

function getStatusPagamentoBadge(status) {
  switch (status) {
    case "Pago":
      return '<span class="badge bg-success">Pago</span>';
    case "Parcialmente Pago":
      return '<span class="badge bg-info text-dark">Parcialmente Pago</span>';
    case "Pendente":
    default:
      return '<span class="badge bg-warning text-dark">Pendente</span>';
  }
}

async function verDetalhes(id) {
    try {
        const servico = await window.api.getOrcamentoById(id); // Reutiliza a função existente
        if (servico) {
            document.getElementById("detalhe-os-id").textContent = String(servico.id).padStart(6, "0");
            document.getElementById("detalhe-cliente").textContent = servico.cliente_nome || 'N/A'; // Backend precisa prover isso
            document.getElementById("detalhe-veiculo").textContent = servico.veiculo_placa || 'N/A'; // Backend precisa prover isso
            document.getElementById("detalhe-data-entrada").textContent = new Date(servico.data + "T00:00:00").toLocaleDateString("pt-BR");
            document.getElementById("detalhe-mecanico").textContent = servico.mecanico_responsavel;
            document.getElementById("detalhe-status").innerHTML = `<span class="badge bg-${getStatusClass(servico.status)}">${servico.status}</span>`;
            document.getElementById("detalhe-status-pagamento").innerHTML = getStatusPagamentoBadge(servico.status_pagamento);

            const valorServico = servico.valor_total !== undefined ? servico.valor_total : servico.valor;
            document.getElementById("detalhe-valor").textContent = `R$ ${formatarValor(valorServico)}`;

            const itensBody = document.getElementById("detalhe-itens-servico");
            itensBody.innerHTML = servico.itens.map((item) => `
                <tr>
                    <td>${item.descricao}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${formatarValor(item.valor_unitario)}</td>
                    <td>R$ ${formatarValor(item.quantidade * item.valor_unitario)}</td>
                </tr>
            `).join("");

            new bootstrap.Modal(document.getElementById("modalDetalhesServico")).show();
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes do serviço:", error);
        showAlert("Erro ao buscar detalhes do serviço.", "danger");
    }
}

function atualizarContador(totalServicos) {
  document.getElementById(
    "contador-servicos"
  ).textContent = `${totalServicos} serviços encontrados`;
}

// --- Event Listeners ---
window.addEventListener("DOMContentLoaded", carregarDados);

document.addEventListener("DOMContentLoaded", () => {
  // Botões de filtro e agrupamento
  document.getElementById('filtro-cliente').addEventListener('keydown', (e) => e.key === 'Enter' && aplicarFiltros());
  document.getElementById('filtro-veiculo').addEventListener('keydown', (e) => e.key === 'Enter' && aplicarFiltros());
  document.getElementById('filtro-status').addEventListener('change', aplicarFiltros);
  document.querySelectorAll('input[name="groupBy"]').forEach(radio => {
      radio.addEventListener('change', aplicarFiltros);
  });


  document.getElementById("toggle-receita-chart-type").addEventListener("click", (e) => {
      receitaChartType = receitaChartType === "bar" ? "line" : "bar";
      const icon = e.currentTarget.querySelector("i");
      icon.classList.toggle("bi-graph-up", receitaChartType === "bar");
      icon.classList.toggle("bi-bar-chart-steps", receitaChartType === "line");
      aplicarFiltros(); // Recarrega os dados com o novo tipo de gráfico
  });

  document.getElementById("toggle-tipo-chart-analysis").addEventListener("click", () => {
      tipoChartAnalysis = tipoChartAnalysis === "receita" ? "status" : "receita";
      aplicarFiltros(); // Recarrega os dados com a nova análise
  });

  document.querySelectorAll(".expand-chart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const chartContainer = button.closest(".chart-container");
      const chartCanvas = chartContainer.querySelector("canvas");
      const chartId = chartCanvas.id;
      const chartInstances = { 
        receitaRealizadaChart: receitaRealizadaChart,
        tipoItemChart: tipoItemChart,
      };
      const chart = chartInstances[chartId];
      const icon = button.querySelector("i");

      const chartColumn = button.closest('[class*="col-"]');
      const chartRow = chartColumn.parentElement;
      const isExpanded = chartColumn.dataset.isExpanded === "true";

      if (isExpanded) {
        // Collapse
        chartContainer.classList.remove("expanded-chart-container");
        chartRow.querySelectorAll('[class*="col-"]').forEach((col) => {
          if (col.dataset.originalClass) {
            col.className = col.dataset.originalClass;
            col.style.display = "";
            delete col.dataset.originalClass;
          }
          const canvas = col.querySelector("canvas");
          if (canvas && chartInstances[canvas.id]) {
            setTimeout(() => chartInstances[canvas.id].resize(), 150);
          }
        });
        chartColumn.dataset.isExpanded = "false";
        icon.classList.remove("bi-arrows-angle-contract");
        icon.classList.add("bi-arrows-fullscreen");
      } else {
        // Expand
        chartContainer.classList.add("expanded-chart-container");
        const siblingCols = Array.from(chartRow.children).filter(
          (c) => c !== chartColumn
        );

        siblingCols.forEach((col) => {
          col.dataset.originalClass = col.className;
          col.style.display = "none";
        });

        chartColumn.dataset.originalClass = chartColumn.className;
        chartColumn.className = "col-12";
        chartColumn.dataset.isExpanded = "true";
        icon.classList.remove("bi-arrows-fullscreen");
        icon.classList.add("bi-arrows-angle-contract");

        setTimeout(() => {
          if (chart) chart.resize();
        }, 150);
      }
    });
  });

  // Novo listener para o botão de recolher
  document.body.addEventListener('click', function(event) {
    if (event.target.closest('.collapse-chart-btn')) {
      const button = event.target.closest('.collapse-chart-btn');
      const canvasId = button.getAttribute('data-target-canvas');
      const canvas = document.getElementById(canvasId);
      const icon = button.querySelector('i');

      if (canvas) {
        const isCollapsed = canvas.classList.contains('d-none');
        canvas.classList.toggle('d-none');
        
        if (isCollapsed) {
          icon.classList.remove('bi-chevron-down');
          icon.classList.add('bi-chevron-up');
          // Redesenha o gráfico se necessário ao reexibir
          const chartInstance = chartInstances[canvasId];
          if(chartInstance) setTimeout(() => chartInstance.resize(), 50);
        } else {
          icon.classList.remove('bi-chevron-up');
          icon.classList.add('bi-chevron-down');
        }
      }
    }
  });

  const btnGerarRelatorio = document.getElementById('btn-gerar-relatorio');
  const btnFecharRelatorio = document.getElementById('btn-fechar-relatorio');
  const relatorioContainer = document.getElementById('relatorio-container');

  if (btnGerarRelatorio) {
      btnGerarRelatorio.addEventListener('click', gerarRelatorio);
  }
  if (btnFecharRelatorio) {
      btnFecharRelatorio.addEventListener('click', () => {
          relatorioContainer.style.display = 'none';
      });
  }
});

function gerarRelatorio() {
    if (!dashboardData || !dashboardData.kpis) {
        showAlert("Dados insuficientes para gerar o relatório. Por favor, aplique um filtro primeiro.", "warning");
        return;
    }

    // 1. Get filter values
    const clienteFiltro = document.getElementById("filtro-cliente").value;
    const veiculoFiltro = document.getElementById("filtro-veiculo").value;
    const statusFiltro = document.getElementById("filtro-status").value;
    const dataInicio = document.getElementById("filtro-data-inicio").value;
    const dataFim = document.getElementById("filtro-data-fim").value;

    // 2. Get calculated metrics from global data
    const { kpis, charts, totalServicos } = dashboardData;
    const { receitaRealizada, pendente, lucroBruto, ticketMedio } = kpis;
    const { receita: receitaPorTipo, status: statusData } = charts.tipoItem;
    const topItens = charts.topItens;

    const receitaPecas = receitaPorTipo.find(item => item.tipo === 'Peça')?.total || 0;

    // 3. Find top item
    const topItemTexto = topItens.length > 0 
        ? `O item que mais gerou faturamento foi '${topItens[0].descricao}' com R$ ${formatarValor(topItens[0].total)}.` 
        : "Não há dados de faturamento de itens para o período.";

    // 4. Build report string
    let relatorio = `RELATÓRIO DE ANÁLISE DE SERVIÇOS\n`;
    relatorio += `=====================================\n\n`;

    let filtrosAtivos = [];
    if (dataInicio && dataFim) {
        filtrosAtivos.push(`Período de ${new Date(dataInicio+'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim+'T00:00:00').toLocaleDateString('pt-BR')}`);
    }
    if (clienteFiltro) filtrosAtivos.push(`Cliente contendo '${clienteFiltro}'`);
    if (veiculoFiltro) filtrosAtivos.push(`Veículo contendo '${veiculoFiltro}'`);
    if (statusFiltro) filtrosAtivos.push(`Status '${statusFiltro}'`);

    if (filtrosAtivos.length > 0) {
        relatorio += `Filtros Aplicados:\n- ${filtrosAtivos.join('\n- ')}\n\n`;
    } else {
        relatorio += `Filtros Aplicados: Nenhum\n\n`;
    }

    relatorio += `Resumo Financeiro:\n`;
    relatorio += `- Receita Realizada (paga): R$ ${formatarValor(receitaRealizada)}\n`;
    relatorio += `- Lucro Bruto (M.O. Recebida): R$ ${formatarValor(lucroBruto)}\n`;
    relatorio += `- Valor Pendente de Recebimento: R$ ${formatarValor(pendente < 0 ? 0 : pendente)}\n`;
    relatorio += `- Ticket Médio (por serviço pago): R$ ${formatarValor(ticketMedio)}\n\n`;

    relatorio += `Detalhes da Receita e Faturamento:\n`;
    relatorio += `- Para os ${totalServicos} serviços encontrados:\n`;
    relatorio += `  - ${topItemTexto}\n`;
    relatorio += `  - Do total da receita, R$ ${formatarValor(receitaPecas)} vieram de Peças e R$ ${formatarValor(lucroBruto)} de Mão de Obra.\n\n`;

    const statusTexto = Object.entries(statusData).map(([status, count]) => `${count} serviço(s) com status '${status}'`).join(', ');
    if (statusTexto) {
        relatorio += `Distribuição de Status:\n- ${statusTexto}.\n`;
    }

    // 5. Display report
    const relatorioContainer = document.getElementById('relatorio-container');
    const relatorioTextoEl = document.getElementById('relatorio-texto');
    
    relatorioTextoEl.textContent = relatorio;
    relatorioContainer.style.display = 'block';
}
