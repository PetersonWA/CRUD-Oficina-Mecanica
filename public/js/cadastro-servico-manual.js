document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-servico');
    if (!form) return;

    // --- Mapeamento de Elementos ---
    const elements = {
        searchClienteInput: document.getElementById('search-cliente-input'),
        clienteHiddenInput: document.getElementById('cliente'),
        clienteSearchResults: document.getElementById('cliente-search-results'),
        selectVeiculo: document.getElementById('veiculo'),
        dataEntradaInput: document.getElementById('dataEntrada'),
        descricaoServicoInput: document.getElementById('descricaoServico'),
        mecanicoInput: document.getElementById('mecanico'),
        valorInput: document.getElementById('valor'),
        statusServicoSelect: document.getElementById('statusServico')
    };

    let listaClientes = [];
    let listaVeiculos = [];

    // --- INICIALIZAÇÃO ---
    async function inicializar() {
        try {
            [listaClientes, listaVeiculos] = await Promise.all([
                window.api.getClientes(),
                window.api.getVeiculos()
            ]);
        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
            showAlert('Falha ao carregar clientes e veículos.', 'danger');
            return;
        }
        vincularEventos();
        // Preencher data de entrada com hoje por padrão
        elements.dataEntradaInput.value = new Date().toISOString().split('T')[0];
    }

    // --- VINCULAÇÃO DE EVENTOS ---
    function vincularEventos() {
        elements.searchClienteInput.addEventListener('input', handleBuscaCliente);
        elements.clienteSearchResults.addEventListener('click', handleSelecaoCliente);
        document.addEventListener('click', (e) => { // Fechar busca
            if (!elements.searchClienteInput.contains(e.target) && !elements.clienteSearchResults.contains(e.target)) {
                elements.clienteSearchResults.innerHTML = '';
            }
        });
        form.addEventListener('submit', handleFormSubmit);
    }

    // --- HANDLERS DE EVENTO ---
    function handleBuscaCliente() {
        const termo = elements.searchClienteInput.value.toLowerCase();
        elements.clienteSearchResults.innerHTML = '';
        if (!termo) {
            elements.clienteHiddenInput.value = '';
            elements.selectVeiculo.innerHTML = '<option value="">Selecione um cliente primeiro...</option>';
            elements.selectVeiculo.disabled = true;
            return;
        }
        const clientesFiltrados = listaClientes.filter(c => c.nome.toLowerCase().includes(termo) || (c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(termo)));
        clientesFiltrados.forEach(cliente => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            item.textContent = `${cliente.nome} ${cliente.cpf_cnpj ? '(' + cliente.cpf_cnpj + ')' : ''}`;
            item.dataset.id = cliente.id;
            elements.clienteSearchResults.appendChild(item);
        });
    }

    function handleSelecaoCliente(e) {
        if (e.target && e.target.matches('a.list-group-item')) {
            e.preventDefault();
            const clienteId = parseInt(e.target.dataset.id);
            const cliente = listaClientes.find(c => c.id === clienteId);

            if (cliente) {
                elements.searchClienteInput.value = cliente.nome;
                elements.clienteHiddenInput.value = cliente.id;
                elements.clienteSearchResults.innerHTML = '';
                carregarVeiculosDoCliente(cliente.id);
            }
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const clienteId = parseInt(elements.clienteHiddenInput.value);
        const veiculoId = parseInt(elements.selectVeiculo.value);

        if (!clienteId || !veiculoId) {
            showAlert('Por favor, selecione um cliente e um veículo válidos.', 'danger');
            return;
        }

        const descricao = elements.descricaoServicoInput.value;
        const valor = parseFloat(elements.valorInput.value);

        const servico = {
            cliente_id: clienteId,
            veiculo_id: veiculoId,
            data: elements.dataEntradaInput.value,
            problema_relatado: descricao, // Alinhado com o handler do main.js
            mecanico_responsavel: elements.mecanicoInput.value, 
            status: elements.statusServicoSelect.value,
            valor_total: valor,
            itens: [{
                descricao: descricao,
                quantidade: 1,
                valor_unitario: valor,
                tipo: 'Mão de Obra'
            }],
            status_pagamento: 'Pendente'
        };

        if (!servico.data || !servico.valor_total || !servico.problema_relatado) {
            showAlert('Por favor, preencha todos os campos obrigatórios.', 'danger');
            return;
        }

        try {
            const result = await window.api.addServico(servico);
            if (result.success) {
                showAlert('✅ Serviço salvo com sucesso!', 'success');
                form.reset();
                elements.selectVeiculo.innerHTML = '<option value="">Selecione um cliente primeiro...</option>';
                elements.selectVeiculo.disabled = true;
                elements.dataEntradaInput.value = new Date().toISOString().split('T')[0];
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erro ao salvar serviço manual:', error);
            showAlert(`❌ Erro ao salvar serviço: ${error.message}`, 'danger');
        }
    }

    // --- LÓGICA DE NEGÓCIO ---
    function carregarVeiculosDoCliente(clienteId) {
        const veiculosDoCliente = listaVeiculos.filter(v => v.cliente_id === clienteId);
        elements.selectVeiculo.innerHTML = '<option value="">Selecione um veículo...</option>';
        if (veiculosDoCliente.length > 0) {
            veiculosDoCliente.forEach(veiculo => {
                const option = document.createElement('option');
                option.value = veiculo.id;
                option.textContent = `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;
                elements.selectVeiculo.appendChild(option);
            });
            elements.selectVeiculo.disabled = false;
        } else {
            elements.selectVeiculo.innerHTML = '<option value="">Nenhum veículo cadastrado para este cliente</option>';
            elements.selectVeiculo.disabled = true;
        }
    }
    
    // --- INÍCIO ---
    inicializar();
});