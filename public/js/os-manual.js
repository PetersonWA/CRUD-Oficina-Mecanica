document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('os-manual-form');
    if (!form) return;

    // Elementos do DOM
    const elements = {
        clienteNomeManualInput: document.getElementById('cliente-nome-manual'),
        veiculoDescManualInput: document.getElementById('veiculo-desc-manual'),
        problemaRelatadoInput: document.getElementById('problemaRelatado'),
        itensBody: document.getElementById('itens-os-body'),
        descontoInput: document.getElementById('desconto-percentual'),
        totalFinalDisplay: document.getElementById('total-final-os'),
    };

    // Funções globais para botões no HTML
    window.adicionarItem = adicionarItem;
    window.removerItem = removerItem;

    function inicializar() {
        vincularEventos();
        adicionarItem(); // Adiciona a primeira linha de item
    }

    function vincularEventos() {
        form.addEventListener('submit', salvarServico);
        elements.descontoInput.addEventListener('input', calcularTotal);
    }

    function adicionarItem() {
        const row = document.createElement('tr');
        row.className = 'item-row';
        row.innerHTML = `
            <td>
                <select class="form-select form-select-sm" name="tipo">
                    <option value="Peça">Peça</option>
                    <option value="Mão de Obra">Mão de Obra</option>
                </select>
            </td>
            <td><input type="text" class="form-control form-control-sm" name="descricao" placeholder="Descrição do serviço ou peça"></td>
            <td><input type="number" class="form-control form-control-sm" value="1" min="1" name="quantidade"></td>
            <td><input type="text" class="form-control form-control-sm" placeholder="R$ 0,00" name="valor"></td>
            <td><button type="button" class="btn btn-danger btn-sm" onclick="removerItem(this)"><i class="bi bi-trash"></i></button></td>
        `;
        elements.itensBody.appendChild(row);
        // Adiciona ouvintes de evento para a nova linha
        row.querySelector('[name=valor]').addEventListener('input', (e) => {
            maskCurrency(e.target); // Assumindo que maskCurrency está em utils.js ou global
            calcularTotal();
        });
        row.querySelector('[name=quantidade]').addEventListener('input', calcularTotal);
        row.querySelector('[name=descricao]').addEventListener('input', calcularTotal);
    }

    function removerItem(button) {
        button.closest('tr').remove();
        calcularTotal();
    }

    function calcularTotal() {
        let subtotal = 0;
        elements.itensBody.querySelectorAll('.item-row').forEach(row => {
            const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
            const valor = getNumericValue(row.querySelector('[name=valor]').value);
            subtotal += quantidade * valor;
        });
        const descontoPercentual = parseFloat(elements.descontoInput.value) || 0;
        const descontoValor = subtotal * (descontoPercentual / 100);
        const totalFinal = subtotal - descontoValor;

        document.getElementById('subtotal-os').textContent = `R$ ${formatarValor(subtotal)}`;
        document.getElementById('valor-desconto').textContent = `- R$ ${formatarValor(descontoValor)}`;
        elements.totalFinalDisplay.textContent = `R$ ${formatarValor(totalFinal)}`;
    }

    async function salvarServico(e) {
        e.preventDefault();

        const totalFinal = getNumericValue(elements.totalFinalDisplay.textContent);
        if (totalFinal <= 0) {
            return showAlert('O valor total do serviço deve ser maior que zero.', 'warning');
        }

        const itens = [];
        elements.itensBody.querySelectorAll('.item-row').forEach(row => {
            const descricao = row.querySelector('[name=descricao]').value.trim();
            const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
            const valor_unitario = getNumericValue(row.querySelector('[name=valor]').value);
            if (descricao && quantidade > 0 && valor_unitario > 0) {
                const tipo = row.querySelector('[name=tipo]').value;
                itens.push({ descricao, tipo: tipo, quantidade, valor_unitario });
            }
        });

        if (itens.length === 0) {
            return showAlert('Adicione pelo menos um item válido com descrição e valor.', 'warning');
        }

        const novoServico = {
            cliente_nome_manual: elements.clienteNomeManualInput.value,
            veiculo_desc_manual: elements.veiculoDescManualInput.value,
            data: getLocalDateAsString(new Date()),
            problema_relatado: elements.problemaRelatadoInput.value || 'Serviço rápido',
            status: 'Concluído', // OS Manual já entra como concluída
            status_pagamento: 'Pago', // E paga
            valor_total: totalFinal,
            itens: itens,
            pagamento_inicial: {
                forma: 'Dinheiro', // Forma de pagamento padrão para OS Manual
                valor: totalFinal,
                data: getLocalDateAsString(new Date())
            }
        };

        if (!novoServico.cliente_nome_manual || !novoServico.veiculo_desc_manual) {
            return showAlert('Preencha o nome do cliente e a descrição do veículo.', 'warning');
        }

        try {
            const result = await window.api.addServico(novoServico);
            if (result.success) {
                showAlert('✅ OS Manual salva com sucesso! A impressão será iniciada.', 'success');
                window.api.printOrcamento(result.id);
                form.reset();
                elements.itensBody.innerHTML = '';
                adicionarItem();
                calcularTotal();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Erro ao salvar OS Manual:", error);
            showAlert(`Falha ao salvar a OS Manual: ${error.message}`, 'danger');
        }
    }

    // Funções utilitárias (assumindo que estão em utils.js ou similar)
    const getNumericValue = (str) => parseFloat(String(str).replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.')) || 0;
    const formatarValor = (val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // A função maskCurrency deve existir em outro script, como validation.js

    inicializar();
});