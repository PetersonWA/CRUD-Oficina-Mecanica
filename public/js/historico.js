/* Scripts específicos para a página de histórico */

// State variables
let paginaAtual = 1;
const itensPorPagina = 9;
let receitaChartType = "bar";
let tipoChartAnalysis = "receita";
let topChartMode = 'itens'; // 'itens', 'clientes', 'mecanicos'
let allServicos = [];
let allOrcamentos = [];
let allPagamentos = [];
let filteredServicos = [];
let filteredOrcamentos = [];


// Chart instances
let receitaRealizadaChart = null;
let tipoItemChart = null;
let topItensChart = null;

// Main function to load data and initialize dashboard
async function carregarDados() {
    try {
        [allServicos, allOrcamentos, allPagamentos] = await Promise.all([
            window.api.getServicos(),
            window.api.getOrcamentos(),
            window.api.getPagamentos()
        ]);
        aplicarFiltros();
    } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        showAlert("Falha ao carregar dados iniciais. Verifique o console.", "danger");
    }
}

// Filter and sort data, then update the dashboard
async function aplicarFiltros() {
    const filtros = {
        cliente: document.getElementById("filtro-cliente").value.toLowerCase(),
        veiculo: document.getElementById("filtro-veiculo").value.toLowerCase(),
        status: document.getElementById("filtro-status").value,
        dataInicio: document.getElementById("filtro-data-inicio").value,
        dataFim: document.getElementById("filtro-data-fim").value,
        groupBy: document.querySelector('input[name="groupBy"]:checked').value || 'month',
    };

    // 1. Filtro inicial a partir dos dados brutos
    let servicosFiltradosInicialmente = allServicos.filter(s => {
        const dataServico = new Date(s.dataEntrada + 'T00:00:00');
        const dataInicioFiltro = filtros.dataInicio ? new Date(filtros.dataInicio + 'T00:00:00') : null;
        const dataFimFiltro = filtros.dataFim ? new Date(filtros.dataFim + 'T00:00:00') : null;

        const matchCliente = !filtros.cliente || s.clienteNome.toLowerCase().includes(filtros.cliente);
        const matchVeiculo = !filtros.veiculo || s.placaVeiculo.toLowerCase().includes(filtros.veiculo);
        const matchStatus = !filtros.status || s.status === filtros.status;
        const matchData = (!dataInicioFiltro || dataServico >= dataInicioFiltro) && (!dataFimFiltro || dataServico <= dataFimFiltro);

        return matchCliente && matchVeiculo && matchStatus && matchData;
    });

    // 2. Enriquecer serviços filtrados com dados de pagamento (usando dados pré-carregados)
    const pagamentosMap = new Map();
    for (const pagamento of allPagamentos) {
        if (!pagamentosMap.has(pagamento.servico_id)) {
            pagamentosMap.set(pagamento.servico_id, []);
        }
        pagamentosMap.get(pagamento.servico_id).push(pagamento);
    }

    filteredServicos = servicosFiltradosInicialmente.map(servico => ({
        ...servico,
        pagamentos: pagamentosMap.get(servico.id) || []
    }));

    // 3. Filtrar orçamentos
    filteredOrcamentos = allOrcamentos.filter(o => {
        const [dia, mes, ano] = o.data.split('/');
        const dataOrcamento = new Date(`${ano}-${mes}-${dia}T00:00:00`);
        const dataInicioFiltro = filtros.dataInicio ? new Date(filtros.dataInicio + 'T00:00:00') : null;
        const dataFimFiltro = filtros.dataFim ? new Date(filtros.dataFim + 'T00:00:00') : null;
        return (!dataInicioFiltro || dataOrcamento >= dataInicioFiltro) && (!dataFimFiltro || dataOrcamento <= dataFimFiltro);
    });
    
    paginaAtual = 1;
    atualizarDashboard();
}

