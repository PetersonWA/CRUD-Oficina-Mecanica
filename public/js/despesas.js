document.addEventListener('DOMContentLoaded', () => {
    const forms = {
        deducoes: document.getElementById('form-deducoes'),
        custos: document.getElementById('form-custos'),
        despesas: document.getElementById('form-despesas'),
    };

    // Mapeia os IDs dos pais das categorias principais
    const CATEGORY_PARENTS = {
        deducoes: 2,
        custos: 3,
        despesas: 4,
    };

    let accountsMap = new Map();
    let accountsHierarchy = new Map();

    // Função para encontrar a raiz de uma conta (2, 3 ou 4)
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
            const planoContas = await window.api.getPlanoContas();
            accountsMap = new Map(planoContas.map(acc => [acc.id, acc]));
            
            // Classifica cada conta em sua categoria raiz
            planoContas.forEach(conta => {
                const rootId = getRootParentId(conta.id);
                if (!accountsHierarchy.has(rootId)) {
                    accountsHierarchy.set(rootId, []);
                }
                accountsHierarchy.get(rootId).push(conta);
            });

            popularPlanoContasDropdowns();
            verificarDespesaPreenchida();

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
                    // Não adiciona a conta pai principal, apenas as filhas
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
                const formId = 'custos'; // CMV sempre vai para custos

                document.getElementById(`valor-${formId}`).value = data.valor;
                document.getElementById(`anotacao-${formId}`).value = data.anotacao;
                document.getElementById(`planoContas-${formId}`).value = data.id_plano_contas;

                // Abre o accordion correspondente
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

    function handleFormSubmit(e, formId) {
        e.preventDefault();

        const despesa = {
            valor: parseFloat(document.getElementById(`valor-${formId}`).value),
            anotacao: document.getElementById(`anotacao-${formId}`).value,
            data_competencia: document.getElementById(`dataCompetencia-${formId}`).value,
            data_vencimento: document.getElementById(`dataVencimento-${formId}`).value,
            data_liquidacao: document.getElementById(`dataLiquidacao-${formId}`).value,
            id_plano_contas: parseInt(document.getElementById(`planoContas-${formId}`).value),
            metodo: 'N/A', // Campo não existe mais no novo form, pode ser ajustado se necessário
        };

        if (!despesa.id_plano_contas || !despesa.valor || !despesa.data_competencia) {
            showAlert('Por favor, preencha o tipo, valor e data de competência.', 'warning');
            return;
        }

        salvarDespesa(despesa, formId);
    }

    async function salvarDespesa(despesa, formId) {
        try {
            const result = await window.api.addDespesa(despesa);
            if (result.success) {
                showAlert('✅ Lançamento salvo com sucesso!', 'success');
                forms[formId].reset();
            } else {
                throw new Error(result.error || 'Erro desconhecido ao salvar.');
            }
        } catch (error) {
            console.error(`Erro ao salvar despesa (${formId}):`, error);
            showAlert('Falha ao salvar o lançamento.', 'danger');
        }
    }

    // Adiciona os listeners para cada formulário
    for (const formId in forms) {
        if (forms[formId]) {
            forms[formId].addEventListener('submit', (e) => handleFormSubmit(e, formId));
        }
    }

    inicializar();
});