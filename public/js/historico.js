/* Scripts específicos para a página de histórico */

// State variables
let todosServicos = [];
let servicosFiltrados = [];
let paginaAtual = 1;
const itensPorPagina = 9;
let receitaChartType = 'bar';
let tipoChartAnalysis = 'receita';

// Chart instances
let receitaRealizadaChart = null;
let tipoItemChart = null;
let topItensChart = null;

// Main function to load data and initialize dashboard
async function carregarDados() {
  await aplicarFiltros();
}

// Filter and sort data, then update the dashboard
async function aplicarFiltros() {
  try {
    todosServicos = await lerDados('servicos.json') || [];
  } catch (error) {
    console.error('Erro ao recarregar os dados:', error);
    todosServicos = [];
  }

  const cliente = document.getElementById('filtro-cliente').value.toLowerCase();
  const veiculo = document.getElementById('filtro-veiculo').value.toLowerCase();
  const status = document.getElementById('filtro-status').value;
  const dataInicio = document.getElementById('filtro-data-inicio').value;
  const dataFim = document.getElementById('filtro-data-fim').value;
  const tipoData = document.querySelector('input[name="filtroTipoData"]:checked').value;
  const groupBy = document.querySelector('input[name="groupBy"]:checked').value;

  servicosFiltrados = todosServicos.filter(s => {
    const dataAlvo = tipoData === 'dataConclusao' ? s.dataConclusao : s.dataEntrada;
    const filtroDataOk = (!dataInicio || (dataAlvo && dataAlvo >= dataInicio)) && 
                         (!dataFim || (dataAlvo && dataAlvo <= dataFim));
    if (tipoData === 'dataConclusao' && !s.dataConclusao) {
      return false;
    }
    return (!cliente || s.clienteNome.toLowerCase().includes(cliente)) &&
           (!veiculo || s.placaVeiculo.toLowerCase().includes(veiculo)) &&
           (!status || s.status === status) &&
           filtroDataOk;
  });

  servicosFiltrados.sort((a, b) => new Date(b.dataEntrada) - new Date(a.dataEntrada));
  paginaAtual = 1;
  atualizarDashboard(groupBy);
}

// Clear all filter inputs and re-apply
function limparFiltros() {
  document.getElementById('filtro-cliente').value = '';
  document.getElementById('filtro-veiculo').value = '';
  document.getElementById('filtro-status').value = '';
  document.getElementById('filtro-data-inicio').value = '';
  document.getElementById('filtro-data-fim').value = '';
  document.getElementById('group-month').checked = true;
  aplicarFiltros();
}

// Calculate all KPIs and chart data
function calcularMetricas(servicos) {
    let faturamentoBrutoConcluidos = 0;
    let receitaRealizada = 0;
    let pendenteDeRecebimento = 0;
    let receitaPorTipo = { 'Peça': 0, 'Mão de Obra': 0, 'Não Classificado': 0 };
    let faturamentoPorItem = {};
    let statusCounts = {};

    servicos.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;

    const todosOsPagamentos = servicos.flatMap(s => (s.pagamentos || []).map(p => ({ ...p, servico: s })));
    const pagamentosNoPeriodo = todosOsPagamentos.filter(p => {
        if (!p.data) return false;
        return (!dataInicio || p.data >= dataInicio) && (!dataFim || p.data <= dataFim);
    });

    pagamentosNoPeriodo.forEach(p => {
        receitaRealizada += p.valor || 0;
    });

    const servicosConcluidos = servicos.filter(s => {
        const isConcluido = s.status === 'Concluído' || s.status === 'Concluido';
        if (!isConcluido) return false;
        const dataConclusao = s.dataConclusao;
        const tipoData = document.querySelector('input[name="filtroTipoData"]:checked').value;
        if (tipoData === 'dataConclusao') {
             return (!dataInicio || (dataConclusao && dataConclusao >= dataInicio)) &&
                    (!dataFim || (dataConclusao && dataConclusao <= dataFim));
        }
        return true;
    });

    servicosConcluidos.forEach(s => {
        const valorServico = s.valorTotal !== undefined ? s.valorTotal : s.valor;
        faturamentoBrutoConcluidos += valorServico || 0;
        s.itens.forEach(item => {
            const itemTotal = (item.valor || 0) * (item.quantidade || 0);
            const desc = item.descricao.trim();
            faturamentoPorItem[desc] = (faturamentoPorItem[desc] || 0) + itemTotal;
        });
    });
    
    servicos.forEach(servico => {
        const valorTotalServico = servico.valorTotal !== undefined ? servico.valorTotal : servico.valor;
        const totalPago = (servico.pagamentos || []).reduce((acc, p) => acc + (p.valor || 0), 0);
        
        if (totalPago < valorTotalServico) {
            pendenteDeRecebimento += valorTotalServico - totalPago;
        }
    });

    const servicosComPagamentoIds = new Set(pagamentosNoPeriodo.map(p => p.servico.id));
    const numServicosComPagamento = servicosComPagamentoIds.size;
    const ticketMedio = numServicosComPagamento > 0 ? receitaRealizada / numServicosComPagamento : 0;

    if (faturamentoBrutoConcluidos > 0) {
        const proporcaoReceita = receitaRealizada / faturamentoBrutoConcluidos;
        servicosConcluidos.forEach(s => {
            s.itens.forEach(item => {
                const itemTotal = (item.valor || 0) * (item.quantidade || 0);
                const tipo = item.tipo || 'Não Classificado';
                receitaPorTipo[tipo] = (receitaPorTipo[tipo] || 0) + itemTotal * proporcaoReceita;
            });
        });
    }

    return { 
        faturamentoBruto: faturamentoBrutoConcluidos, 
        receitaRealizada, 
        ticketMedio, 
        pendente: pendenteDeRecebimento, 
        receitaPorTipo, 
        faturamentoPorItem, 
        statusCounts 
    };
}

