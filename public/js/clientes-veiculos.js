// Definições de função no escopo do arquivo para melhor testabilidade
function _renderizarClientesSeguro(clientes, tableElement) {
    if (!tableElement) return;
    tableElement.innerHTML = ''; // Limpa a tabela
    clientes.forEach(c => {
        const row = tableElement.insertRow();
        row.insertCell(0).textContent = c.nome;
        row.insertCell(1).textContent = c.telefone;
        row.insertCell(2).textContent = c.email;
        row.insertCell(3).textContent = c.cpf_cnpj;
        const actionsCell = row.insertCell(4);
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-warning" onclick="abrirModalEditarCliente(${c.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-danger" onclick="excluirCliente(${c.id})"><i class="bi bi-trash"></i></button>
        `;
    });
}

function _renderizarVeiculosSeguro(veiculos, tableElement) {
    if (!tableElement) return;
    tableElement.innerHTML = ''; // Limpa a tabela
    veiculos.forEach(v => {
        const row = tableElement.insertRow();
        row.insertCell(0).textContent = v.clienteNome; // Corrigido para camelCase
        row.insertCell(1).textContent = v.marca;
        row.insertCell(2).textContent = v.modelo;
        row.insertCell(3).textContent = v.ano;
        row.insertCell(4).textContent = v.placa;
        row.insertCell(5).textContent = v.cor;
        row.insertCell(6).textContent = v.quilometragem || 'N/A';
        const actionsCell = row.insertCell(7);
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-warning" onclick="abrirModalEditarVeiculo(${v.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-danger" onclick="excluirVeiculo(${v.id})"><i class="bi bi-trash"></i></button>
        `;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('form-cliente');
    if (!formCliente) return; // Sai se não estiver na página correta

    // Máscaras (a lógica de `addInputMask` e as funções de máscara vêm de outro arquivo, ex: utils.js)
    addInputMask('telefoneCliente', maskPhone);
    addInputMask('documentoCliente', maskCpfCnpj);
    addInputMask('placaVeiculo', maskPlate);
    addInputMask('editTelefoneCliente', maskPhone);
    addInputMask('editPlacaVeiculo', maskPlate);

    const formVeiculo = document.getElementById('form-veiculo');
    const listaClientesTable = document.getElementById('lista-clientes');
    const listaVeiculosTable = document.getElementById('lista-veiculos');
    const inputBusca = document.getElementById('inputBusca');
    const campoBusca = document.getElementById('campoBusca');

    const searchClienteInput = document.getElementById('search-cliente-veiculo-input');
    const clienteHiddenInput = document.getElementById('clienteVeiculo');
    const clienteSearchResults = document.getElementById('cliente-veiculo-search-results');

    let todosClientes = [];
    let todosVeiculos = [];

    // Funções de confirmação e modais (simplificado)
    const modalConfirmacao = new bootstrap.Modal(document.getElementById('modalConfirmarExclusao'));
    const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');
    let confirmacaoCallback = () => { };
    btnConfirmarExclusao.addEventListener('click', () => {
        confirmacaoCallback();
        modalConfirmacao.hide();
    });
    window.showConfirm = (message, callback) => {
        document.getElementById('corpoModalConfirmacao').textContent = message;
        confirmacaoCallback = callback;
        modalConfirmacao.show();
    };

    // Carregar dados iniciais
    async function carregarDados() {
        try {
            todosClientes = await window.api.getClientes();
            todosVeiculos = await window.api.getVeiculos();
            renderizarTabelas();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showAlert('Falha ao carregar dados do banco de dados.', 'danger');
        }
    }

    function _renderizarVeiculosSeguro(veiculos, tableElement) {
        if (!tableElement) return;
        tableElement.innerHTML = ''; // Limpa a tabela
        veiculos.forEach(v => {
            const row = tableElement.insertRow();
            row.insertCell(0).textContent = v.clienteNome; // Corrigido para camelCase
            row.insertCell(1).textContent = v.marca;
            row.insertCell(2).textContent = v.modelo;
            row.insertCell(3).textContent = v.ano;
            row.insertCell(4).textContent = v.placa;
            row.insertCell(5).textContent = v.cor;
            row.insertCell(6).textContent = v.quilometragem || 'N/A';
            const actionsCell = row.insertCell(7);
            actionsCell.innerHTML = `
                <button class="btn btn-sm btn-warning" onclick="abrirModalEditarVeiculo(${v.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger" onclick="excluirVeiculo(${v.id})"><i class="bi bi-trash"></i></button>
            `;
        });
    }

    function renderizarTabelas(clientesFiltrados = todosClientes, veiculosFiltrados = todosVeiculos) {
        // Renderiza clientes de forma segura
        _renderizarClientesSeguro(clientesFiltrados, listaClientesTable);

        // Renderiza veículos de forma segura
        _renderizarVeiculosSeguro(veiculosFiltrados, listaVeiculosTable);
    }

    // Busca
    window.realizarBusca = () => {
        const termo = inputBusca.value.toLowerCase();
        const campo = campoBusca.value;

        const clientesFiltrados = todosClientes.filter(c => {
            if (!termo) return true;
            const campoEfetivo = campo === 'documento' ? 'cpf_cnpj' : campo;
            const valorCampo = String(c[campoEfetivo] || '').toLowerCase();
            return valorCampo.includes(termo);
        });

        const veiculosFiltrados = todosVeiculos.filter(v => {
            if (!termo) return true;
            // Ajuste para buscar pelo nome do cliente na tabela de veículos (o valor do select é 'nome')
            const valorCampo = campo === 'nome' ? String(v.clienteNome || '').toLowerCase() : String(v[campo] || '').toLowerCase();
            return valorCampo.includes(termo);
        });

        renderizarTabelas(clientesFiltrados, veiculosFiltrados);
    };

    window.limparBusca = () => {
        inputBusca.value = '';
        campoBusca.selectedIndex = 0;
        renderizarTabelas();
    };

    // --- CRUD Clientes ---
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoCliente = {
            nome: document.getElementById('nomeCliente').value,
            telefone: document.getElementById('telefoneCliente').value,
            email: document.getElementById('emailCliente').value,
            cpf_cnpj: document.getElementById('documentoCliente').value,
            endereco: document.getElementById('enderecoCliente').value,
        };

        if (!validateDocument(novoCliente.cpf_cnpj)) {
            return showAlert('CPF ou CNPJ inválido.', 'danger');
        }
        if (!validatePhone(novoCliente.telefone)) {
            return showAlert('Telefone inválido. Deve conter DDD + 8 ou 9 dígitos.', 'danger');
        }

        try {
            await window.api.addCliente(novoCliente);
            showAlert('✅ Cliente salvo com sucesso!', 'success');
            formCliente.reset();
            carregarDados();
        } catch (error) {
            console.error('Erro ao adicionar cliente:', error);
            showAlert('Erro ao salvar cliente. O CPF/CNPJ já pode existir.', 'danger');
        }
    });

    window.abrirModalEditarCliente = (id) => {
        const cliente = todosClientes.find(c => c.id === id);
        if (!cliente) return;

        document.getElementById('editClienteId').value = cliente.id;
        document.getElementById('editNomeCliente').value = cliente.nome;
        document.getElementById('editTelefoneCliente').value = cliente.telefone;
        document.getElementById('editEmailCliente').value = cliente.email;
        document.getElementById('editDocumentoCliente').value = cliente.cpf_cnpj;
        document.getElementById('editEnderecoCliente').value = cliente.endereco;

        const modal = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
        modal.show();
    };

    document.getElementById('form-editar-cliente').addEventListener('submit', async (e) => {
        e.preventDefault();
        const clienteAtualizado = {
            id: parseInt(document.getElementById('editClienteId').value),
            nome: document.getElementById('editNomeCliente').value,
            telefone: document.getElementById('editTelefoneCliente').value,
            email: document.getElementById('editEmailCliente').value,
            cpf_cnpj: document.getElementById('editDocumentoCliente').value,
            endereco: document.getElementById('editEnderecoCliente').value,
        };

        try {
            const sucesso = await window.api.updateCliente(clienteAtualizado);
            if (sucesso) {
                showAlert('✅ Cliente atualizado com sucesso!', 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente')).hide();
                carregarDados();
            } else {
                showAlert('Nenhuma alteração detectada ou erro ao atualizar.', 'warning');
            }
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            showAlert('Erro ao atualizar cliente. O CPF/CNPJ já pode existir.', 'danger');
        }
    });

    window.excluirCliente = (id) => {
        showConfirm(`Tem certeza que deseja excluir este cliente? Todos os seus veículos e serviços associados também serão excluídos.`, async () => {
            try {
                await window.api.deleteCliente(id);
                showAlert('✅ Cliente excluído com sucesso!', 'success');
                carregarDados();
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                showAlert('Erro ao excluir cliente.', 'danger');
            }
        });
    };

    window.excluirVeiculo = (id) => {
        showConfirm(`Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.`, async () => {
            try {
                await window.api.deleteVeiculo(id);
                showAlert('✅ Veículo excluído com sucesso!', 'success');
                carregarDados();
            } catch (error) {
                console.error('Erro ao excluir veículo:', error);
                showAlert('Erro ao excluir veículo.', 'danger');
            }
        });
    };

    window.abrirModalEditarVeiculo = (id) => {
        const veiculo = todosVeiculos.find(v => v.id === id);
        if (!veiculo) return;

        document.getElementById('editVeiculoId').value = veiculo.id;
        document.getElementById('editVeiculoCliente').value = veiculo.clienteNome; // Apenas para exibição
        document.getElementById('editMarcaVeiculo').value = veiculo.marca;
        document.getElementById('editModeloVeiculo').value = veiculo.modelo;
        document.getElementById('editAnoVeiculo').value = veiculo.ano;
        document.getElementById('editPlacaVeiculo').value = veiculo.placa;
        document.getElementById('editCorVeiculo').value = veiculo.cor;
        document.getElementById('editQuilometragemVeiculo').value = veiculo.quilometragem;

        const modal = new bootstrap.Modal(document.getElementById('modalEditarVeiculo'));
        modal.show();
    };

    document.getElementById('form-editar-veiculo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const veiculoAtualizado = {
            id: parseInt(document.getElementById('editVeiculoId').value),
            // O cliente_id não é editável neste modal, então precisamos buscá-lo do objeto original
            cliente_id: todosVeiculos.find(v => v.id === parseInt(document.getElementById('editVeiculoId').value)).cliente_id,
            marca: document.getElementById('editMarcaVeiculo').value,
            modelo: document.getElementById('editModeloVeiculo').value,
            ano: document.getElementById('editAnoVeiculo').value,
            placa: document.getElementById('editPlacaVeiculo').value,
            cor: document.getElementById('editCorVeiculo').value,
            quilometragem: document.getElementById('editQuilometragemVeiculo').value,
        };

        try {
            const sucesso = await window.api.updateVeiculo(veiculoAtualizado);
            if (sucesso) {
                showAlert('✅ Veículo atualizado com sucesso!', 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalEditarVeiculo')).hide();
                carregarDados();
            } else {
                showAlert('Nenhuma alteração detectada ou erro ao atualizar.', 'warning');
            }
        } catch (error) {
            console.error('Erro ao atualizar veículo:', error);
            showAlert('Erro ao atualizar veículo. A placa já pode existir.', 'danger');
        }
    });

    // --- CRUD Veículos ---
    formVeiculo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novoVeiculo = {
            cliente_id: parseInt(clienteHiddenInput.value),
            placa: document.getElementById('placaVeiculo').value,
            marca: document.getElementById('marcaVeiculo').value,
            modelo: document.getElementById('modeloVeiculo').value,
            ano: document.getElementById('anoVeiculo').value,
            cor: document.getElementById('corVeiculo').value,
            quilometragem: document.getElementById('quilometragemVeiculo').value,
        };

        if (!novoVeiculo.cliente_id) {
            return showAlert('Selecione um cliente para o veículo!', 'warning');
        }
        if (!validateVehicleYear(novoVeiculo.ano)) {
            return showAlert('Ano do veículo inválido. Use 4 dígitos (ex: 2023) e um ano realista.', 'danger');
        }
        if (!validateVehiclePlate(novoVeiculo.placa)) {
            return showAlert('Placa do veículo inválida.', 'danger');
        }

        try {
            await window.api.addVeiculo(novoVeiculo);
            showAlert('✅ Veículo salvo com sucesso!', 'success');
            formVeiculo.reset();
            searchClienteInput.value = '';
            carregarDados();
        } catch (error) {
            console.error('Erro ao adicionar veículo:', error);
            showAlert('Erro ao salvar veículo. A placa já pode existir.', 'danger');
        }
    });

    // Lógica de busca de cliente para o formulário de veículo
    searchClienteInput.addEventListener('input', () => {
        const termo = searchClienteInput.value.toLowerCase();
        clienteSearchResults.innerHTML = '';
        if (!termo) {
            clienteHiddenInput.value = '';
            return;
        }
        const clientesFiltrados = todosClientes.filter(c => c.nome.toLowerCase().includes(termo) || c.cpf_cnpj.toLowerCase().includes(termo));
        clientesFiltrados.forEach(cliente => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            item.textContent = `${cliente.nome} (${cliente.cpf_cnpj})`;
            item.dataset.id = cliente.id;
            item.dataset.nome = cliente.nome;
            item.addEventListener('click', (e) => {
                e.preventDefault();
                clienteHiddenInput.value = e.target.dataset.id;
                searchClienteInput.value = e.target.dataset.nome;
                clienteSearchResults.innerHTML = '';
            });
            clienteSearchResults.appendChild(item);
        });
    });

    // Inicializa o carregamento dos dados
    carregarDados();
});

// Expor funções para testes unitários
if (typeof window.testHooks === 'undefined') {
    window.testHooks = {};
}
window.testHooks.renderizarClientes = _renderizarClientesSeguro;
window.testHooks.renderizarVeiculos = _renderizarVeiculosSeguro;
