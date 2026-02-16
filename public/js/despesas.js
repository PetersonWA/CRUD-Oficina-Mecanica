// Definições de função no escopo global para melhor testabilidade
let accountsMap = new Map();
let accountsHierarchy = new Map();
let currentDespesas = [];
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

function _renderTableRowsSeguro(items, tableBody, formatarValor, handleExcluirDespesa, handleEditarDespesa) {
    tableBody.innerHTML = '';
    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum lançamento encontrado.</td></tr>';
        return;
    }
    items.forEach(d => {
        const tr = tableBody.insertRow();
        tr.insertCell(0).textContent = d.nome_conta;
        tr.insertCell(1).textContent = d.anotacao || '';
        tr.insertCell(2).textContent = formatarValor(d.valor);
        tr.insertCell(3).textContent = d.data_competencia ? new Date(d.data_competencia + 'T00:00:00').toLocaleDateString() : '';
        tr.insertCell(4).textContent = d.data_liquidacao ? new Date(d.data_liquidacao + 'T00:00:00').toLocaleDateString() : 'Pendente';
        const actionsCell = tr.insertCell(5);
        actionsCell.className = "d-flex gap-2";
        actionsCell.innerHTML = `
            <button class="btn btn-warning btn-sm btn-editar-despesa" data-id="${d.id}" title="Editar / Dar Baixa">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-danger btn-sm btn-excluir-despesa" data-id="${d.id}" title="Excluir">
                <i class="bi bi-trash"></i>
            </button>
        `;
    });
    document.querySelectorAll('.btn-excluir-despesa').forEach(btn => {
        btn.addEventListener('click', handleExcluirDespesa);
    });
    document.querySelectorAll('.btn-editar-despesa').forEach(btn => {
        btn.addEventListener('click', handleEditarDespesa);
    });
}

if (typeof window.testHooks === 'undefined') {
    window.testHooks = {};
}
window.testHooks.renderizarDespesas = _renderTableRowsSeguro;