// Main update function for the entire dashboard
function atualizarDashboard(groupBy = 'month') {
  const { faturamentoBruto, receitaRealizada, ticketMedio, pendente, receitaPorTipo, faturamentoPorItem, statusCounts } = calcularMetricas(servicosFiltrados);
  
  atualizarKpis(faturamentoBruto, receitaRealizada, ticketMedio, pendente);
  atualizarCards();
  atualizarPaginacao();
  atualizarContador();

  renderReceitaRealizadaChart(servicosFiltrados, groupBy, receitaChartType);
  renderTipoItemChart(receitaPorTipo, statusCounts, tipoChartAnalysis);
  renderTopItensChart(faturamentoPorItem);
}

// Update KPI cards
function atualizarKpis(faturamentoBruto, receitaRealizada, ticketMedio, pendente) {
  document.getElementById('kpi-receita-realizada').textContent = `R$ ${formatarValor(receitaRealizada)}`;
  document.getElementById('kpi-faturamento-bruto').textContent = `R$ ${formatarValor(faturamentoBruto)}`;
  document.getElementById('kpi-pendente').textContent = `R$ ${formatarValor(pendente < 0 ? 0 : pendente)}`;
  document.getElementById('kpi-ticket-medio').textContent = `R$ ${formatarValor(ticketMedio)}`;
}

// Get bootstrap color class based on service status
function getStatusClass(status) {
  const classes = {
    'Concluído': 'success',
    'Em andamento': 'warning',
    'Aguardando peças': 'info',
    'Aguardando aprovação': 'danger'
  };
  return classes[status] || 'secondary';
}

// Render the paginated service cards
function atualizarCards() {
  const container = document.getElementById('cards-servicos');
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const servicosPagina = servicosFiltrados.slice(inicio, fim);
  container.innerHTML = servicosPagina.map(servico => `
    <div class="col-md-4 mb-3">
      <div class="card servico-card h-100">
        <div class="card-header d-flex justify-content-between align-items-center py-2">
          <span class="badge bg-${getStatusClass(servico.status)}">${servico.status}</span>
          <div>
            <small class="text-muted d-block text-end">Entrada: ${new Date(servico.dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
            ${servico.dataConclusao ? `<small class="text-muted d-block text-end">Conclusão: ${new Date(servico.dataConclusao + 'T00:00:00').toLocaleDateString('pt-BR')}</small>` : ''}
          </div>
        </div>
        <div class="card-body py-2"><h6 class="card-title mb-1">${servico.clienteNome}</h6><p class="card-text text-muted small mb-2">${servico.placaVeiculo}</p></div>
        <div class="card-footer bg-transparent py-2 d-flex justify-content-between align-items-center">
          <span class="fw-bold text-primary">R$ ${formatarValor(servico.valorTotal)}</span>
          <button class="btn btn-sm btn-outline-primary" onclick="verDetalhes(${servico.id})"><i class="bi bi-eye"></i></button>
        </div>
      </div>
    </div>`).join('');
}

