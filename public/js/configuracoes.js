document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('config-form');
    if (!form) return; // Sai se não estiver na página

    const elements = {
        logoPreview: document.getElementById('logo-preview'),
        logoInput: document.getElementById('logo'),
        deleteLogoBtn: document.getElementById('delete-logo'),
        assinaturaPreview: document.getElementById('assinatura-preview'),
        assinaturaInput: document.getElementById('assinatura'),
        deleteAssinaturaBtn: document.getElementById('delete-assinatura'),
    };

    const placeholderLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect fill='%23F8F9FA' width='200' height='150'/%3E%3Ctext fill='rgba(0,0,0,0.4)' font-family='sans-serif' font-size='16' dy='5.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ELogo%3C/text%3E%3C/svg%3E";
    const placeholderAssinatura = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'%3E%3Crect fill='%23F8F9FA' width='200' height='80'/%3E%3Ctext fill='rgba(0,0,0,0.4)' font-family='sans-serif' font-size='14' dy='5.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3EAssinatura%3C/text%3E%3C/svg%3E";

    async function carregarConfiguracoes() {
        try {
            const config = await window.api.getAllConfigs();
            if (!config) return;

            document.getElementById('nomeOficina').value = config.nomeOficina || '';
            document.getElementById('endereco').value = config.endereco || '';
            document.getElementById('telefone').value = config.telefone || '';
            document.getElementById('email').value = config.email || '';
            document.getElementById('cnpj').value = config.cnpj || '';
            document.getElementById('nomeResponsavel').value = config.nomeResponsavel || '';
            document.getElementById('maxParcelas').value = config.maxParcelas || 12;
            document.getElementById('jurosInicial').value = config.jurosInicial || 0;
            document.getElementById('acrescimoParcela').value = config.acrescimoParcela || 0;
            document.getElementById('parcelasSemJuros').value = config.parcelasSemJuros || 0;
            document.getElementById('formasPagamento').value = config.formasPagamento || '';
            document.getElementById('percentualLucroPecas').value = config.percentualLucroPecas || 10;
            document.getElementById('prazoLiquidacaoCartao').value = config.prazoLiquidacaoCartao || 30;

            elements.logoPreview.src = config.logoPath ? `${config.logoPath}?t=${new Date().getTime()}` : placeholderLogo;
            elements.assinaturaPreview.src = config.assinaturaPath ? `${config.assinaturaPath}?t=${new Date().getTime()}` : placeholderAssinatura;

        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    elements.logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { elements.logoPreview.src = ev.target.result; };
            reader.readAsDataURL(file);
        }
    });

    elements.assinaturaInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { elements.assinaturaPreview.src = ev.target.result; };
            reader.readAsDataURL(file);
        }
    });

    elements.deleteLogoBtn.addEventListener('click', () => {
        showConfirm('Tem certeza que deseja remover o logotipo? A alteração será permanente ao salvar.', () => {
            elements.logoPreview.src = placeholderLogo;
            elements.logoInput.value = ''; // Limpa o input de arquivo
            showAlert('Logotipo removido. Clique em "Salvar Alterações" para confirmar.', 'info');
        });
    });

    elements.deleteAssinaturaBtn.addEventListener('click', () => {
        showConfirm('Tem certeza que deseja remover a assinatura? A alteração será permanente ao salvar.', () => {
            elements.assinaturaPreview.src = placeholderAssinatura;
            elements.assinaturaInput.value = ''; // Limpa o input de arquivo
            showAlert('Assinatura removida. Clique em "Salvar Alterações" para confirmar.', 'info');
        });
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const configData = {
            nomeOficina: document.getElementById('nomeOficina').value,
            endereco: document.getElementById('endereco').value,
            telefone: document.getElementById('telefone').value,
            email: document.getElementById('email').value,
            cnpj: document.getElementById('cnpj').value,
            nomeResponsavel: document.getElementById('nomeResponsavel').value,
            maxParcelas: document.getElementById('maxParcelas').value,
            jurosInicial: document.getElementById('jurosInicial').value,
            acrescimoParcela: document.getElementById('acrescimoParcela').value,
            parcelasSemJuros: document.getElementById('parcelasSemJuros').value,
            formasPagamento: document.getElementById('formasPagamento').value,
            percentualLucroPecas: document.getElementById('percentualLucroPecas').value,
            prazoLiquidacaoCartao: document.getElementById('prazoLiquidacaoCartao').value,
        };

        try {
            const oldConfig = await window.api.getAllConfigs();

            // Lógica para salvar/excluir logo
            if (elements.logoInput.files[0]) {
                const fileBuffer = await elements.logoInput.files[0].arrayBuffer();
                configData.logoPath = await window.api.saveFile(fileBuffer, 'logo.' + elements.logoInput.files[0].name.split('.').pop());
            } else if (elements.logoPreview.src === placeholderLogo) {
                configData.logoPath = '';
            } else {
                configData.logoPath = oldConfig.logoPath || '';
            }

            // Lógica para salvar/excluir assinatura
            if (elements.assinaturaInput.files[0]) {
                const fileBuffer = await elements.assinaturaInput.files[0].arrayBuffer();
                configData.assinaturaPath = await window.api.saveFile(fileBuffer, 'assinatura.' + elements.assinaturaInput.files[0].name.split('.').pop());
            } else if (elements.assinaturaPreview.src === placeholderAssinatura) {
                configData.assinaturaPath = '';
            } else {
                configData.assinaturaPath = oldConfig.assinaturaPath || '';
            }

            const result = await window.api.saveConfigs(configData);
            if (result.success) {
                showAlert('✅ Configurações salvas com sucesso!');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            showAlert('Erro ao salvar configurações.', 'danger');
        }
    });

    carregarConfiguracoes();

    // --- Lógica para Itens Arquivados ---
    const modalArquivadosEl = document.getElementById('modalArquivados');
    const modalArquivados = new bootstrap.Modal(modalArquivadosEl);
    const modalArquivadosLabel = document.getElementById('modalArquivadosLabel');
    const modalArquivadosThead = document.getElementById('modal-arquivados-thead');
    const modalArquivadosTbody = document.getElementById('modal-arquivados-tbody');

    const btnGerenciarClientes = document.getElementById('btn-gerenciar-clientes-arquivados');
    const btnGerenciarVeiculos = document.getElementById('btn-gerenciar-veiculos-arquivados');
    const btnGerenciarServicos = document.getElementById('btn-gerenciar-servicos-arquivados');

    btnGerenciarClientes.addEventListener('click', () => abrirModalArquivados('clientes'));
    btnGerenciarVeiculos.addEventListener('click', () => abrirModalArquivados('veiculos'));
    btnGerenciarServicos.addEventListener('click', () => abrirModalArquivados('servicos'));

    async function abrirModalArquivados(tipo) {
        modalArquivadosTbody.innerHTML = '<tr><td colspan="10">Carregando...</td></tr>';
        modalArquivados.show();

        let data = [];
        let headers = '';
        let renderRow = (item) => '';

        try {
            switch (tipo) {
                case 'clientes':
                    modalArquivadosLabel.textContent = 'Clientes Arquivados';
                    data = await window.api.getArchivedClientes();
                    headers = '<tr><th>ID</th><th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>Ações</th></tr>';
                    renderRow = (cliente) => `
                        <tr>
                            <td>${cliente.id}</td>
                            <td>${cliente.nome}</td>
                            <td>${cliente.cpf_cnpj}</td>
                            <td>${cliente.telefone}</td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="handleRestore('clientes', ${cliente.id}, '${cliente.nome}')"><i class="bi bi-arrow-counterclockwise"></i> Restaurar</button>
                                <button class="btn btn-sm btn-danger" onclick="handlePermanentDelete('clientes', ${cliente.id}, '${cliente.nome}')"><i class="bi bi-trash3-fill"></i> Excluir Permanentemente</button>
                            </td>
                        </tr>`;
                    break;
                case 'veiculos':
                    modalArquivadosLabel.textContent = 'Veículos Arquivados';
                    data = await window.api.getArchivedVeiculos();
                    headers = '<tr><th>ID</th><th>Placa</th><th>Marca/Modelo</th><th>Cliente</th><th>Ações</th></tr>';
                    renderRow = (veiculo) => `
                        <tr>
                            <td>${veiculo.id}</td>
                            <td>${veiculo.placa}</td>
                            <td>${veiculo.marca} ${veiculo.modelo}</td>
                            <td>${veiculo.cliente_nome}</td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="handleRestore('veiculos', ${veiculo.id}, '${veiculo.placa}')"><i class="bi bi-arrow-counterclockwise"></i> Restaurar</button>
                                <button class="btn btn-sm btn-danger" onclick="handlePermanentDelete('veiculos', ${veiculo.id}, '${veiculo.placa}')"><i class="bi bi-trash3-fill"></i> Excluir Permanentemente</button>
                            </td>
                        </tr>`;
                    break;
                case 'servicos':
                    modalArquivadosLabel.textContent = 'Serviços Arquivados';
                    data = await window.api.getArchivedServicos();
                    headers = '<tr><th>OS</th><th>Cliente</th><th>Veículo</th><th>Data</th><th>Ações</th></tr>';
                    renderRow = (servico) => `
                        <tr>
                            <td>${String(servico.id).padStart(6, '0')}</td>
                            <td>${servico.clienteNome}</td>
                            <td>${servico.placaVeiculo}</td>
                            <td>${new Date(servico.dataEntrada + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                            <td>
                                <button class="btn btn-sm btn-success" onclick="handleRestore('servicos', ${servico.id}, 'OS #${String(servico.id).padStart(6, '0')}')"><i class="bi bi-arrow-counterclockwise"></i> Restaurar</button>
                                <button class="btn btn-sm btn-danger" onclick="handlePermanentDelete('servicos', ${servico.id}, 'OS #${String(servico.id).padStart(6, '0')}')"><i class="bi bi-trash3-fill"></i> Excluir Permanentemente</button>
                            </td>
                        </tr>`;
                    break;
            }

            modalArquivadosThead.innerHTML = headers;
            if (data.length > 0) {
                modalArquivadosTbody.innerHTML = data.map(renderRow).join('');
            } else {
                modalArquivadosTbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhum item arquivado encontrado.</td></tr>';
            }
        } catch (error) {
            console.error(`Erro ao carregar ${tipo} arquivados:`, error);
            modalArquivadosTbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
        }
    }

    window.handleRestore = (tipo, id, nome) => {
        showConfirm(`Tem certeza que deseja restaurar "${nome}"? Ele voltará a aparecer nas listagens principais.`, async () => {
            try {
                let success = false;
                switch (tipo) {
                    case 'clientes': success = await window.api.restoreCliente(id); break;
                    case 'veiculos': success = await window.api.restoreVeiculo(id); break;
                    case 'servicos': success = await window.api.restoreServico(id); break;
                }
                if (success) {
                    showAlert('✅ Item restaurado com sucesso!');
                    abrirModalArquivados(tipo); // Recarrega a lista do modal
                } else {
                    throw new Error('A restauração falhou no backend.');
                }
            } catch (error) {
                console.error('Erro ao restaurar:', error);
                showAlert(`Erro ao restaurar item: ${error.message}`, 'danger');
            }
        });
    };

    window.handlePermanentDelete = (tipo, id, nome) => {
        showConfirm(`ATENÇÃO: Exclusão permanente! Tem certeza que deseja apagar "${nome}" para sempre? Esta ação não pode ser desfeita.`, async () => {
            try {
                let success = false;
                switch (tipo) {
                    case 'clientes': success = await window.api.permanentlyDeleteCliente(id); break;
                    case 'veiculos': success = await window.api.permanentlyDeleteVeiculo(id); break;
                    case 'servicos': success = await window.api.permanentlyDeleteServico(id); break;
                }
                if (success) {
                    showAlert('🗑️ Item excluído permanentemente.', 'success');
                    abrirModalArquivados(tipo); // Recarrega a lista do modal
                } else {
                    throw new Error('A exclusão permanente falhou no backend.');
                }
            } catch (error) {
                console.error('Erro ao excluir permanentemente:', error);
                showAlert(`Erro ao excluir item: ${error.message}`, 'danger');
            }
        });
    };
    // --- Lógica de Gerenciamento de Usuários ---

    // Elementos
    const modalUsuarioEl = document.getElementById('modalUsuario');
    const modalUsuario = new bootstrap.Modal(modalUsuarioEl);
    const formUsuario = document.getElementById('form-usuario');
    const listaUsuariosTbody = document.getElementById('lista-usuarios');

    // Funções Globais (para acesso via HTML onclick)
    window.abrirModalUsuario = (id = null, nome = '', username = '', role = 'mecanico') => {
        document.getElementById('usuario-id').value = id || '';
        document.getElementById('usuario-nome').value = nome;
        document.getElementById('usuario-username').value = username;
        document.getElementById('usuario-role').value = role;
        document.getElementById('usuario-senha').value = ''; // Sempre limpo
        document.getElementById('usuario-senha').placeholder = id ? "Deixe em branco para manter a atual" : "Senha";
        document.getElementById('usuario-senha').required = !id; // Obrigatório apenas se novo

        document.getElementById('modalUsuarioLabel').textContent = id ? 'Editar Usuário' : 'Novo Usuário';
        // Reset validation state
        formUsuario.classList.remove('was-validated');
    };

    window.salvarUsuario = async () => {
        if (!formUsuario.checkValidity()) {
            formUsuario.classList.add('was-validated');
            return;
        }

        const id = document.getElementById('usuario-id').value;
        const usuario = {
            id: id ? parseInt(id) : null,
            nome: document.getElementById('usuario-nome').value,
            username: document.getElementById('usuario-username').value,
            password: document.getElementById('usuario-senha').value,
            role: document.getElementById('usuario-role').value
        };

        try {
            let result;
            if (usuario.id) {
                result = await window.api.updateUser(usuario);
            } else {
                result = await window.api.addUser(usuario);
            }

            if (result.success) {
                showAlert('✅ Usuário salvo com sucesso!');
                modalUsuario.hide();
                carregarUsuarios();
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            alert('Erro ao salvar usuário.');
        }
    };

    window.excluirUsuario = (id, nome) => {
        showConfirm(`Tem certeza que deseja excluir o usuário "${nome}"?`, async () => {
            try {
                const result = await window.api.deleteUser(id);
                if (result.success) {
                    showAlert('🗑️ Usuário excluído.', 'success');
                    carregarUsuarios();
                } else {
                    alert(`Erro: ${result.message}`);
                }
            } catch (error) {
                console.error("Erro ao excluir usuário:", error);
                alert('Erro ao excluir usuário.');
            }
        }, 'Excluir Usuário');
    };

    async function carregarUsuarios() {
        try {
            // Check permission/role first? Backend handles it, but UI acts nice.
            const currentUser = await window.api.getCurrentUser();
            if (!currentUser || currentUser.role !== 'admin') {
                // Should hide tab or show unauthorized message
                document.getElementById('usuarios-tab').parentElement.style.display = 'none';
                return;
            }

            const users = await window.api.getUsers();
            if (users.length === 0) {
                listaUsuariosTbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário encontrado.</td></tr>';
                return;
            }

            const roleMap = {
                'admin': '<span class="badge bg-danger">Administrador</span>',
                'financeiro': '<span class="badge bg-warning text-dark">Financeiro</span>',
                'mecanico': '<span class="badge bg-secondary">Mecânico</span>'
            };

            // Store in global scope for access
            window.allUsers = users;

            listaUsuariosTbody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.nome}</td>
                    <td>${u.username}</td>
                    <td>${roleMap[u.role] || u.role}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1" 
                            onclick="abrirModalUsuarioFromId(${u.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${u.role !== 'admin' || users.filter(x => x.role === 'admin').length > 1 ? `
                        <button class="btn btn-sm btn-danger" onclick="excluirUsuario(${u.id}, '${u.nome.replace(/'/g, "\\'")}')">
                            <i class="bi bi-trash"></i>
                        </button>` : ''}
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error("Erro ao carregar usuários:", error);
        }
    }

    // New helper to avoid inline object passing issues
    window.abrirModalUsuarioFromId = (id) => {
        const user = window.allUsers.find(u => u.id === id);
        if (user) {
            abrirModalUsuario(user.id, user.nome, user.username, user.role);
            modalUsuario.show();
        } else {
            console.error("Usuário não encontrado para o ID:", id);
        }
    };


    // Load users initially
    carregarUsuarios();

});