function limparFiltros() {
    document.getElementById("filtro-cliente").value = "";
    document.getElementById("filtro-veiculo").value = "";
    document.getElementById("filtro-status").value = "";
    document.getElementById("filtro-data-inicio").value = "";
    document.getElementById("filtro-data-fim").value = "";
    document.getElementById("group-month").checked = true;
    aplicarFiltros();
}

function calcularMetricas() {
    const servicosConcluidos = filteredServicos.filter(s => s.status === 'Concluído');

    // KPI: Faturamento Bruto (só de serviços concluídos)
    const faturamentoBruto = servicosConcluidos.reduce((acc, s) => acc + s.valorTotal, 0);

    // KPI: Receita Realizada (pagamentos recebidos de todos os serviços filtrados)
    const receitaRealizada = filteredServicos.reduce((acc, s) => {
        const valorPago = s.pagamentos ? s.pagamentos.reduce((pAcc, p) => pAcc + p.valor, 0) : 0;
        return acc + valorPago;
    }, 0);

    // KPI: Pendente de Recebimento
    const totalCobrado = filteredServicos.reduce((acc, s) => acc + s.valorTotal, 0);
    const pendente = totalCobrado - receitaRealizada;

    // KPI: Serviços Concluídos
    const numServicosConcluidos = servicosConcluidos.length;

    // KPI: Ticket Médio (por serviço concluído)
    const ticketMedio = numServicosConcluidos > 0 ? faturamentoBruto / numServicosConcluidos : 0;

    // KPI: Taxa de Conversão
    const orcamentosAprovados = filteredOrcamentos.filter(o => o.status === 'Aprovado' || o.status === 'Faturado').length;
    const taxaConversao = filteredOrcamentos.length > 0 ? (orcamentosAprovados / filteredOrcamentos.length) * 100 : 0;

    // Chart: Top 10
    const faturamentoPorItem = {};
    const faturamentoPorCliente = {};
    const faturamentoPorMecanico = {};

    servicosConcluidos.forEach(s => {
        // Agregação por cliente
        faturamentoPorCliente[s.clienteNome] = (faturamentoPorCliente[s.clienteNome] || 0) + s.valorTotal;
        // Agregação por mecânico
        faturamentoPorMecanico[s.mecanico] = (faturamentoPorMecanico[s.mecanico] || 0) + s.valorTotal;
        // Agregação por item
        s.itens.forEach(item => {
            const qtd = parseFloat(item.quantidade) || 0;
            const valor = parseFloat(item.valor_unitario) || 0;
            const subtotal = qtd * valor;
            if (!isNaN(subtotal)) {
                faturamentoPorItem[item.descricao] = (faturamentoPorItem[item.descricao] || 0) + subtotal;
            }
        });
    });

    // Chart: Receita Realizada (agrupado)
    // NOTA: Este gráfico depende da presença de um array `pagamentos` nos objetos de serviço.
    const receitaAgrupada = {};
    const groupBy = document.querySelector('input[name="groupBy"]:checked').value;
    filteredServicos.forEach(s => {
        if (!s.pagamentos) return;
        s.pagamentos.forEach(p => {
            const dataPagamento = new Date(p.data + 'T00:00:00');
            let key;
            if (groupBy === 'day') key = dataPagamento.toLocaleDateString('pt-BR');
            else if (groupBy === 'year') key = dataPagamento.getFullYear();
            else key = `${(dataPagamento.getMonth() + 1).toString().padStart(2, '0')}/${dataPagamento.getFullYear()}`; // month
            
            receitaAgrupada[key] = (receitaAgrupada[key] || 0) + p.valor;
        });
    });
    const sortedReceitaKeys = Object.keys(receitaAgrupada).sort();
    const receitaChartData = {
        labels: sortedReceitaKeys,
        data: sortedReceitaKeys.map(key => receitaAgrupada[key])
    };

    // Chart: Tipo Item (Receita) e Status
    const receitaPorTipo = {};
    const statusCounts = {};
    filteredServicos.forEach(s => {
        // Status
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
        // Receita por tipo de item (baseado em serviços concluídos)
        if (s.status === 'Concluído') {
            s.itens.forEach(item => {
                const tipo = item.tipo || 'Não Classificado';
                const qtd = parseFloat(item.quantidade) || 0;
                const valor = parseFloat(item.valor_unitario) || 0; // Correção aqui
                const subtotal = qtd * valor;
                if (!isNaN(subtotal)) {
                    receitaPorTipo[tipo] = (receitaPorTipo[tipo] || 0) + subtotal;
                }
            });
        }
    });
    const receitaPorTipoData = Object.keys(receitaPorTipo).map(tipo => ({ tipo, total: receitaPorTipo[tipo] }));

    return {
        kpis: {
            receitaRealizada,
            faturamentoBruto,
            pendente,
            numServicosConcluidos,
            ticketMedio,
            taxaConversao
        },
        charts: {
            top: {
                itens: faturamentoPorItem,
                clientes: faturamentoPorCliente,
                mecanicos: faturamentoPorMecanico
            },
            receitaRealizada: receitaChartData,
            tipoItem: {
                receita: receitaPorTipoData,
                status: statusCounts
            }
        }
    };
}