document.addEventListener('DOMContentLoaded', () => {
    const forms = {
        deducoes: document.getElementById('form-deducoes'),
        custos: document.getElementById('form-custos'),
        despesas: document.getElementById('form-despesas'),
    };
    if (!forms.deducoes) return; // Sai se não estiver na página certa

    const filtroDataInicio = document.getElementById('data-inicio-filtro');
    const filtroDataFim = document.getElementById('data-fim-filtro');
    const filtroCategoria = document.getElementById('categoria-filtro');
    const btnFiltrar = document.getElementById('btn-filtrar-despesas');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const btnGerarRelatorio = document.getElementById('btn-gerar-relatorio-despesas');
    const despesasTableBody = document.getElementById('despesas-table-body');

    const CATEGORY_PARENTS = {
        deducoes: 2,
        custos: 3,
        despesas: 4,
    };

    async function inicializar() {
        try {
            const planoContas = await window.api.getPlanoContas();
            accountsMap = new Map(planoContas.map(acc => [acc.id, acc]));

            planoContas.forEach(conta => {
                const rootId = getRootParentId(conta.id);
                if (!accountsHierarchy.has(rootId)) {
                    accountsHierarchy.set(rootId, []);
                }
                accountsHierarchy.get(rootId).push(conta);
            });

            popularPlanoContasDropdowns();
            verificarDespesaPreenchida();
            await carregarDespesas();

            for (const formId in forms) {
                const checkRecorrencia = document.getElementById(`repetir-${formId}-check`);
                const opcoesRecorrencia = document.getElementById(`opcoes-recorrencia-${formId}`);
                if (checkRecorrencia && opcoesRecorrencia) {
                    checkRecorrencia.addEventListener('change', () => {
                        opcoesRecorrencia.style.display = checkRecorrencia.checked ? 'block' : 'none';
                    });
                }
            }

        } catch (error) {
            console.error("Erro ao carregar plano de contas:", error);
            showAlert('Falha ao carregar dados iniciais.', 'danger');
        }
    }

    function popularPlanoContasDropdowns() {
        for (const category in CATEGORY_PARENTS) {
            const parentId = CATEGORY_PARENTS[category];
            const select = document.getElementById(`planoContas-${category}`);
            if (select) {
                select.innerHTML = '<option value="">Selecione o tipo...</option>';
                const contasDaCategoria = accountsHierarchy.get(parentId) || [];

                contasDaCategoria.forEach(conta => {
                    if (conta.id !== parentId) {
                        const option = document.createElement('option');
                        option.value = conta.id;
                        option.textContent = conta.nome_conta;
                        select.appendChild(option);
                    }
                });
            }
        }
    }

    function verificarDespesaPreenchida() {
        const despesaPreenchida = sessionStorage.getItem('despesaPreenchida');
        if (despesaPreenchida) {
            try {
                const data = JSON.parse(despesaPreenchida);
                const formId = 'custos';
                document.getElementById(`valor-${formId}`).value = data.valor;
                document.getElementById(`anotacao-${formId}`).value = data.anotacao;
                document.getElementById(`planoContas-${formId}`).value = data.id_plano_contas;
                const collapseElement = document.getElementById('collapse-custos');
                if (collapseElement) {
                    new bootstrap.Collapse(collapseElement).show();
                }
                showAlert('Preencha as datas e salve o custo da peça.', 'info');
                sessionStorage.removeItem('despesaPreenchida');
            } catch (e) {
                console.error("Erro ao processar dados de despesa do sessionStorage:", e);
            }
        }
    }

    async function handleFormSubmit(e, formId) {
        e.preventDefault();
        const checkRecorrencia = document.getElementById(`repetir-${formId}-check`);
        const isRecurring = checkRecorrencia ? checkRecorrencia.checked : false;

        const baseDespesa = {
            valor: parseFloat(document.getElementById(`valor-${formId}`).value),
            anotacao: document.getElementById(`anotacao-${formId}`).value,
            data_competencia: document.getElementById(`dataCompetencia-${formId}`).value,
            data_vencimento: document.getElementById(`dataVencimento-${formId}`).value,
            data_liquidacao: document.getElementById(`dataLiquidacao-${formId}`).value,
            id_plano_contas: parseInt(document.getElementById(`planoContas-${formId}`).value),
        };

        if (baseDespesa.data_liquidacao === '') {
            baseDespesa.data_liquidacao = null;
        }

        if (!baseDespesa.id_plano_contas || !baseDespesa.valor || !baseDespesa.data_competencia) {
            showAlert('Por favor, preencha o tipo, valor e data de competência.', 'warning');
            return;
        }

        if (isRecurring) {
            const numMeses = parseInt(document.getElementById(`numero-meses-${formId}`).value);
            if (numMeses <= 0) {
                showAlert('O número de meses a repetir deve ser maior que zero.', 'warning');
                return;
            }
            const promises = [];
            for (let i = 0; i < numMeses; i++) {
                const despesaMensal = { ...baseDespesa };
                const dataCompetencia = new Date(baseDespesa.data_competencia + 'T00:00:00');
                dataCompetencia.setMonth(dataCompetencia.getMonth() + i);
                despesaMensal.data_competencia = dataCompetencia.toISOString().split('T')[0];
                if (baseDespesa.data_vencimento) {
                    const dataVencimento = new Date(baseDespesa.data_vencimento + 'T00:00:00');
                    dataVencimento.setMonth(dataVencimento.getMonth() + i);
                    despesaMensal.data_vencimento = dataVencimento.toISOString().split('T')[0];
                }
                if (i > 0) {
                    despesaMensal.data_liquidacao = null;
                }
                promises.push(window.api.addDespesa(despesaMensal));
            }
            try {
                const results = await Promise.all(promises);
                const successCount = results.filter(r => r.success).length;
                showAlert(`✅ ${successCount} de ${numMeses} lançamentos recorrentes salvos com sucesso!`, 'success');
                forms[formId].reset();
                checkRecorrencia.checked = false;
                document.getElementById(`opcoes-recorrencia-${formId}`).style.display = 'none';
                await carregarDespesas();
            } catch (error) {
                console.error('Erro ao salvar despesas recorrentes:', error);
                showAlert('Falha ao salvar os lançamentos recorrentes.', 'danger');
            }
        } else {
            await salvarDespesa(baseDespesa, formId);
        }
    }

    async function salvarDespesa(despesa, formId) {
        try {
            const result = await window.api.addDespesa(despesa);
            if (result.success) {
                showAlert('✅ Lançamento salvo com sucesso!', 'success');
                forms[formId].reset();
                await carregarDespesas();
            } else {
                throw new Error(result.error || 'Erro desconhecido ao salvar.');
            }
        } catch (error) {
            console.error(`Erro ao salvar despesa (${formId}):`, error);
            showAlert('Falha ao salvar o lançamento.', 'danger');
        }
    }

    function setupPagination(items, wrapper) {
        wrapper.innerHTML = '';
        const pageCount = Math.ceil(items.length / ITENS_PER_PAGE);
        for (let i = 1; i <= pageCount; i++) {
            const li = document.createElement('li');
            li.classList.add('page-item');
            if (i === currentPage) li.classList.add('active');
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
        _renderTableRowsSeguro(paginatedItems, despesasTableBody, formatarValor, handleExcluirDespesa, handleEditarDespesa);
    }

    async function carregarDespesas(filtros = {}) {
        try {
            const despesas = await window.api.getDespesas(filtros);
            currentDespesas = despesas;
            currentPage = 1;
            displayPage(currentDespesas);
            const paginationWrapper = document.getElementById('pagination-controls');
            setupPagination(currentDespesas, paginationWrapper);
            document.getElementById('item-count').innerText = `${currentDespesas.length} itens`;
        } catch (error) {
            console.error("Erro ao carregar despesas:", error);
            showAlert('Falha ao carregar histórico de despesas.', 'danger');
            despesasTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Falha ao carregar dados.</td></tr>';
            document.getElementById('pagination-controls').innerHTML = '';
        }
    }

    async function handleExcluirDespesa(e) {
        const id = e.currentTarget.dataset.id;
        showConfirm('Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.', async () => {
            try {
                const result = await window.api.deleteDespesa(id);
                if (result.success) {
                    showAlert('Lançamento excluído com sucesso.', 'info');
                    const filtrosAtuais = {
                        dataInicio: filtroDataInicio.value,
                        dataFim: filtroDataFim.value,
                        categoriaId: filtroCategoria.value,
                    };
                    await carregarDespesas(filtrosAtuais);
                } else {
                    throw new Error(result.error || 'Erro desconhecido ao excluir.');
                }
            } catch (error) {
                console.error("Erro ao excluir despesa:", error);
                showAlert('Falha ao excluir o lançamento.', 'danger');
            }
        }, 'Confirmar Exclusão');
    }

    function handleGerarRelatorio() {
        if (currentDespesas.length === 0) {
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
        const total = currentDespesas.reduce((sum, item) => sum + item.valor, 0);
        const reportData = {
            title: 'Relatório de Despesas',
            period: period,
            headers: ['Conta', 'Anotação', 'Valor', 'Data Competência', 'Data Pagamento'],
            rows: currentDespesas.map(d => [
                d.nome_conta,
                d.anotacao || '',
                formatarValor(d.valor),
                d.data_competencia ? new Date(d.data_competencia + 'T00:00:00').toLocaleDateString() : '',
                d.data_liquidacao ? new Date(d.data_liquidacao + 'T00:00:00').toLocaleDateString() : 'Pendente'
            ]),
            total: formatarValor(total)
        };
        window.api.printRelatorioFinanceiro(reportData);
    }

    btnFiltrar.addEventListener('click', () => {
        const filtros = {
            dataInicio: filtroDataInicio.value,
            dataFim: filtroDataFim.value,
            categoriaId: filtroCategoria.value,
        };
        carregarDespesas(filtros);
    });

    btnLimparFiltros.addEventListener('click', () => {
        filtroDataInicio.value = '';
        filtroDataFim.value = '';
        filtroCategoria.value = '';
        carregarDespesas({});
    });

    btnGerarRelatorio.addEventListener('click', handleGerarRelatorio);

    for (const formId in forms) {
        if (forms[formId]) {
            forms[formId].addEventListener('submit', (e) => handleFormSubmit(e, formId));
        }
    }

    const modalEditar = new bootstrap.Modal(document.getElementById('modal-editar-despesa'));
    const formEditar = document.getElementById('form-editar-despesa');
    const selectEditPlanoContas = document.getElementById('edit-planoContas');

    function handleEditarDespesa(e) {
        const id = parseInt(e.currentTarget.dataset.id);
        const despesa = currentDespesas.find(d => d.id === id);

        if (!despesa) {
            showAlert('Despesa não encontrada.', 'danger');
            return;
        }

        document.getElementById('edit-id').value = despesa.id;
        document.getElementById('edit-valor').value = despesa.valor;
        document.getElementById('edit-anotacao').value = despesa.anotacao || '';
        document.getElementById('edit-dataCompetencia').value = despesa.data_competencia;
        document.getElementById('edit-dataVencimento').value = despesa.data_vencimento || '';
        document.getElementById('edit-dataLiquidacao').value = despesa.data_liquidacao || '';

        // Popular o select do modal com TODAS as despesas/custos
        selectEditPlanoContas.innerHTML = '<option value="">Selecione...</option>';
        // Flat list de todas as contas que não são receita
        accountsMap.forEach(conta => {
            // Basicamente pegar tudo que não é Pai (tem children) e que não seja do grupo RECEITAS (Id 1)
            // Como a hierarquia está simples no map, podemos filtrar por tipo.
            if ((conta.tipo === 'Despesa' || conta.tipo === 'Custo') && conta.id_pai !== null) {
                // Verifica se é "folha" (não tem filhos no map de hierarchy - aproximado)
                // Mas o `popularPlanoContasDropdowns` usa lógica de ID pai fixo.
                // Vamos listar todas que são Despesa/Custo.
                const option = document.createElement('option');
                option.value = conta.id;
                option.textContent = conta.nome_conta;
                selectEditPlanoContas.appendChild(option);
            }
        });
        selectEditPlanoContas.value = despesa.id_plano_contas;

        modalEditar.show();
    }

    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const updatedDespesa = {
            id: parseInt(document.getElementById('edit-id').value),
            id_plano_contas: parseInt(selectEditPlanoContas.value),
            valor: parseFloat(document.getElementById('edit-valor').value),
            anotacao: document.getElementById('edit-anotacao').value,
            data_competencia: document.getElementById('edit-dataCompetencia').value,
            data_vencimento: document.getElementById('edit-dataVencimento').value,
            data_liquidacao: document.getElementById('edit-dataLiquidacao').value
        };

        try {
            const result = await window.api.updateDespesa(updatedDespesa);
            if (result.success) {
                showAlert('✅ Despesa atualizada com sucesso!', 'success');
                modalEditar.hide();
                const filtrosAtuais = {
                    dataInicio: filtroDataInicio.value,
                    dataFim: filtroDataFim.value,
                    categoriaId: filtroCategoria.value,
                };
                await carregarDespesas(filtrosAtuais);
            } else {
                throw new Error(result.error || 'Erro ao atualizar.');
            }
        } catch (error) {
            console.error('Erro ao atualizar despesa:', error);
            showAlert('Falha ao atualizar despesa: ' + error.message, 'danger');
        }
    });

    inicializar();
});