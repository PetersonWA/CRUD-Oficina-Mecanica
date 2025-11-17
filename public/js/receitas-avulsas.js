document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-receita');
    const elements = {
        planoContas: document.getElementById('planoContas-receita'),
        metodoPagamento: document.getElementById('metodoPagamento-receita'),
        valor: document.getElementById('valor-receita'),
        descricao: document.getElementById('descricao-receita'),
        dataCompetencia: document.getElementById('dataCompetencia-receita'),
        dataVencimento: document.getElementById('dataVencimento-receita'),
        dataLiquidacao: document.getElementById('dataLiquidacao-receita'),
        parcelasContainer: document.getElementById('parcelas-container'),
        numeroParcelas: document.getElementById('numeroParcelas-receita'),
    };

    const filtroDataInicio = document.getElementById('data-inicio-filtro');
    const filtroDataFim = document.getElementById('data-fim-filtro');
    const filtroCategoria = document.getElementById('categoria-filtro');
    const btnFiltrar = document.getElementById('btn-filtrar-receitas');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const btnGerarRelatorio = document.getElementById('btn-gerar-relatorio-receitas');
    const receitasTableBody = document.getElementById('receitas-table-body');
    const itemCountSpan = document.getElementById('item-count');
    const paginationControls = document.getElementById('pagination-controls');

    let currentReceitas = [];
    let accountsMap = new Map();
    let config = {};
    const REVENUE_PARENT_ID = 1;

    let currentPage = 1;
    const ITENS_PER_PAGE = 10;

    function getRootParentId(accountId) {
        if (!accountsMap.has(accountId)) return null;
        let current = accountsMap.get(accountId);
        while (current.id_pai !== null) {
            if (!accountsMap.has(current.id_pai)) return null;
            current = accountsMap.get(current.id_pai);
        }
        return current.id;
    }

    async function inicializar() {
        try {
            const [planoContas, appConfig] = await Promise.all([
                window.api.getPlanoContas(),
                window.api.getAllConfigs()
            ]);
            
            config = appConfig;
            accountsMap = new Map(planoContas.map(acc => [acc.id, acc]));
            
            popularPlanoContasDropdown(planoContas);
            configurarParcelas();
            await carregarReceitas();
            vincularEventos();
            atualizarValorParcela();

        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
            showAlert('Falha ao carregar dados da página.', 'danger');
        }
    }

    function configurarParcelas() {
        const maxParcelas = parseInt(config.maxParcelas, 10) || 12;
        elements.numeroParcelas.innerHTML = "";
        for (let i = 1; i <= maxParcelas; i++) {
            const option = document.createElement("option");
            option.value = i;
            option.textContent = `${i}x`;
            elements.numeroParcelas.appendChild(option);
        }
    }

    function vincularEventos() {
        elements.metodoPagamento.addEventListener('change', handleMudancaPagamento);
        elements.valor.addEventListener('input', () => atualizarValorParcela());
        form.addEventListener('submit', handleFormSubmit);
        btnFiltrar.addEventListener('click', () => {
            const filtros = {
                dataInicio: filtroDataInicio.value,
                dataFim: filtroDataFim.value,
                categoriaId: filtroCategoria.value,
            };
            carregarReceitas(filtros);
        });
        btnLimparFiltros.addEventListener('click', () => {
            filtroDataInicio.value = '';
            filtroDataFim.value = '';
            filtroCategoria.value = '';
            carregarReceitas({});
        });
        btnGerarRelatorio.addEventListener('click', handleGerarRelatorio);
    }

    function handleMudancaPagamento() {
        elements.parcelasContainer.style.display =
            elements.metodoPagamento.value === 'Cartão de Crédito'
                ? 'block'
                : 'none';
        atualizarValorParcela();
    }

    function atualizarValorParcela() {
        const total = parseFloat(elements.valor.value) || 0;
        const {
            jurosInicial = 0,
            acrescimoParcela = 0,
            parcelasSemJuros = 0,
            maxParcelas = 12,
        } = config;

        if (elements.metodoPagamento.value !== "Cartão de Crédito") {
            for (let i = 1; i <= maxParcelas; i++) {
                const opt = elements.numeroParcelas.querySelector(`option[value="${i}"]`);
                if (opt) opt.textContent = `${i}x`;
            }
            return;
        }

        for (let i = 1; i <= maxParcelas; i++) {
            const opt = elements.numeroParcelas.querySelector(`option[value="${i}"]`);
            if (opt) {
                let valorParcela;
                let totalComJuros;
                if (i <= parcelasSemJuros) {
                    valorParcela = total / i;
                    totalComJuros = total;
                    opt.textContent = `${i}x de ${formatarValor(valorParcela)} (s/ juros)`;
                } else {
                    const taxa = (parseFloat(jurosInicial) + (i - 1 - parseFloat(parcelasSemJuros)) * parseFloat(acrescimoParcela)) / 100;
                    valorParcela = taxa > 0
                        ? (total * (taxa * Math.pow(1 + taxa, i))) / (Math.pow(1 + taxa, i) - 1)
                        : total / i;
                    totalComJuros = valorParcela * i;
                    opt.textContent = `${i}x de ${formatarValor(valorParcela)}`;
                }
                opt.dataset.totalComJuros = totalComJuros.toFixed(2);
            }
        }
    }

    function popularPlanoContasDropdown(planoContas) {
        elements.planoContas.innerHTML = '<option value="">Selecione o tipo de receita...</option>';
        const contasDeReceita = planoContas.filter(conta => {
            const rootId = getRootParentId(conta.id);
            return rootId === REVENUE_PARENT_ID && conta.id !== REVENUE_PARENT_ID;
        });

        contasDeReceita.forEach(conta => {
            const option = document.createElement('option');
            option.value = conta.id;
            option.textContent = conta.nome_conta;
            elements.planoContas.appendChild(option);
        });
    }

    function renderTableRows(items) {
        receitasTableBody.innerHTML = '';
        if (items.length === 0) {
            receitasTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum lançamento encontrado.</td></tr>';
            return;
        }
        items.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.nome_conta}</td>
                <td>${r.descricao_problema || ''}</td>
                <td>${formatarValor(r.valor_total)}</td>
                <td>${r.data_competencia ? new Date(r.data_competencia + 'T00:00:00').toLocaleDateString() : ''}</td>
                <td>${r.data_conclusao ? new Date(r.data_conclusao + 'T00:00:00').toLocaleDateString() : 'Pendente'}</td>
                <td>
                    <button class="btn btn-danger btn-sm btn-excluir-receita" data-id="${r.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            receitasTableBody.appendChild(tr);
        });
        document.querySelectorAll('.btn-excluir-receita').forEach(btn => {
            btn.addEventListener('click', handleExcluirReceita);
        });
    }

    function setupPagination(items, wrapper) {
        wrapper.innerHTML = '';
        const pageCount = Math.ceil(items.length / ITENS_PER_PAGE);

        for (let i = 1; i <= pageCount; i++) {
            const li = document.createElement('li');
            li.classList.add('page-item');
            if (i === currentPage) {
                li.classList.add('active');
            }
            const a = document.createElement('a');
            a.classList.add('page-link');
            a.href = '#';
            a.innerText = i;
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                displayPage(items);
                
                document.querySelectorAll('#pagination-controls .page-item').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
            });

            li.appendChild(a);
            wrapper.appendChild(li);
        }
    }

    function displayPage(items) {
        const startIndex = (currentPage - 1) * ITENS_PER_PAGE;
        const endIndex = startIndex + ITENS_PER_PAGE;
        const paginatedItems = items.slice(startIndex, endIndex);
        renderTableRows(paginatedItems);
    }

    async function carregarReceitas(filtros = {}) {
        try {
            const receitas = await window.api.getReceitasAvulsas(filtros);
            currentReceitas = receitas;
            currentPage = 1;

            displayPage(currentReceitas);
            setupPagination(currentReceitas, paginationControls);
            itemCountSpan.innerText = `${currentReceitas.length} itens`;

        } catch (error) {
            console.error("Erro ao carregar receitas:", error);
            showAlert('Falha ao carregar histórico de receitas.', 'danger');
            receitasTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Falha ao carregar dados.</td></tr>';
            paginationControls.innerHTML = '';
            itemCountSpan.innerText = '0 itens';
        }
    }

    async function handleExcluirReceita(e) {
        const id = e.currentTarget.dataset.id;
        if (confirm('Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.')) {
            try {
                const result = await window.api.deleteReceitaAvulsa(id);
                if (result.success) {
                    showAlert('Lançamento excluído com sucesso.', 'info');
                    const filtrosAtuais = {
                        dataInicio: filtroDataInicio.value,
                        dataFim: filtroDataFim.value,
                        categoriaId: filtroCategoria.value,
                    };
                    await carregarReceitas(filtrosAtuais);
                } else {
                    throw new Error(result.error || 'Erro desconhecido ao excluir.');
                }
            } catch (error) {
                console.error("Erro ao excluir receita:", error);
                showAlert('Falha ao excluir o lançamento.', 'danger');
            }
        }
    }

    function handleGerarRelatorio() {
        if (currentReceitas.length === 0) {
            showAlert('Nenhum dado para gerar relatório.', 'warning');
            return;
        }

        const dataInicio = filtroDataInicio.value;
        const dataFim = filtroDataFim.value;
        const categoriaTexto = filtroCategoria.options[filtroCategoria.selectedIndex].text;

        let period = `Categoria: ${categoriaTexto}`;
        if (dataInicio && dataFim) {
            period += ` de ${new Date(dataInicio + 'T00:00:00').toLocaleDateString()} a ${new Date(dataFim + 'T00:00:00').toLocaleDateString()}`;
        } else if (dataInicio) {
            period += ` a partir de ${new Date(dataInicio + 'T00:00:00').toLocaleDateString()}`;
        } else if (dataFim) {
            period += ` até ${new Date(dataFim + 'T00:00:00').toLocaleDateString()}`;
        }

        const total = currentReceitas.reduce((sum, item) => sum + item.valor_total, 0);

        const reportData = {
            title: 'Relatório de Receitas Avulsas',
            period: period,
            headers: ['Conta', 'Descrição', 'Valor', 'Data Competência', 'Data Recebimento'],
            rows: currentReceitas.map(r => [
                r.nome_conta,
                r.descricao_problema || '',
                formatarValor(r.valor_total),
                r.data_competencia ? new Date(r.data_competencia + 'T00:00:00').toLocaleDateString() : '',
                r.data_conclusao ? new Date(r.data_conclusao + 'T00:00:00').toLocaleDateString() : 'Pendente'
            ]),
            total: formatarValor(total)
        };

        window.api.printRelatorioFinanceiro(reportData);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const metodoPagamento = elements.metodoPagamento.value;
        const numeroParcelas = metodoPagamento === 'Cartão de Crédito' ? parseInt(elements.numeroParcelas.value) : 1;
        
        const selectedOption = elements.numeroParcelas.options[elements.numeroParcelas.selectedIndex];
        const totalComJuros = metodoPagamento === 'Cartão de Crédito' ? parseFloat(selectedOption.dataset.totalComJuros) : parseFloat(elements.valor.value);

        const receita = {
            id_plano_contas: parseInt(elements.planoContas.value),
            valor_total: totalComJuros, // Envia o valor com juros para o backend
            descricao_problema: elements.descricao.value,
            data_competencia: elements.dataCompetencia.value,
            data_vencimento: elements.dataVencimento.value,
            data_entrada: elements.dataCompetencia.value, 
            data_conclusao: metodoPagamento !== 'Cartão de Crédito' ? (elements.dataLiquidacao.value || null) : null,
            status: 'Concluído',
            metodo_pagamento: metodoPagamento,
            numero_parcelas: numeroParcelas,
        };

        if (!receita.id_plano_contas || !elements.valor.value || !receita.descricao_problema || !receita.data_competencia) {
            showAlert('Por favor, preencha o tipo, valor, descrição e data de competência.', 'warning');
            return;
        }

        try {
            const result = await window.api.addReceitaAvulsa(receita);
            if (result.success) {
                showAlert('✅ Receita salva com sucesso!', 'success');
                form.reset();
                handleMudancaPagamento();
                await carregarReceitas();
            } else {
                throw new Error(result.error || 'Erro desconhecido ao salvar.');
            }
        } catch (error) {
            console.error("Erro ao salvar receita avulsa:", error);
            showAlert('Falha ao salvar a receita.', 'danger');
        }
    }

    inicializar();
});