function atualizarDashboard() {
    const { kpis, charts } = calcularMetricas();

    atualizarKpis(kpis);
    renderTopItensChart(charts.top);
    renderReceitaRealizadaChart(charts.receitaRealizada, receitaChartType);
    renderTipoItemChart(charts.tipoItem.receita, charts.tipoItem.status, tipoChartAnalysis);
    
    // Paginate and update cards
    const totalServicos = filteredServicos.length;
    const paginatedServicos = filteredServicos.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
    
    atualizarCards(paginatedServicos || []);
    atualizarPaginacao(totalServicos || 0);
    atualizarContador(totalServicos || 0);
}

function atualizarKpis(kpis) {
    document.getElementById("kpi-receita-realizada").textContent = `R$ ${formatarValor(kpis.receitaRealizada)}`;
    document.getElementById("kpi-faturamento-bruto").textContent = `R$ ${formatarValor(kpis.faturamentoBruto)}`;
    document.getElementById("kpi-pendente").textContent = `R$ ${formatarValor(kpis.pendente < 0 ? 0 : kpis.pendente)}`;
    document.getElementById("kpi-servicos-concluidos").textContent = kpis.numServicosConcluidos;
    document.getElementById("kpi-ticket-medio").textContent = `R$ ${formatarValor(kpis.ticketMedio)}`;
    document.getElementById("kpi-taxa-conversao").textContent = `${kpis.taxaConversao.toFixed(2)}%`;
}

function getStatusClass(status) {
  const classes = {
    Concluído: "success",
    "Em andamento": "warning",
    "Aguardando peças": "info",
    "Aguardando aprovação": "danger",
  };
  return classes[status] || "secondary";
}

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
          borderColor: "rgba(46, 125, 50, 1)",
          tension: 0.1,
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
            label: (context) => `R$ ${formatarValor(context.parsed.y)}`,
          },
        },
      },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderTipoItemChart(receitaPorTipoData, statusCountsData, analysisType) {
  const ctx = document.getElementById("tipoItemChart").getContext("2d");
  if (tipoItemChart) tipoItemChart.destroy();

  let labels, values, title, tooltipCallback;
  let colors = [];

  if (analysisType === "receita") {
    title = "Receita por Tipo (Serv. Concluídos)";
    const colorMap = { "Peça": "#FFC107", "Mão de Obra": "#2E7D32", "Não Classificado": "#6c757d" };
    labels = receitaPorTipoData.map(item => item.tipo || 'Não Classificado');
    values = receitaPorTipoData.map(item => item.total);
    colors = labels.map((k) => colorMap[k] || "#0dcaf0");
    tooltipCallback = function (context) {
      const total = context.dataset.data.reduce((a, b) => a + b, 0);
      const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(2) : 0;
      return `${context.label}: R$ ${formatarValor(context.parsed)} (${percentage}%)`;
    };
  } else {
    title = "Serviços por Status";
    const statusColorMap = { success: "#198754", warning: "#ffc107", info: "#0dcaf0", danger: "#dc3545", secondary: "#6c757d" };
    labels = Object.keys(statusCountsData);
    values = Object.values(statusCountsData);
    colors = labels.map((k) => statusColorMap[getStatusClass(k)] || "#6c757d");
    tooltipCallback = function (context) {
      const total = context.dataset.data.reduce((a, b) => a + b, 0);
      const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(2) : 0;
      return `${context.label}: ${context.parsed} serviço(s) (${percentage}%)`;
    };
  }

  tipoItemChart = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, hoverOffset: 4 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: title },
        tooltip: { callbacks: { label: tooltipCallback } },
      },
    },
  });
}

