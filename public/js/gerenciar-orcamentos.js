function _renderizarOrcamentosSeguro(orcamentos, tableElement) {
    if (!tableElement) return;
    tableElement.innerHTML = '';
    orcamentos.forEach(o => {
        const row = tableElement.insertRow();
        row.insertCell(0).textContent = String(o.id).padStart(6, '0');
        row.insertCell(1).textContent = o.clienteNome || '';
        row.insertCell(2).textContent = o.veiculoPlaca || '';
        row.insertCell(3).textContent = new Date(o.dataEntrada).toLocaleDateString('pt-BR');
        row.insertCell(4).textContent = `R$ ${(o.valorTotal || 0).toFixed(2)}`;
        row.insertCell(5).innerHTML = `<span class="badge bg-warning text-dark">${o.status}</span>`;

        const actionsCell = row.insertCell(6);
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-info" onclick="abrirModalVerItens(${o.id})"><i class="bi bi-eye"></i></button>
            <button class="btn btn-sm btn-secondary" onclick="imprimirOrcamento(${o.id})"><i class="bi bi-printer"></i></button>
            <button class="btn btn-sm btn-warning" onclick="abrirModalEditarOrcamento(${o.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-success" onclick="promoverParaServico(${o.id})" ${o.status !== 'Aprovado' ? 'disabled' : ''} title="Promover para Ordem de Serviço"><i class="bi bi-check-circle"></i></button>
            <button class="btn btn-sm btn-danger" onclick="excluirOrcamento(${o.id})"><i class="bi bi-trash"></i></button>
        `;
    });
}

window.promoverParaServico = (id) => {
    if (!id) return;
    const orcamento = todosOrcamentos.find(o => o.id === parseInt(id));
    if (!orcamento) {
        return showAlert('Erro: Orçamento não encontrado para promoção.', 'danger');
    }
    if (orcamento.status !== 'Aprovado') {
        showAlert('Apenas orçamentos com status "Aprovado" podem ser promovidos para Ordem de Serviço.', 'warning');
        return;
    }
    sessionStorage.setItem('orcamentoParaServicoId', id);
    window.location.href = 'cadastro-servico.html';
};

if (typeof window.testHooks === 'undefined') {
    window.testHooks = {};
}
window.testHooks.renderizarOrcamentos = _renderizarOrcamentosSeguro;

let todosOrcamentos = [];

document.addEventListener('DOMContentLoaded', () => {
    const listaOrcamentosTable = document.getElementById('lista-orcamentos');
    if (!listaOrcamentosTable) return;

    // Variáveis de estado para ordenação e filtragem
    let orcamentosFiltrados = [];
    let sortKey = 'id';
    let sortOrder = 'desc';

    // Adiciona ouvintes de evento aos cabeçalhos ordenáveis
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => {
            const key = header.getAttribute('data-sort-key');
            handleSort(key);
        });
    });

    function handleSort(key) {
        if (sortKey === key) {
            sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey = key;
            sortOrder = 'asc';
        }
        ordenarErenderizar();
    }

    function updateHeaderSortUI() {
        document.querySelectorAll('.sortable-header').forEach(header => {
            const icon = header.querySelector('i');
            icon.className = 'bi bi-arrow-down-up small text-muted'; // Estado padrão

            if (header.getAttribute('data-sort-key') === sortKey) {
                icon.className = sortOrder === 'asc'
                    ? 'bi bi-arrow-up text-primary'
                    : 'bi bi-arrow-down text-primary';
            }
        });
    }

    function ordenarErenderizar() {
        orcamentosFiltrados.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            // Tratamento especial para null/undefined
            if (valA == null) valA = '';
            if (valB == null) valB = '';

            // Tratamento para strings (case insensitive)
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        renderizarOrcamentos(orcamentosFiltrados);
        updateHeaderSortUI();
    }

    window.carregarDados = async function () {
        try {
            todosOrcamentos = await window.api.getOrcamentos();
            orcamentosFiltrados = [...todosOrcamentos];
            ordenarErenderizar();
        } catch (error) {
            console.error('Erro ao carregar orçamentos:', error);
            showAlert('Falha ao carregar orçamentos.', 'danger');
        }
    }

    function renderizarOrcamentos(orcamentos) {
        _renderizarOrcamentosSeguro(orcamentos, listaOrcamentosTable);
    }

    window.realizarBusca = () => {
        const campo = document.getElementById('campoBusca').value;
        const termo = document.getElementById('inputBusca').value.toLowerCase();

        if (!campo) {
            orcamentosFiltrados = [...todosOrcamentos];
        } else {
            orcamentosFiltrados = todosOrcamentos.filter(o => {
                const valorCampo = String(o[campo] || '').toLowerCase();
                return valorCampo.includes(termo);
            });
        }
        ordenarErenderizar();
    };

    window.limparBusca = () => {
        document.getElementById('inputBusca').value = '';
        document.getElementById('campoBusca').selectedIndex = 0;
        orcamentosFiltrados = [...todosOrcamentos];
        ordenarErenderizar();
    };

    window.abrirModalVerItens = async (id) => {
        try {
            const itens = await window.api.getOrcamentoItens(id);
            const orcamento = todosOrcamentos.find(o => o.id === parseInt(id));

            const itensTableBody = document.getElementById('itens-orcamento-modal-body');
            itensTableBody.innerHTML = '';
            itens.forEach(item => {
                const row = itensTableBody.insertRow();
                row.insertCell(0).textContent = item.descricao;
                row.insertCell(1).textContent = item.quantidade;
                row.insertCell(2).textContent = `R$ ${item.valor_unitario.toFixed(2)}`;
                row.insertCell(3).textContent = `R$ ${(item.quantidade * item.valor_unitario).toFixed(2)}`;
            });

            document.getElementById('problema-relatado-modal').textContent = orcamento.problema_relatado || orcamento.descricao_problema || '';

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
                    carregarDados();
                } else {
                    showAlert('Erro ao excluir o orçamento.', 'danger');
                }
            } catch (error) {
                console.error('Erro ao excluir orçamento:', error);
                showAlert('Falha na comunicação com o banco de dados.', 'danger');
            }
        });
    };

    if (typeof window.testHooks === 'undefined') {
        window.testHooks = {};
    }
    window.testHooks.renderizarTabela = (orcamentos) => _renderizarOrcamentosSeguro(orcamentos, listaOrcamentosTable);

    const modalEditarOrcamentoEl = document.getElementById('modalEditarOrcamento');
    const modalEditarOrcamento = new bootstrap.Modal(modalEditarOrcamentoEl);
    const formEditarOrcamento = document.getElementById('form-editar-orcamento');
    let orcamentoEmEdicao = null; // Variável para guardar o orçamento que está sendo editado

    // Funções auxiliares para o modal de edição
    function getNumericValue(valueString) {
        if (!valueString) return 0;
        return parseFloat(String(valueString).replace(/R\$\s?/, "").replace(/\./g, "").replace(",", ".")) || 0;
    }

    function formatarValor(valor) {
        return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function calcularTotaisEdicao() {
        let subtotal = 0;
        const itensContainer = document.getElementById('edit-itens-orcamento-container');
        itensContainer.querySelectorAll(".item-row").forEach(row => {
            const quantidade = parseFloat(row.querySelector(".item-quantidade").value) || 0;
            const valor = getNumericValue(row.querySelector(".item-valor").value);
            subtotal += quantidade * valor;
        });

        const maoDeObra = getNumericValue(document.getElementById('edit-mao-de-obra').value);
        subtotal += maoDeObra;

        const descontoPercentual = parseFloat(document.getElementById('edit-desconto-percentual').value) || 0;
        const valorDesconto = subtotal * (descontoPercentual / 100);
        const totalFinal = subtotal - valorDesconto;

        document.getElementById('edit-subtotal').textContent = `R$ ${formatarValor(subtotal)}`;
        document.getElementById('edit-valor-desconto').textContent = `- R$ ${formatarValor(valorDesconto)}`;
        document.getElementById('edit-total-final').textContent = `R$ ${formatarValor(totalFinal)}`;
    }

    function removerItemEdicao(button) {
        button.closest('.item-row').remove();
        calcularTotaisEdicao();
    }

    function adicionarItemEdicao(item = { descricao: '', quantidade: 1, valor_unitario: 0 }) {
        const container = document.getElementById('edit-itens-orcamento-container');
        const itemRow = document.createElement('div');
        itemRow.className = 'row item-row mb-2';
        itemRow.innerHTML = `
            <div class="col-md-5">
                <input type="text" class="form-control form-control-sm item-descricao" placeholder="Descrição do item" value="${item.descricao}">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control form-control-sm item-quantidade" min="1" value="${item.quantidade}">
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control form-control-sm item-valor" value="${formatarValor(item.valor_unitario)}">
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger btn-sm" onclick="removerItemEdicao(this)"><i class="bi bi-trash"></i></button>
            </div>
        `;
        container.appendChild(itemRow);

        const valorInput = itemRow.querySelector('.item-valor');
        valorInput.addEventListener('input', (e) => maskCurrency(e.target));

        itemRow.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', calcularTotaisEdicao);
        });
    }

    // Abre o modal preenchendo com os dados do orçamento
    window.abrirModalEditarOrcamento = async (id) => {
        try {
            orcamentoEmEdicao = await window.api.getOrcamentoById(id);
            if (!orcamentoEmEdicao) {
                showAlert('Orçamento não encontrado.', 'danger');
                orcamentoEmEdicao = null;
                return;
            }

            const orcamentoNaLista = todosOrcamentos.find(o => o.id === parseInt(id));

            document.getElementById('editOrcamentoId').value = orcamentoEmEdicao.id;
            document.getElementById('editClienteNome').value = orcamentoNaLista?.clienteNome || 'N/A';
            document.getElementById('editPlacaVeiculo').value = orcamentoNaLista?.veiculoPlaca || 'N/A';
            document.getElementById('editProblemaRelatado').value = orcamentoEmEdicao.descricao_problema || '';
            document.getElementById('editStatus').value = orcamentoEmEdicao.status;

            const editItensContainer = document.getElementById('edit-itens-orcamento-container');
            editItensContainer.innerHTML = '';

            let maoDeObraValor = 0;
            (orcamentoEmEdicao.itens || []).forEach(item => {
                if (item.descricao.toLowerCase() === 'mão de obra') {
                    maoDeObraValor = item.valor_unitario;
                } else {
                    adicionarItemEdicao(item);
                }
            });
            document.getElementById('edit-mao-de-obra').value = formatarValor(maoDeObraValor);

            document.getElementById('edit-desconto-percentual').value = orcamentoEmEdicao.desconto_percentual || 0;

            calcularTotaisEdicao();
            modalEditarOrcamento.show();

        } catch (error) {
            console.error('Erro ao abrir modal de edição:', error);
            showAlert('Falha ao carregar dados para edição.', 'danger');
            orcamentoEmEdicao = null;
        }
    };

    // Conecta o botão de "Adicionar Item" no modal
    document.getElementById('btn-adicionar-item-edicao').addEventListener('click', () => {
        adicionarItemEdicao();
    });

    // Lógica para salvar as alterações do orçamento
    formEditarOrcamento.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!orcamentoEmEdicao) {
            showAlert('Erro: Orçamento original não carregado. Tente novamente.', 'danger');
            return;
        }

        const id = parseInt(document.getElementById('editOrcamentoId').value);
        if (!id || id !== orcamentoEmEdicao.id) {
            showAlert('ID do orçamento inválido ou divergente.', 'danger');
            return;
        }

        const itens = [];
        let hasInvalidItem = false;
        document.querySelectorAll('#edit-itens-orcamento-container .item-row').forEach((row, index) => {
            const descricao = row.querySelector('.item-descricao').value.trim();
            const quantidade = parseFloat(row.querySelector('.item-quantidade').value);
            const valor_unitario = getNumericValue(row.querySelector('.item-valor').value);

            if (descricao) {
                if (isNaN(quantidade) || quantidade <= 0) {
                    showAlert(`A quantidade do item "${descricao}" (linha ${index + 1}) é inválida.`, 'danger');
                    hasInvalidItem = true;
                }
                if (isNaN(valor_unitario) || valor_unitario <= 0) {
                    showAlert(`O valor do item "${descricao}" (linha ${index + 1}) é inválido.`, 'danger');
                    hasInvalidItem = true;
                }
                itens.push({ descricao, tipo: 'Peça', quantidade, valor_unitario });
            }
        });

        if (hasInvalidItem) {
            return; // Para a execução se houver itens inválidos
        }

        const maoDeObraValor = getNumericValue(document.getElementById('edit-mao-de-obra').value);
        if (maoDeObraValor > 0) {
            itens.push({ descricao: "Mão de Obra", tipo: "Mão de Obra", quantidade: 1, valor_unitario: maoDeObraValor });
        }

        if (itens.length === 0) {
            return showAlert("Adicione pelo menos um item ou um valor de mão de obra.", "warning");
        }

        const subtotalText = document.getElementById('edit-subtotal').textContent;
        const totalFinalText = document.getElementById('edit-total-final').textContent;

        const valorTotalCalculado = getNumericValue(totalFinalText);

        const orcamentoData = {
            ...orcamentoEmEdicao, // Preserva campos como data_entrada, cliente_id, veiculo_id
            descricao_problema: document.getElementById('editProblemaRelatado').value.trim(),
            status: document.getElementById('editStatus').value,
            valor_total: valorTotalCalculado,
            itens: itens,
            desconto_percentual: parseFloat(document.getElementById('edit-desconto-percentual').value) || 0
        };

        try {
            const result = await window.api.updateOrcamento(orcamentoData);
            if (result.success) {
                showAlert('✅ Orçamento atualizado com sucesso!', 'success');
                modalEditarOrcamento.hide();
                carregarDados();
            } else {
                throw new Error(result.error || 'Erro desconhecido ao atualizar.');
            }
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            showAlert(`Erro ao salvar: ${error.message}`, 'danger');
        }
    });

    carregarDados();
});
