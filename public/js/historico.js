document.addEventListener('DOMContentLoaded', () => {
    // Chart instances
    let dreChart = null;
    let dfcChart = null;
    let projectedCashFlowChart = null;
    let topChart = null;

    let allServices = [];
    let currentFilteredServices = [];
    let topChartMode = 'itens'; // 'itens', 'clientes', 'mecanicos'

    // --- CORE FUNCTION ---
    async function atualizarDashboardCompleto() {
        const spinner = document.getElementById('loading-spinner');
        spinner.classList.remove('d-none');

        const filtros = {
            dataInicio: document.getElementById("filtro-data-inicio").value,
            dataFim: document.getElementById("filtro-data-fim").value,
            groupBy: document.querySelector('input[name="groupBy"]:checked').value || 'month',
            cliente: document.getElementById('filtro-cliente').value,
            veiculo: document.getElementById('filtro-veiculo').value,
            status: document.getElementById('filtro-status').value,
            tipoData: document.getElementById('filtro-tipo-data').value,
            mecanico: document.getElementById('filtro-mecanico').value,
            pagamento: document.getElementById('filtro-pagamento').value
        };

        try {
            const [dashboardData, servicesData] = await Promise.all([
                window.api.getDadosDashboard(filtros),
                window.api.getServicos()
            ]);

            allServices = servicesData;
            popularMecanicos(allServices); // Dynamically populate mechanics
            atualizarDashboard(dashboardData.kpis, dashboardData.charts, filtros);
            filtrarServicosLocalmente();

        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
        } finally {
            spinner.classList.add('d-none');
        }
    }

    function popularMecanicos(services) {
        const select = document.getElementById('filtro-mecanico');
        const currentValue = select.value;
        const mecanicos = new Set();

        services.forEach(s => {
            if (s.mecanico) mecanicos.add(s.mecanico);
        });

        // Keep 'Todos mecânicos' option
        select.innerHTML = '<option value="">Todos mecânicos</option>';

        Array.from(mecanicos).sort().forEach(m => {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = m;
            select.appendChild(option);
        });

        // Restore selection if possible
        if (currentValue && mecanicos.has(currentValue)) {
            select.value = currentValue;
        }
    }

    function filtrarServicosLocalmente() {
        const filtroCliente = document.getElementById('filtro-cliente').value.toLowerCase();
        const filtroVeiculo = document.getElementById('filtro-veiculo').value.toLowerCase();
        const filtroStatus = document.getElementById('filtro-status').value;
        const filtroMecanico = document.getElementById('filtro-mecanico').value;
        const filtroPagamento = document.getElementById('filtro-pagamento').value;
        const filtroDataInicio = document.getElementById('filtro-data-inicio').value;
        const filtroDataFim = document.getElementById('filtro-data-fim').value;
        const tipoData = document.getElementById('filtro-tipo-data').value;

        currentFilteredServices = allServices.filter(service => {
            const matchCliente = !filtroCliente || (service.clienteNome && service.clienteNome.toLowerCase().includes(filtroCliente));
            const matchVeiculo = !filtroVeiculo || (service.placaVeiculo && service.placaVeiculo.toLowerCase().includes(filtroVeiculo));
            const matchStatus = !filtroStatus || service.status === filtroStatus;
            const matchMecanico = !filtroMecanico || service.mecanico === filtroMecanico;
            const matchPagamento = !filtroPagamento || service.forma_pagamento === filtroPagamento;

            const dataCampo = tipoData === 'data_conclusao' ? service.dataConclusao : service.dataEntrada;
            if (!dataCampo) return false; // If the required date field is null, filter it out

            const dataServico = new Date(dataCampo + 'T00:00:00');
            const matchDataInicio = !filtroDataInicio || dataServico >= new Date(filtroDataInicio + 'T00:00:00');
            const matchDataFim = !filtroDataFim || dataServico <= new Date(filtroDataFim + 'T00:00:00');

            return matchCliente && matchVeiculo && matchStatus && matchDataInicio && matchDataFim && matchMecanico && matchPagamento;
        });

        document.getElementById('contador-servicos').textContent = `${currentFilteredServices.length} serviços`;
        renderTop10Chart(currentFilteredServices);
    }

    function limparFiltros() {
        document.getElementById('filtro-cliente').value = '';
        document.getElementById('filtro-veiculo').value = '';
        document.getElementById('filtro-status').value = '';
        document.getElementById('filtro-data-inicio').value = '';
        document.getElementById('filtro-data-fim').value = '';
        atualizarDashboardCompleto();
    }

    function renderTop10Chart(services) {
        const data = {};
        const title = document.getElementById('top-chart-title');
        let datasetLabel = '';

        if (topChartMode === 'itens') {
            title.textContent = 'Top 10 Peças por Faturamento';
            datasetLabel = 'Faturamento (R$)';
            const completedServices = services.filter(s => s.status === 'Concluído');
            completedServices.forEach(service => {
                service.itens.forEach(item => {
                    if (item.tipo === 'Peça') {
                        data[item.descricao] = (data[item.descricao] || 0) + (item.quantidade * item.valor_unitario);
                    }
                });
            });
        } else if (topChartMode === 'clientes') {
            title.textContent = 'Top 10 Clientes por Nº de Serviços Pagos';
            datasetLabel = 'Qtd. Serviços Pagos';
            const paidServices = services.filter(s => s.statusPagamento === 'Pago');
            paidServices.forEach(service => {
                data[service.clienteNome] = (data[service.clienteNome] || 0) + 1;
            });
        } else if (topChartMode === 'mecanicos') {
            title.textContent = 'Top 10 Mecânicos por Nº de Serviços Concluídos';
            datasetLabel = 'Qtd. Serviços Concluídos';
            const completedServices = services.filter(s => s.status === 'Concluído');
            completedServices.forEach(service => {
                if (service.mecanico) {
                    data[service.mecanico] = (data[service.mecanico] || 0) + 1;
                }
            });
        }

        const sortedData = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 10);

        const chartData = {
            labels: sortedData.map(([label]) => label),
            datasets: [{
                label: datasetLabel,
                data: sortedData.map(([, value]) => value),
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        };

        const ctx = document.getElementById('topItensChart').getContext('2d');
        if (topChart) {
            topChart.destroy();
        }
        topChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }

    function atualizarDashboard(kpis, charts, filtros) {
        atualizarKpis(kpis, filtros);
        renderDreChart(charts.dreChart);
        renderDfcChart(charts.dfcChart);
        renderProjectedCashFlowChart(charts.projectedCashFlowChart);
    }

    function atualizarKpis(kpis, filtros) {
        document.getElementById("kpi-lucro-liquido").textContent = `R$ ${formatarValor(kpis.lucroLiquido)}`;
        document.getElementById("kpi-caixa-gerado").textContent = `R$ ${formatarValor(kpis.caixaGerado)}`;
        document.getElementById("kpi-ticket-medio").textContent = `R$ ${formatarValor(kpis.ticketMedio)}`;
        document.getElementById("kpi-ponto-equilibrio").textContent = `R$ ${formatarValor(kpis.pontoEquilibrio)}`;

        // Hide/Show Future KPIs based on date filter
        const isHistory = filtros && filtros.dataFim && new Date(filtros.dataFim) < new Date(new Date().setHours(0, 0, 0, 0));

        const cardAReceber = document.getElementById("kpi-contas-a-receber").closest('.col-lg-4');
        const cardAPagar = document.getElementById("kpi-contas-a-pagar").closest('.col-lg-4');
        const chartProjecao = document.getElementById("projectedCashFlowChart").closest('.chart-container').parentElement;

        if (isHistory) {
            cardAReceber.style.display = 'none';
            cardAPagar.style.display = 'none';
            chartProjecao.style.display = 'none';
        } else {
            cardAReceber.style.display = 'block';
            document.getElementById("kpi-contas-a-receber").textContent = `R$ ${formatarValor(kpis.contasAReceber)}`;
            cardAPagar.style.display = 'block';
            document.getElementById("kpi-contas-a-pagar").textContent = `R$ ${formatarValor(kpis.contasAPagar)}`;
            chartProjecao.style.display = 'block';
        }
    }

    function renderDreChart(chartData) {
        const ctx = document.getElementById("dreChart").getContext("2d");
        if (dreChart) dreChart.destroy();
        dreChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'DRE',
                    data: chartData.data,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const elementIndex = elements[0].index;
                        const label = dreChart.data.labels[elementIndex];
                        const value = dreChart.data.datasets[0].data[elementIndex];
                        // Assuming showAlert is defined
                        // alert(`${label}: R$ ${formatarValor(value)}`);
                    }
                }
            }
        });
    }

    function renderDfcChart(chartData) {
        const ctx = document.getElementById("dfcChart").getContext("2d");
        if (dfcChart) dfcChart.destroy();
        dfcChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels.map(dateStr => window.formatDateForDisplay(dateStr)),
                datasets: [
                    {
                        label: 'Entradas',
                        data: chartData.entradas,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                    },
                    {
                        label: 'Saídas',
                        data: chartData.saidas,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: true,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: false }
                }
            }
        });
    }

    function renderProjectedCashFlowChart(chartData) {
        const ctx = document.getElementById("projectedCashFlowChart").getContext("2d");
        if (projectedCashFlowChart) projectedCashFlowChart.destroy();
        projectedCashFlowChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels.map(dateStr => window.formatDateForDisplay(dateStr)),
                datasets: [
                    {
                        label: 'Contas a Receber',
                        data: chartData.aReceber,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    },
                    {
                        label: 'Contas a Pagar',
                        data: chartData.aPagar,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: false }
                },
                scales: {
                    x: { stacked: false },
                    y: { stacked: false }
                }
            }
        });
    }

    function formatarValor(valor) {
        if (typeof valor !== 'number') {
            return '0,00';
        }
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function gerarRelatorio() {
        const kpiLucro = document.getElementById("kpi-lucro-liquido").textContent;
        const kpiCaixa = document.getElementById("kpi-caixa-gerado").textContent;
        const kpiTicket = document.getElementById("kpi-ticket-medio").textContent;
        const kpiPontoEquilibrio = document.getElementById("kpi-ponto-equilibrio").textContent;
        const kpiContasAReceber = document.getElementById("kpi-contas-a-receber").textContent;
        const kpiContasAPagar = document.getElementById("kpi-contas-a-pagar").textContent;

        let dataInicioStr = document.getElementById("filtro-data-inicio").value;
        let dataFimStr = document.getElementById("filtro-data-fim").value;

        const dataInicioFormatada = window.formatDateForDisplay(dataInicioStr) || 'N/A';
        const dataFimFormatada = window.formatDateForDisplay(dataFimStr) || 'N/A';

        const totalServicos = currentFilteredServices.length;
        const servicosConcluidos = currentFilteredServices.filter(s => s.status === 'Concluído').length;
        const servicosPagos = currentFilteredServices.filter(s => s.statusPagamento === 'Pago').length;

        let relatorio = `
## Relatório de Análise de Desempenho

**Período de Análise:** de ${dataInicioFormatada} a ${dataFimFormatada}
**Total de Serviços no Período:** ${totalServicos}

---

### Indicadores Chave de Performance (KPIs)

- **Lucro Líquido (Competência):** ${kpiLucro}
- **Caixa Gerado no Período:** ${kpiCaixa}
- **Ticket Médio por Serviço:** ${kpiTicket}
- **Ponto de Equilíbrio (Estimado):** ${kpiPontoEquilibrio}
- **Contas a Receber (Próx. 30 dias):** ${kpiContasAReceber}
- **Contas a Pagar (Próx. 30 dias):** ${kpiContasAPagar}

---

### Análise Operacional

- **Serviços Concluídos:** ${servicosConcluidos} de ${totalServicos}
- **Serviços com Pagamento Confirmado:** ${servicosPagos} de ${totalServicos}

---
        `;

        document.getElementById('relatorio-texto').textContent = relatorio.trim();
        document.getElementById('relatorio-container').style.display = 'block';
    }

    // --- EVENT LISTENERS ---
    document.getElementById('btn-gerar-relatorio').addEventListener('click', gerarRelatorio);
    document.getElementById('btn-fechar-relatorio').addEventListener('click', () => {
        document.getElementById('relatorio-container').style.display = 'none';
    });
    document.getElementById('btn-aplicar-filtros').addEventListener('click', (e) => {
        e.preventDefault();
        atualizarDashboardCompleto();
    });

    document.getElementById('btn-limpar-filtros').addEventListener('click', (e) => {
        e.preventDefault();
        limparFiltros();
    });

    document.getElementById('filtro-data-inicio').addEventListener('change', atualizarDashboardCompleto);
    document.getElementById('filtro-data-fim').addEventListener('change', atualizarDashboardCompleto);
    document.getElementById('filtro-tipo-data').addEventListener('change', atualizarDashboardCompleto);
    document.getElementById('filtro-mecanico').addEventListener('change', atualizarDashboardCompleto);
    document.getElementById('filtro-pagamento').addEventListener('change', atualizarDashboardCompleto);
    document.querySelectorAll('input[name="groupBy"]').forEach(radio => {
        radio.addEventListener('change', atualizarDashboardCompleto);
    });

    document.getElementById('toggle-top-chart-mode').addEventListener('click', () => {
        if (topChartMode === 'itens') {
            topChartMode = 'clientes';
        } else if (topChartMode === 'clientes') {
            topChartMode = 'mecanicos';
        } else {
            topChartMode = 'itens';
        }
        renderTop10Chart(currentFilteredServices);
    });

    document.querySelectorAll('.collapse-chart-btn').forEach(button => {
        button.addEventListener('click', function () {
            const targetCanvasId = this.dataset.targetCanvas;
            const canvas = document.getElementById(targetCanvasId);
            const icon = this.querySelector('i');
            if (canvas.style.display === 'none') {
                canvas.style.display = 'block';
                icon.classList.remove('bi-chevron-down');
                icon.classList.add('bi-chevron-up');
            } else {
                canvas.style.display = 'none';
                icon.classList.remove('bi-chevron-up');
                icon.classList.add('bi-chevron-down');
            }
        });
    });

    // Initial load
    atualizarDashboardCompleto();
});