function renderTopItensChart(topData) {
    const ctx = document.getElementById("topItensChart").getContext("2d");

    let data, titleText, tooltipLabel;

    switch (topChartMode) {
        case 'clientes':
            data = Object.entries(topData.clientes).sort(([, a], [, b]) => b - a).slice(0, 10);
            titleText = 'Top 10 Clientes por Faturamento';
            tooltipLabel = 'Faturamento';
            break;
        case 'mecanicos':
            data = Object.entries(topData.mecanicos).sort(([, a], [, b]) => b - a).slice(0, 10);
            titleText = 'Top 10 Mecânicos por Faturamento';
            tooltipLabel = 'Faturamento';
            break;
        case 'itens':
        default:
            data = Object.entries(topData.itens).sort(([, a], [, b]) => b - a).slice(0, 10);
            titleText = 'Top 10 Itens por Faturamento';
            tooltipLabel = 'Faturamento Gerado';
            break;
    }
    
    document.getElementById('top-chart-title').textContent = titleText;

    if (topItensChart) topItensChart.destroy();
    topItensChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.map(item => item[0]),
            datasets: [{
                label: tooltipLabel,
                data: data.map(item => item[1]),
                backgroundColor: "rgba(75, 192, 192, 0.7)",
            }],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${tooltipLabel}: R$ ${formatarValor(context.parsed.x)}`,
                    },
                },
            },
        },
    });
}


// --- Pagination and Modal Logic (mostly unchanged) ---
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

  // Botão Anterior
  paginacaoEl.innerHTML += `<li class="page-item ${paginaAtual === 1 ? "disabled" : ""}"><a class="page-link" href="#" onclick="mudarPagina(${paginaAtual - 1})">&laquo;</a></li>`;

  // Botões de página
  for (let i = 1; i <= totalPaginas; i++) {
    paginacaoEl.innerHTML += `<li class="page-item ${i === paginaAtual ? "active" : ""}"><a class="page-link" href="#" onclick="mudarPagina(${i})">${i}</a></li>`;
  }

  // Botão Próximo
  paginacaoEl.innerHTML += `<li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}"><a class="page-link" href="#" onclick="mudarPagina(${paginaAtual + 1})">&raquo;</a></li>`;
}

function mudarPagina(pagina) {
  const totalPaginas = Math.ceil(filteredServicos.length / itensPorPagina);
  if (pagina < 1 || pagina > totalPaginas) return;
  paginaAtual = pagina;
  atualizarDashboard();
  window.scrollTo(0, 0);
}

function getStatusPagamentoBadge(status) {
  const badges = {
    "Pago": '<span class="badge bg-success">Pago</span>',
    "Parcialmente Pago": '<span class="badge bg-info text-dark">Parcialmente Pago</span>',
    "Pendente": '<span class="badge bg-warning text-dark">Pendente</span>',
  };
  return badges[status] || badges['Pendente'];
}