// Render the revenue chart
function renderReceitaRealizadaChart(servicos, groupBy = 'month', chartType = 'bar') {
    const ctx = document.getElementById('receitaRealizadaChart').getContext('2d');
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;

    const pagamentosNoPeriodo = servicos
      .flatMap(s => s.pagamentos || [])
      .filter(p => {
        if (!p.data) return false;
        return (!dataInicio || p.data >= dataInicio) && (!dataFim || p.data <= dataFim);
      });

    const revenueByTimeUnit = pagamentosNoPeriodo.reduce((acc, p) => {
      let timeUnit;
      const date = new Date(p.data + 'T00:00:00');
      if (groupBy === 'day') {
        timeUnit = date.toLocaleDateString('pt-BR');
      } else if (groupBy === 'year') {
        timeUnit = date.getFullYear().toString();
      } else { // month
        timeUnit = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      }
      acc[timeUnit] = (acc[timeUnit] || 0) + p.valor;
      return acc;
    }, {});

    const monthMap = { 'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11 };

    const sortedLabels = Object.keys(revenueByTimeUnit).sort((a, b) => {
        if (groupBy === 'day') {
            const [dayA, monthA, yearA] = a.split('/');
            const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
            const [dayB, monthB, yearB] = b.split('/');
            const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
            return dateA - dateB;
        }
        if (groupBy === 'month') {
            const [m1Str, y1] = a.split('/');
            const [m2Str, y2] = b.split('/');
            const m1 = monthMap[m1Str.toLowerCase()];
            const m2 = monthMap[m2Str.toLowerCase()];
            if (y1 !== y2) {
                return `20${y1}` - `20${y2}`;
            }
            return m1 - m2;
        }
        return a.localeCompare(b); // For year
    });

    const sortedRevenue = sortedLabels.map(label => revenueByTimeUnit[label]);

    if(receitaRealizadaChart) receitaRealizadaChart.destroy();
    receitaRealizadaChart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: sortedLabels,
        datasets: [{
          label: 'Receita Realizada',
          data: sortedRevenue,
          backgroundColor: 'rgba(46, 125, 50, 0.7)',
          borderColor: 'rgba(46, 125, 50, 1)', // For line chart
          tension: 0.1 // For line chart
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false }, 
          title: { display: true, text: 'Receita Realizada (Pagamentos Recebidos)' },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) { label += ': '; }
                if (context.parsed.y !== null) { label += 'R$ ' + formatarValor(context.parsed.y); }
                return label;
              }
            }
          }
        }, 
        scales: { y: { beginAtZero: true } } 
      }
    });
}

// Render the pie chart
function renderTipoItemChart(receitaPorTipo, statusCounts, analysisType) {
    const ctx = document.getElementById('tipoItemChart').getContext('2d');
    if(tipoItemChart) tipoItemChart.destroy();

    let labels, values, title, tooltipCallback;
    let colors = [];

    if (analysisType === 'receita') {
      title = 'Receita por Tipo';
      const colorMap = {
          'Peça': '#FFC107',
          'Mão de Obra': '#2E7D32',
          'Não Classificado': '#6c757d'
      };
      labels = Object.keys(receitaPorTipo).filter(k => receitaPorTipo[k] > 0);
      values = labels.map(k => receitaPorTipo[k]);
      colors = labels.map(k => colorMap[k] || '#0dcaf0');
      tooltipCallback = function(context) {
        let label = context.label || '';
        if (label) { label += ': '; }
        if (context.parsed !== null) {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? (context.parsed / total * 100).toFixed(2) : 0;
          label += 'R$ ' + formatarValor(context.parsed) + ` (${percentage}%)`;
        }
        return label;
      };

    } else { // analysisType === 'status'
      title = 'Serviços por Status';
      const statusColorMap = {
        'success': '#198754',
        'warning': '#ffc107',
        'info': '#0dcaf0',
        'danger': '#dc3545',
        'secondary': '#6c757d'
      };
      labels = Object.keys(statusCounts).filter(k => statusCounts[k] > 0);
      values = labels.map(k => statusCounts[k]);
      colors = labels.map(k => statusColorMap[getStatusClass(k)] || '#6c757d');
      tooltipCallback = function(context) {
        let label = context.label || '';
        if (label) { label += ': '; }
        if (context.parsed !== null) {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? (context.parsed / total * 100).toFixed(2) : 0;
          label += context.parsed + ` serviço(s) (${percentage}%)`;
        }
        return label;
      };
    }

    tipoItemChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          hoverOffset: 4
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { 
          legend: { position: 'top' }, 
          title: { display: true, text: title },
          tooltip: {
            callbacks: {
              label: tooltipCallback
            }
          }
        } 
      }
    });
}

