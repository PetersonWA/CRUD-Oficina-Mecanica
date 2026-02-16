describe('Testes da Página de Configurações', () => {
    let mockConfig;

    beforeEach(() => {
        // Mock de uma configuração de exemplo, com nomes de propriedade corretos (camelCase)
        mockConfig = {
            nomeOficina: 'Oficina Teste Cypress',
            endereco: 'Rua de Teste, 456',
            telefone: '(21) 91234-5678',
            email: 'contato@oficinateste.com',
            cnpj: '98.765.432/0001-21',
            nomeResponsavel: 'João da Silva',
            logoPath: 'path/to/mock/logo.png',
            assinaturaPath: 'path/to/mock/assinatura.png',
            // Campos financeiros com a nomenclatura correta
            percentualLucroPecas: 25,
            jurosInicial: 3.5,
            acrescimoParcela: 0.8,
            prazoLiquidacaoCartao: 45,
            formasPagamento: 'Dinheiro, PIX, Cartão (débito/crédito)',
            maxParcelas: 12,
            parcelasSemJuros: 1
        };

        cy.on('window:before:load', (win) => {
            win.api = {
                getAllConfigs: cy.stub().resolves(mockConfig),
                saveConfigs: cy.stub().resolves({ success: true }),
                saveFile: cy.stub().resolves('path/to/new/uploaded/image.png'),
                getPlanoContas: cy.stub().resolves([]),
                send: cy.stub(),
                receive: cy.stub().returns(() => {}),
                invoke: cy.stub().resolves({}),
                getArchivedClientes: cy.stub().resolves([]),
                getArchivedVeiculos: cy.stub().resolves([]),
                getArchivedServicos: cy.stub().resolves([])
            };
        });

        cy.visit('configuracoes.html');
    });

    it('Deve carregar e exibir as configurações existentes, incluindo as financeiras', () => {
        cy.get('#nomeOficina').should('have.value', mockConfig.nomeOficina);
        cy.get('#endereco').should('have.value', mockConfig.endereco);
        cy.get('#telefone').should('have.value', mockConfig.telefone);
        cy.get('#email').should('have.value', mockConfig.email);
        cy.get('#cnpj').should('have.value', mockConfig.cnpj);
        cy.get('#nomeResponsavel').should('have.value', mockConfig.nomeResponsavel);
        cy.get('#logo-preview').should('have.attr', 'src').and('include', mockConfig.logoPath);
        cy.get('#assinatura-preview').should('have.attr', 'src').and('include', mockConfig.assinaturaPath);
        
        // Verificando campos financeiros com a nomenclatura correta
        cy.get('#percentualLucroPecas').should('have.value', mockConfig.percentualLucroPecas);
        cy.get('#jurosInicial').should('have.value', mockConfig.jurosInicial);
        cy.get('#acrescimoParcela').should('have.value', mockConfig.acrescimoParcela);
        cy.get('#prazoLiquidacaoCartao').should('have.value', mockConfig.prazoLiquidacaoCartao);
        cy.get('#formasPagamento').should('have.value', mockConfig.formasPagamento);
        cy.get('#maxParcelas').should('have.value', mockConfig.maxParcelas);
        cy.get('#parcelasSemJuros').should('have.value', mockConfig.parcelasSemJuros);

        cy.window().its('api.getAllConfigs').should('have.been.calledOnce');
    });

    it('Deve salvar novas informações de texto e financeiras', () => {
        const newTextConfig = {
            nomeOficina: 'Oficina Tech Atualizada',
            email: 'novo.email@teste.com'
        };
        const newFinancialConfig = {
            percentualLucroPecas: "30",
            jurosInicial: "4.0",
            acrescimoParcela: "1.2",
            prazoLiquidacaoCartao: "60",
            formasPagamento: 'Dinheiro, PIX, Cartão, Boleto'
        };

        cy.get('#nomeOficina').clear().type(newTextConfig.nomeOficina);
        cy.get('#email').clear().type(newTextConfig.email);
        cy.get('#percentualLucroPecas').clear().type(newFinancialConfig.percentualLucroPecas);
        cy.get('#jurosInicial').clear().type(newFinancialConfig.jurosInicial);
        cy.get('#acrescimoParcela').clear().type(newFinancialConfig.acrescimoParcela);
        cy.get('#prazoLiquidacaoCartao').clear().type(newFinancialConfig.prazoLiquidacaoCartao);
        cy.get('#formasPagamento').clear().type(newFinancialConfig.formasPagamento);

        cy.get('#config-form').submit();

        // Verifica se a API de salvamento foi chamada com os dados esperados
        cy.window().its('api.saveConfigs').should('have.been.calledWith', Cypress.sinon.match({
            ...newTextConfig,
            ...newFinancialConfig,
            // Certifique-se de que os campos não alterados também estão presentes
            telefone: mockConfig.telefone, 
        }));

        cy.get('#alert-container').should('contain', '✅ Configurações salvas com sucesso!');
    });

    it('Deve fazer upload de uma nova imagem de logo', () => {
        const filePath = 'data/logo.png'; 

        cy.get('#logo').selectFile(filePath, { action: 'drag-drop', force: true });
        cy.get('#logo-preview').should('have.attr', 'src').and('match', /^data:image\/.*;base64,/);

        cy.get('#config-form').submit();

        cy.window().its('api.saveFile').should('have.been.calledOnce');
        cy.window().its('api.saveConfigs').should('have.been.calledWith', Cypress.sinon.match({
            logoPath: 'path/to/new/uploaded/image.png'
        }));
        cy.get('#alert-container').should('contain', '✅ Configurações salvas com sucesso!');
    });

    it('Deve excluir a imagem da assinatura', () => {
        cy.get('#delete-assinatura').click();
        cy.get('#modalConfirmarExclusao').should('be.visible');
        cy.get('#btnConfirmarExclusao').click();

        cy.get('#assinatura-preview').should('have.attr', 'src').and('match', /^data:image\/svg\+xml,/);

        cy.get('#config-form').submit();

        cy.window().its('api.saveConfigs').should('have.been.calledWith', Cypress.sinon.match({
            assinaturaPath: ''
        }));
        cy.get('#alert-container').should('contain', '✅ Configurações salvas com sucesso!');
    });

    describe('Funcionalidade de Itens Arquivados', () => {
        const mockArchivedData = {
            clientes: [
                { id: 101, nome: 'Cliente Arquivado Teste', cpf_cnpj: '111.111.111-11', telefone: '1111-1111' }
            ],
            veiculos: [
                { id: 202, placa: 'ARQ-1234', marca: 'Marca Teste', modelo: 'Modelo Arquivado', cliente_nome: 'Cliente Arquivado Teste' }
            ],
            servicos: [
                { id: 303, clienteNome: 'Cliente Arquivado Teste', placaVeiculo: 'ARQ-1234', dataEntrada: '2025-01-15' }
            ]
        };

        beforeEach(() => {
            // Sobrescreve os stubs da API para retornar dados arquivados
            cy.on('window:before:load', (win) => {
                win.api.getArchivedClientes = cy.stub().resolves(mockArchivedData.clientes);
                win.api.getArchivedVeiculos = cy.stub().resolves(mockArchivedData.veiculos);
                win.api.getArchivedServicos = cy.stub().resolves(mockArchivedData.servicos);
                win.api.restoreCliente = cy.stub().resolves({ success: true });
                win.api.permanentlyDeleteCliente = cy.stub().resolves({ success: true });
            });
            // Re-visita a página para garantir que os novos mocks sejam aplicados
            cy.visit('configuracoes.html');
        });

        it('Deve abrir o modal e exibir clientes arquivados', () => {
            cy.get('#btn-gerenciar-clientes-arquivados').click();
            cy.get('#modalArquivados').should('be.visible');
            cy.get('#modalArquivadosLabel').should('contain', 'Clientes Arquivados');

            const cliente = mockArchivedData.clientes[0];
            cy.get('#modal-arquivados-tbody tr').should('have.length', 1);
            cy.get('#modal-arquivados-tbody').contains('td', cliente.nome).should('be.visible');
            cy.get('#modal-arquivados-tbody').contains('td', cliente.cpf_cnpj).should('be.visible');
        });

        it('Deve abrir o modal e exibir veículos arquivados', () => {
            cy.get('#btn-gerenciar-veiculos-arquivados').click();
            cy.get('#modalArquivados').should('be.visible');
            cy.get('#modalArquivadosLabel').should('contain', 'Veículos Arquivados');

            const veiculo = mockArchivedData.veiculos[0];
            cy.get('#modal-arquivados-tbody tr').should('have.length', 1);
            cy.get('#modal-arquivados-tbody').contains('td', veiculo.placa).should('be.visible');
            cy.get('#modal-arquivados-tbody').contains('td', `${veiculo.marca} ${veiculo.modelo}`).should('be.visible');
        });

        it('Deve abrir o modal e exibir serviços arquivados', () => {
            cy.get('#btn-gerenciar-servicos-arquivados').click();
            cy.get('#modalArquivados').should('be.visible');
            cy.get('#modalArquivadosLabel').should('contain', 'Serviços Arquivados');

            const servico = mockArchivedData.servicos[0];
            cy.get('#modal-arquivados-tbody tr').should('have.length', 1);
            cy.get('#modal-arquivados-tbody').contains('td', String(servico.id).padStart(6, '0')).should('be.visible');
            cy.get('#modal-arquivados-tbody').contains('td', servico.clienteNome).should('be.visible');
        });
    });
});