async function verDetalhes(id) {
    try {
        const servico = await window.api.getServicoById(id);
        if (servico) {
            document.getElementById("detalhe-os-id").textContent = String(servico.id).padStart(6, "0");
            document.getElementById("detalhe-cliente").textContent = servico.clienteNome || 'N/A';
            document.getElementById("detalhe-veiculo").textContent = servico.placaVeiculo || 'N/A';
            document.getElementById("detalhe-data-entrada").textContent = new Date(servico.dataEntrada + "T00:00:00").toLocaleDateString("pt-BR");
            document.getElementById("detalhe-mecanico").textContent = servico.mecanico;
            document.getElementById("detalhe-status").innerHTML = `<span class="badge bg-${getStatusClass(servico.status)}">${servico.status}</span>`;
            document.getElementById("detalhe-status-pagamento").innerHTML = getStatusPagamentoBadge(servico.statusPagamento);
            document.getElementById("detalhe-valor").textContent = `R$ ${formatarValor(servico.valorTotal)}`;

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
  document.getElementById("contador-servicos").textContent = `${totalServicos} serviços encontrados`;
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
      atualizarDashboard();
  });

  document.getElementById("toggle-tipo-chart-analysis").addEventListener("click", () => {
      tipoChartAnalysis = tipoChartAnalysis === "receita" ? "status" : "receita";
      atualizarDashboard();
  });

  document.getElementById("toggle-top-chart-mode").addEventListener("click", () => {
      const modes = ['itens', 'clientes', 'mecanicos'];
      const currentIndex = modes.indexOf(topChartMode);
      topChartMode = modes[(currentIndex + 1) % modes.length];
      atualizarDashboard();
  });

  document.querySelectorAll(".expand-chart-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const chartContainer = button.closest(".chart-container");
      const chartColumn = button.closest('[class*="col-"]');
      const isExpanded = chartColumn.dataset.isExpanded === "true";
      const chartRow = chartColumn.parentElement;
      const icon = e.currentTarget.querySelector("i");

      const chartInstances = { receitaRealizadaChart, tipoItemChart };

      if (isExpanded) {
        chartContainer.classList.remove("expanded-chart-container");
        chartRow.querySelectorAll('[class*="col-"]').forEach(col => {
            if (col.dataset.originalClass) {
                col.className = col.dataset.originalClass;
                delete col.dataset.originalClass;
            }
            col.style.display = '';
        });
        chartColumn.dataset.isExpanded = "false";
        icon.classList.replace("bi-arrows-angle-contract", "bi-arrows-fullscreen");
      } else {
        chartContainer.classList.add("expanded-chart-container");
        Array.from(chartRow.children).forEach(col => {
            if (col !== chartColumn) {
                col.dataset.originalClass = col.className;
                col.style.display = 'none';
            }
        });
        chartColumn.dataset.originalClass = chartColumn.className;
        chartColumn.className = 'col-12';
        chartColumn.dataset.isExpanded = "true";
        icon.classList.replace("bi-arrows-fullscreen", "bi-arrows-angle-contract");
      }
      // Resize all charts after animation
      setTimeout(() => Object.values(chartInstances).forEach(c => c && c.resize()), 150);
    });
  });

  document.body.addEventListener('click', function(event) {
    if (event.target.closest('.collapse-chart-btn')) {
      const button = event.target.closest('.collapse-chart-btn');
      const canvas = document.getElementById(button.dataset.targetCanvas);
      if (canvas) canvas.classList.toggle('d-none');
    }
  });
  
  // Relatório (simplificado, pois a lógica de dados mudou)
  document.getElementById('btn-gerar-relatorio').addEventListener('click', () => showAlert("Função de relatório precisa ser adaptada para a nova estrutura de dados.", "info"));
  document.getElementById('btn-fechar-relatorio').addEventListener('click', () => document.getElementById('relatorio-container').style.display = 'none');
});