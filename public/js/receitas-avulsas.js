document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-receita');
    if (!form) return;

    const elements = {
        planoContas: document.getElementById('planoContas-receita'),
        valor: document.getElementById('valor-receita'),
        descricao: document.getElementById('descricao-receita'),
        dataCompetencia: document.getElementById('dataCompetencia-receita'),
        dataVencimento: document.getElementById('dataVencimento-receita'),
        dataLiquidacao: document.getElementById('dataLiquidacao-receita'),
    };

    let accountsMap = new Map();
    const REVENUE_PARENT_ID = 1; // ID da categoria "RECEITAS OPERACIONAIS"

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
            popularPlanoContasDropdown(planoContas);
        } catch (error) {
            console.error("Erro ao carregar plano de contas:", error);
            showAlert('Falha ao carregar tipos de receita.', 'danger');
        }
    }

    function popularPlanoContasDropdown(planoContas) {
        elements.planoContas.innerHTML = '<option value="">Selecione o tipo de receita...</option>';
        planoContas.forEach(conta => {
            const rootId = getRootParentId(conta.id);
            if (rootId === REVENUE_PARENT_ID && conta.id !== REVENUE_PARENT_ID) {
                const option = document.createElement('option');
                option.value = conta.id;
                option.textContent = conta.nome_conta;
                elements.planoContas.appendChild(option);
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const receita = {
            id_plano_contas: parseInt(elements.planoContas.value),
            valor_total: parseFloat(elements.valor.value),
            descricao_problema: elements.descricao.value,
            data_competencia: elements.dataCompetencia.value,
            data_vencimento: elements.dataVencimento.value,
            // Para uma receita avulsa, a data de entrada e conclusão podem ser a data de competência
            data_entrada: elements.dataCompetencia.value, 
            data_conclusao: elements.dataLiquidacao.value || null,
            // Status padrão para uma receita avulsa
            status: 'Concluído',
            status_pagamento: elements.dataLiquidacao.value ? 'Pago' : 'Pendente',
        };

        if (!receita.id_plano_contas || !receita.valor_total || !receita.descricao_problema || !receita.data_competencia) {
            showAlert('Por favor, preencha o tipo, valor, descrição e data de competência.', 'warning');
            return;
        }

        try {
            // Usaremos uma nova função de API para adicionar a receita
            const result = await window.api.addReceitaAvulsa(receita);
            if (result.success) {
                showAlert('✅ Receita salva com sucesso!', 'success');
                form.reset();
            } else {
                throw new Error(result.error || 'Erro desconhecido ao salvar.');
            }
        } catch (error) {
            console.error("Erro ao salvar receita avulsa:", error);
            showAlert('Falha ao salvar a receita.', 'danger');
        }
    });

    inicializar();
});