// Render the top items chart
function renderTopItensChart(faturamentoPorItem) {
    const ctx = document.getElementById('topItensChart').getContext('2d');
    
    const sortedItems = Object.entries(faturamentoPorItem).sort(([,a],[,b]) => b-a).slice(0, 10);

    if(topItensChart) topItensChart.destroy();
    topItensChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedItems.map(item => item[0]),
            datasets: [{
                label: 'Faturamento Gerado',
                data: sortedItems.map(item => item[1]),
                backgroundColor: 'rgba(75, 192, 192, 0.7)'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Top 10 Itens por Faturamento' },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return 'Faturamento: R$ ' + formatarValor(context.parsed.x);
                    }
                  }
                }
            }
        }
    });
}

// --- Pagination and Modal Logic ---
function atualizarPaginacao() {
    const totalPaginas = Math.ceil(servicosFiltrados.length / itensPorPagina);
    const paginacaoEl = document.querySelector('#paginacao .pagination');
    if (!paginacaoEl) return;

    paginacaoEl.innerHTML = '';

    if (totalPaginas <= 1) {
        document.getElementById('paginacao').style.display = 'none';
        return;
    }

    document.getElementById('paginacao').style.display = 'block';

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${paginaAtual === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" onclick="mudarPagina(${paginaAtual - 1})"><span aria-hidden="true">&laquo;</span></a>`;
    paginacaoEl.appendChild(prevLi);

    for (let i = 1; i <= totalPaginas; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === paginaAtual ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="mudarPagina(${i})">${i}</a>`;
        paginacaoEl.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" onclick="mudarPagina(${paginaAtual + 1})"><span aria-hidden="true">&raquo;</span></a>`;
    paginacaoEl.appendChild(nextLi);
}

function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(servicosFiltrados.length / itensPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaAtual = pagina;
    atualizarDashboard();
    window.scrollTo(0, 0);
}
  
function getStatusPagamentoBadge(status) {
    switch (status) {
        case 'Pago':
            return '<span class="badge bg-success">Pago</span>';
        case 'Parcialmente Pago':
            return '<span class="badge bg-info text-dark">Parcialmente Pago</span>';
        case 'Pendente':
        default:
            return '<span class="badge bg-warning text-dark">Pendente</span>';
    }
}

function verDetalhes(id) {
    const servico = todosServicos.find(s => s.id === id);
    if (servico) {
      document.getElementById('detalhe-os-id').textContent = String(servico.id).padStart(6, '0');
      document.getElementById('detalhe-cliente').textContent = servico.clienteNome;
      document.getElementById('detalhe-veiculo').textContent = servico.placaVeiculo;
      document.getElementById('detalhe-data-entrada').textContent = new Date(servico.dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR');
      document.getElementById('detalhe-mecanico').textContent = servico.mecanico;
      document.getElementById('detalhe-status').innerHTML = `<span class="badge bg-${getStatusClass(servico.status)}">${servico.status}</span>`;
      document.getElementById('detalhe-status-pagamento').innerHTML = getStatusPagamentoBadge(servico.statusPagamento);
      
      const valorServico = servico.valorTotal !== undefined ? servico.valorTotal : servico.valor;
      document.getElementById('detalhe-valor').textContent = `R$ ${formatarValor(valorServico)}`;
      
      const itensBody = document.getElementById('detalhe-itens-servico');
      itensBody.innerHTML = servico.itens.map(item => `
        <tr>
          <td>${item.descricao}</td>
          <td>${item.quantidade}</td>
          <td>R$ ${formatarValor(item.valor)}</td>
          <td>R$ ${formatarValor(item.quantidade * item.valor)}</td>
        </tr>
      `).join('');

      new bootstrap.Modal(document.getElementById('modalDetalhesServico')).show();
    }
}

function atualizarContador() { document.getElementById('contador-servicos').textContent = `${servicosFiltrados.length} serviços encontrados`; }
  
function imprimirDetalhesServico() {
    const modalContent = document.getElementById('modal-body-content').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`<html><head><title>Detalhes do Serviço</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"></head><body><div class="container p-4">${modalContent}</div></body></html>`);
    printWindow.document.close();
    printWindow.print();
}

// --- Event Listeners ---
window.addEventListener('DOMContentLoaded', carregarDados);

document.addEventListener('DOMContentLoaded', () => {
    const chartInstances = {
      'receitaRealizadaChart': receitaRealizadaChart,
      'tipoItemChart': tipoItemChart,
      'topItensChart': topItensChart
    };

    document.getElementById('toggle-receita-chart-type').addEventListener('click', (e) => {
      receitaChartType = receitaChartType === 'bar' ? 'line' : 'bar';
      const icon = e.currentTarget.querySelector('i');
      if (receitaChartType === 'line') {
        icon.classList.remove('bi-graph-up');
        icon.classList.add('bi-bar-chart-steps');
      } else {
        icon.classList.remove('bi-bar-chart-steps');
        icon.classList.add('bi-graph-up');
      }
      const groupBy = document.querySelector('input[name="groupBy"]:checked').value;
      renderReceitaRealizadaChart(servicosFiltrados, groupBy, receitaChartType);
    });

    document.getElementById('toggle-tipo-chart-analysis').addEventListener('click', () => {
      tipoChartAnalysis = tipoChartAnalysis === 'receita' ? 'status' : 'receita';
      atualizarDashboard();
    });

    document.querySelectorAll('.expand-chart-btn').forEach(button => {
      button.addEventListener('click', () => {
        const chartContainer = button.closest('.chart-container');
        const chartCanvas = chartContainer.querySelector('canvas');
        const chartId = chartCanvas.id;

        if (chartId === 'topItensChart') {
          const icon = button.querySelector('i');
          const isHidden = chartCanvas.classList.contains('d-none');

          if (isHidden) {
            // About to SHOW
            chartCanvas.classList.remove('d-none');
            const chart = chartInstances[chartId];
            if (chart) {
              setTimeout(() => chart.resize(), 50); // Resize after a short delay
            }
            icon.classList.remove('bi-eye-slash-fill');
            icon.classList.add('bi-arrows-fullscreen');
          } else {
            // About to HIDE
            chartCanvas.classList.add('d-none');
            icon.classList.remove('bi-arrows-fullscreen');
            icon.classList.add('bi-eye-slash-fill');
          }
        } else {
          // Existing resize logic for other charts
          const chartColumn = button.closest('[class*="col-"]');
          const chartRow = chartColumn.parentElement;
          const chart = chartInstances[chartId];
          const icon = button.querySelector('i');
          const isExpanded = chartColumn.dataset.isExpanded === 'true';

          if (isExpanded) {
            // Collapse
            chartContainer.classList.remove('expanded-chart-container');
            chartRow.querySelectorAll('[class*="col-"]').forEach(col => {
              if (col.dataset.originalClass) {
                col.className = col.dataset.originalClass;
                col.style.display = '';
                delete col.dataset.originalClass;
              }
              // Resize all charts in the row on collapse
              const canvas = col.querySelector('canvas');
              if (canvas && chartInstances[canvas.id]) {
                setTimeout(() => chartInstances[canvas.id].resize(), 150);
              }
            });
            chartColumn.dataset.isExpanded = 'false';
            icon.classList.remove('bi-arrows-angle-contract');
            icon.classList.add('bi-arrows-fullscreen');
          } else {
            // Expand
            chartContainer.classList.add('expanded-chart-container');
            const siblingCols = Array.from(chartRow.children).filter(c => c !== chartColumn);
            
            siblingCols.forEach(col => {
              col.dataset.originalClass = col.className;
              col.style.display = 'none';
            });

            chartColumn.dataset.originalClass = chartColumn.className;
            chartColumn.className = 'col-12';
            chartColumn.dataset.isExpanded = 'true';
            icon.classList.remove('bi-arrows-fullscreen');
            icon.classList.add('bi-arrows-angle-contract');
            
            setTimeout(() => {
              if (chart) chart.resize();
            }, 150);
          }
        }
      });
    });
});
