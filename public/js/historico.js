document.addEventListener('DOMContentLoaded', () => {
    // Chart instances
    let dreChart = null;
    let dfcChart = null;
    let projectedCashFlowChart = null;
    let topChart = null;

    let allServices = [];
    let currentFilteredServices = [];
    let topChartMode = 'itens'; // 'itens', 'clientes', 'mecanicos'

    // Main function to load data and initialize dashboard
    async function carregarDados() {
        const spinner = document.getElementById('loading-spinner');
        spinner.style.display = 'block'; // Show spinner

        const filtros = {
            dataInicio: document.getElementById("filtro-data-inicio").value,
            dataFim: document.getElementById("filtro-data-fim").value,
            groupBy: document.querySelector('input[name="groupBy"]:checked').value || 'month',
        };

        try {
            // Fetch both dashboard data and raw services data in parallel
            const [dashboardData, servicesData] = await Promise.all([
                window.api.getDadosDashboard(filtros),
                window.api.getServicos() // Fetches all services for client-side filtering
            ]);

            allServices = servicesData;

            atualizarDashboard(dashboardData.kpis, dashboardData.charts);
            aplicarFiltros(); // Apply initial filters (which might be none)

        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
            showAlert("Falha ao carregar dados do dashboard. Verifique o console.", "danger");
        } finally {
            spinner.style.display = 'none'; // Hide spinner
        }
    }

    function aplicarFiltros() {
        const filtroCliente = document.getElementById('filtro-cliente').value.toLowerCase();
        const filtroVeiculo = document.getElementById('filtro-veiculo').value.toLowerCase();
        const filtroStatus = document.getElementById('filtro-status').value;
        const filtroDataInicio = document.getElementById('filtro-data-inicio').value;
        const filtroDataFim = document.getElementById('filtro-data-fim').value;

        currentFilteredServices = allServices.filter(service => {
            const matchCliente = !filtroCliente || service.clienteNome.toLowerCase().includes(filtroCliente);
            const matchVeiculo = !filtroVeiculo || service.placaVeiculo.toLowerCase().includes(filtroVeiculo);
            const matchStatus = !filtroStatus || service.status === filtroStatus;
            
            const dataServico = new Date(service.dataEntrada + 'T00:00:00');
            const matchDataInicio = !filtroDataInicio || dataServico >= new Date(filtroDataInicio + 'T00:00:00');
            const matchDataFim = !filtroDataFim || dataServico <= new Date(filtroDataFim + 'T00:00:00');

            return matchCliente && matchVeiculo && matchStatus && matchDataInicio && matchDataFim;
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
        aplicarFiltros();
    }

    window.aplicarFiltros = aplicarFiltros;
    window.limparFiltros = limparFiltros;

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
                backgroundColor: 'rgba(54, 162, 235, 0.7)', // Azul fraco
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

    document.querySelector('.collapse-chart-btn[data-target-canvas="topItensChart"]').addEventListener('click', function() {
        const canvas = document.getElementById('topItensChart');
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

    function atualizarDashboard(kpis, charts) {
        atualizarKpis(kpis);
        renderDreChart(charts.dreChart);
        renderDfcChart(charts.dfcChart);
        renderProjectedCashFlowChart(charts.projectedCashFlowChart);
    }

    function atualizarKpis(kpis) {
        document.getElementById("kpi-lucro-liquido").textContent = `R$ ${formatarValor(kpis.lucroLiquido)}`;
        document.getElementById("kpi-caixa-gerado").textContent = `R$ ${formatarValor(kpis.caixaGerado)}`;
        document.getElementById("kpi-ticket-medio").textContent = `R$ ${formatarValor(kpis.ticketMedio)}`;
        document.getElementById("kpi-ponto-equilibrio").textContent = `R$ ${formatarValor(kpis.pontoEquilibrio)}`;
        document.getElementById("kpi-contas-a-receber").textContent = `R$ ${formatarValor(kpis.contasAReceber)}`;
        document.getElementById("kpi-contas-a-pagar").textContent = `R$ ${formatarValor(kpis.contasAPagar)}`;
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
                    title: { display: true, text: 'Demonstrativo de Resultado do Exercício (DRE)' }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const elementIndex = elements[0].index;
                        const label = dreChart.data.labels[elementIndex];
                        const value = dreChart.data.datasets[0].data[elementIndex];
                        alert(`${label}: R$ ${formatarValor(value)}`);
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
                labels: chartData.labels,
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
                    title: { display: true, text: 'Demonstrativo de Fluxo de Caixa (DFC)' }
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
                labels: chartData.labels,
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
                    title: { display: true, text: 'Fluxo de Caixa Projetado (Próximos 30 dias)' }
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true }
                }
            }
        });
    }

    function formatarValor(valor) {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Event Listeners
    document.getElementById('btn-gerar-relatorio').addEventListener('click', carregarDados);
    document.getElementById('filtro-data-inicio').addEventListener('change', carregarDados);
    document.getElementById('filtro-data-fim').addEventListener('change', carregarDados);
    document.querySelectorAll('input[name="groupBy"]').forEach(radio => {
        radio.addEventListener('change', carregarDados);
    });

    // Initial load
    carregarDados();
});