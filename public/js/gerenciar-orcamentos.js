document.addEventListener('DOMContentLoaded', () => {
    const listaOrcamentosTable = document.getElementById('lista-orcamentos');
    if (!listaOrcamentosTable) return; // Sai se não estiver na página

    let todosOrcamentos = [];

    async function carregarDados() {
        try {
            todosOrcamentos = await window.api.getOrcamentos();
            renderizarOrcamentos(todosOrcamentos);
        } catch (error) {
            console.error('Erro ao carregar orçamentos:', error);
            showAlert('Falha ao carregar orçamentos.', 'danger');
        }
    }

    function renderizarOrcamentos(orcamentos) {
        listaOrcamentosTable.innerHTML = orcamentos.map(o => `
            <tr>
                <td>${String(o.id).padStart(6, '0')}</td>
                <td>${o.cliente_nome}</td>
                <td>${o.veiculo_placa}</td>
                <td>${new Date(o.data).toLocaleDateString('pt-BR')}</td>
                <td>R$ ${o.valor_total.toFixed(2)}</td>
                <td><span class="badge bg-warning text-dark">${o.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="abrirModalVerItens(${o.id})"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="abrirModalEditarOrcamento(${o.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-success" onclick="imprimirOrcamento(${o.id})"><i class="bi bi-printer"></i> Imprimir</button>
                    <button class="btn btn-sm btn-danger" onclick="excluirOrcamento(${o.id})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    window.abrirModalVerItens = async (id) => {
        try {
            const itens = await window.api.getOrcamentoItens(id);
            const orcamento = todosOrcamentos.find(o => o.id === id);

            document.getElementById('itens-orcamento-modal-body').innerHTML = itens.map(item => `
                <tr>
                    <td>${item.descricao}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.valor_unitario.toFixed(2)}</td>
                    <td>R$ ${(item.quantidade * item.valor_unitario).toFixed(2)}</td>
                </tr>
            `).join('');
            document.getElementById('problema-relatado-modal').textContent = orcamento.descricao_problema;
            
            new bootstrap.Modal(document.getElementById('modalVerItens')).show();
        } catch (error) {
            console.error('Erro ao buscar itens do orçamento:', error);
            showAlert('Falha ao buscar detalhes do orçamento.', 'danger');
        }
    };

    window.imprimirOrcamento = (id) => {
        window.api.printOrcamento(id);
    };

    window.excluirOrcamento = (id) => {
        showConfirm('Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.', async () => {
            try {
                const sucesso = await window.api.deleteOrcamento(id);
                if (sucesso) {
                    showAlert('✅ Orçamento excluído com sucesso!', 'success');
                    carregarDados(); // Recarrega a lista
                } else {
                    showAlert('Erro ao excluir o orçamento.', 'danger');
                }
            } catch (error) {
                console.error('Erro ao excluir orçamento:', error);
                showAlert('Falha na comunicação com o banco de dados.', 'danger');
            }
        });
    };

    // --- Lógica de Edição de Orçamento ---

    const modalEditarOrcamentoEl = document.getElementById('modalEditarOrcamento');
    const modalEditarOrcamento = new bootstrap.Modal(modalEditarOrcamentoEl);
    const formEditarOrcamento = document.getElementById('form-editar-orcamento');
    const editOrcamentoId = document.getElementById('editOrcamentoId');
    const editClienteNome = document.getElementById('editClienteNome');
    const editPlacaVeiculo = document.getElementById('editPlacaVeiculo');
    const editProblemaRelatado = document.getElementById('editProblemaRelatado');
    const editStatus = document.getElementById('editStatus');
    const editItensContainer = document.getElementById('edit-itens-orcamento-container');
    const btnAdicionarItem = document.getElementById('btnAdicionarItem');
    const editDescontoPercentual = document.getElementById('edit-desconto-percentual');
    const editSubtotalOrcamento = document.getElementById('edit-subtotal-orcamento');
    const editValorDesconto = document.getElementById('edit-valor-desconto');
    const editTotalFinalOrcamento = document.getElementById('edit-total-final-orcamento');
    const btnSalvarServico = document.getElementById('btnSalvarServico');

    editStatus.addEventListener('input', () => {
        btnSalvarServico.disabled = editStatus.value !== 'Aprovado';
    });

    btnSalvarServico.addEventListener('click', async () => {
        const id = parseInt(editOrcamentoId.value);
        if (!id) return;

        try {
            // O status 'Em andamento' o caracteriza como um serviço ativo
            const sucesso = await window.api.updateOrcamentoStatus(id, 'Em andamento');
            if (sucesso) {
                showAlert('✅ Orçamento aprovado e convertido em Ordem de Serviço!', 'success');
                modalEditarOrcamento.hide();
                carregarDados(); // Recarrega a lista de orçamentos
            } else {
                showAlert('Erro ao aprovar o orçamento.', 'danger');
            }
        } catch (error) {
            console.error('Erro ao converter orçamento em serviço:', error);
            showAlert('Falha na comunicação ao converter orçamento.', 'danger');
        }
    });

    function calcularTotaisEdicao() {
        let subtotal = 0;
        editItensContainer.querySelectorAll('.item-row').forEach(row => {
            const quantidade = parseFloat(row.querySelector('[name="quantidade"]').value) || 0;
            const valor = parseFloat(row.querySelector('[name="valor"]').value) || 0;
            subtotal += quantidade * valor;
        });

        const descontoPercentual = parseFloat(editDescontoPercentual.value.replace(',', '.')) || 0;
        const valorDesconto = subtotal * (descontoPercentual / 100);
        const totalFinal = subtotal - valorDesconto;

        editSubtotalOrcamento.textContent = `R$ ${subtotal.toFixed(2)}`;
        editValorDesconto.textContent = `- R$ ${valorDesconto.toFixed(2)}`;
        editTotalFinalOrcamento.textContent = `R$ ${totalFinal.toFixed(2)}`;
    }

    function adicionarItemEdicao(item = {}) {
        const itemRow = document.createElement('div');
        itemRow.className = 'row g-3 mb-3 item-row align-items-center';
        itemRow.innerHTML = `
            <div class="col-md-4">
                <input type="text" class="form-control" name="descricao" placeholder="Descrição" value="${item.descricao || ''}" required>
            </div>
            <div class="col-md-2">
                <select class="form-select" name="tipo">
                    <option value="Peça" ${item.tipo === 'Peça' ? 'selected' : ''}>Peça</option>
                    <option value="Mão de Obra" ${item.tipo === 'Mão de Obra' || !item.tipo ? 'selected' : ''}>Mão de Obra</option>
                </select>
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control" name="quantidade" placeholder="Qtd" value="${item.quantidade || 1}" min="1">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control" name="valor" placeholder="Valor" value="${(item.valor_unitario || 0).toFixed(2)}" step="0.01" min="0">
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger btn-sm remover-item"><i class="bi bi-trash"></i></button>
            </div>
        `;
        editItensContainer.appendChild(itemRow);
        itemRow.querySelector('.remover-item').addEventListener('click', () => {
            itemRow.remove();
            calcularTotaisEdicao();
        });
        itemRow.querySelectorAll('input, select').forEach(input => input.addEventListener('input', calcularTotaisEdicao));
    }

    btnAdicionarItem.addEventListener('click', () => adicionarItemEdicao());
    editDescontoPercentual.addEventListener('input', calcularTotaisEdicao);

    window.abrirModalEditarOrcamento = async (id) => {
        try {
            const orcamento = await window.api.getOrcamentoById(id);
            if (!orcamento) {
                showAlert('Orçamento não encontrado.', 'danger');
                return;
            }
            
            const orcamentoNaLista = todosOrcamentos.find(o => o.id === id);

            editOrcamentoId.value = orcamento.id;
            editClienteNome.value = orcamentoNaLista?.cliente_nome || 'N/A';
            editPlacaVeiculo.value = orcamentoNaLista?.veiculo_placa || 'N/A';
            editProblemaRelatado.value = orcamento.descricao_problema;
            editStatus.value = orcamento.status;
            btnSalvarServico.disabled = editStatus.value !== 'Aprovado';
            
            editItensContainer.innerHTML = '';
            orcamento.itens.forEach(adicionarItemEdicao);
            
            editDescontoPercentual.value = 0; 
            
            calcularTotaisEdicao();
            modalEditarOrcamento.show();

        } catch (error) {
            console.error('Erro ao abrir modal de edição:', error);
            showAlert('Falha ao carregar dados para edição.', 'danger');
        }
    };

    formEditarOrcamento.addEventListener('submit', async (e) => {
        e.preventDefault();

        let subtotal = 0;
        const itens = [];
        editItensContainer.querySelectorAll('.item-row').forEach(row => {
            const descricao = row.querySelector('[name="descricao"]').value;
            const tipo = row.querySelector('[name="tipo"]').value;
            const quantidade = parseFloat(row.querySelector('[name="quantidade"]').value) || 0;
            const valor = parseFloat(row.querySelector('[name="valor"]').value) || 0;
            if (descricao && quantidade > 0) {
                itens.push({ descricao, tipo, quantidade, valor_unitario: valor });
                subtotal += quantidade * valor;
            }
        });

        if (itens.length === 0) {
            showAlert('O orçamento deve ter pelo menos um item.', 'warning');
            return;
        }

        const descontoPercentual = parseFloat(editDescontoPercentual.value) || 0;
        const valorDesconto = subtotal * (descontoPercentual / 100);
        const totalFinal = subtotal - valorDesconto;

        const orcamentoOriginal = todosOrcamentos.find(o => o.id === parseInt(editOrcamentoId.value));

        const orcamentoAtualizado = {
            id: parseInt(editOrcamentoId.value),
            descricao_problema: editProblemaRelatado.value,
            status: editStatus.value,
            valor_total: totalFinal,
            itens: itens,
            cliente_id: orcamentoOriginal.cliente_id,
            veiculo_id: orcamentoOriginal.veiculo_id,
            data: orcamentoOriginal.data,
        };

        try {
            const resultado = await window.api.updateOrcamento(orcamentoAtualizado);
            if (resultado.success) {
                showAlert('✅ Orçamento atualizado com sucesso!', 'success');
                modalEditarOrcamento.hide();
                carregarDados();
            } else {
                showAlert(`Erro ao atualizar orçamento: ${resultado.error}`, 'danger');
            }
        } catch (error) {
            console.error('Erro ao salvar alterações do orçamento:', error);
            showAlert('Falha ao salvar alterações.', 'danger');
        }
    });

    carregarDados();
});