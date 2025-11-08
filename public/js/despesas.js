document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('despesa-form');
    if (!form) return;

    const elements = {
        descricao: document.getElementById('descricao'),
        valor: document.getElementById('valor'),
        dataCompetencia: document.getElementById('dataCompetencia'),
        dataVencimento: document.getElementById('dataVencimento'),
        dataLiquidacao: document.getElementById('dataLiquidacao'),
        planoContas: document.getElementById('planoContas'),
        metodo: document.getElementById('metodo'),
        anotacao: document.getElementById('anotacao'),
    };

    async function inicializar() {
        try {
            const planoContas = await window.api.getPlanoContas();
            popularPlanoContasDropdown(planoContas);

            const despesaPreenchida = sessionStorage.getItem('despesaPreenchida');
            if (despesaPreenchida) {
                try {
                    const data = JSON.parse(despesaPreenchida);
                    elements.valor.value = data.valor;
                    elements.anotacao.value = data.anotacao;
                    elements.planoContas.value = data.id_plano_contas;

                    // Limpa para não preencher novamente
                    sessionStorage.removeItem('despesaPreenchida');
                } catch (e) {
                    console.error("Erro ao processar dados de despesa do sessionStorage:", e);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar plano de contas:", error);
            showAlert('Falha ao carregar plano de contas.', 'danger');
        }
    }

    function popularPlanoContasDropdown(planoContas) {
        elements.planoContas.innerHTML = '<option value="">Selecione...</option>';
        planoContas.forEach(conta => {
            if (conta.tipo !== 'Receita') { // Only show Custo and Despesa
                const option = document.createElement('option');
                option.value = conta.id;
                option.textContent = conta.nome_conta;
                elements.planoContas.appendChild(option);
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const despesa = {
            descricao: elements.descricao.value,
            valor: parseFloat(elements.valor.value),
            data_competencia: elements.dataCompetencia.value,
            data_vencimento: elements.dataVencimento.value,
            data_liquidacao: elements.dataLiquidacao.value,
            id_plano_contas: parseInt(elements.planoContas.value),
            metodo: elements.metodo.value,
            anotacao: elements.anotacao.value,
        };

        if (!despesa.descricao || !despesa.valor || !despesa.data_competencia || !despesa.id_plano_contas) {
            showAlert('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        try {
            const result = await window.api.addDespesa(despesa);
            if (result.success) {
                showAlert('✅ Despesa salva com sucesso!', 'success');
                form.reset();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Erro ao salvar despesa:", error);
            showAlert('Falha ao salvar a despesa.', 'danger');
        }
    });

    inicializar();
});