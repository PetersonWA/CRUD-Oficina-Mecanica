/* Scripts específicos para a página de Cadastro de Serviço */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('servico-form');
    if (!form) return; // Exit if not on the right page

    const searchClienteInput = document.getElementById('search-cliente-input');
    const clienteHiddenInput = document.getElementById('cliente');
    const clienteSearchResults = document.getElementById('cliente-search-results');
    const selectVeiculo = document.getElementById('veiculo');
    const quilometragemInput = document.getElementById('quilometragemVeiculo');
    const pecasBody = document.getElementById('pecas-servico-body');
    const btnAdicionarPeca = document.getElementById('adicionar-peca');
    const valorMaoDeObraInput = document.getElementById('valor-mao-de-obra');
    const subtotalDisplay = document.getElementById('subtotal-servico');
    const descontoInput = document.getElementById('desconto-percentual');
    const valorDescontoDisplay = document.getElementById('valor-desconto');
    const totalFinalDisplay = document.getElementById('total-final-servico');
    const formaPagamentoSelect = document.getElementById('formaPagamento');
    const parcelasContainer = document.getElementById('parcelas-container');
    const numeroParcelasInput = document.getElementById('numeroParcelas');

    let listaClientes = [];
    let listaVeiculos = [];
    let config = {};

    // Attach functions to window for inline event handlers
    window.removerPeca = removerPeca;

    async function carregarDadosIniciais() {
        try {
            const [clientes, veiculos, loadedConfig] = await Promise.all([
                lerDados("clientes.json"),
                lerDados("veiculos.json"),
                lerDados("configuracao.json")
            ]);

            listaClientes = clientes || [];
            listaVeiculos = veiculos || [];
            config = loadedConfig || {};

            const maxParcelas = parseInt(config.maxParcelas, 10) || 12;
            numeroParcelasInput.innerHTML = '';
            for (let i = 1; i <= maxParcelas; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}x`;
                if (i === 1) option.selected = true;
                numeroParcelasInput.appendChild(option);
            }

            selectVeiculo.disabled = true;
            selectVeiculo.innerHTML = '<option value="">Selecione um veículo...</option>';

            descontoInput.addEventListener('input', calcularTotal);
            valorMaoDeObraInput.addEventListener('input', calcularTotal);
        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
        }
    }

    function carregarVeiculosDoCliente(clienteDoc) {
        selectVeiculo.innerHTML = '<option value="">Selecione um veículo...</option>';
        selectVeiculo.disabled = true;
        quilometragemInput.value = '';

        if (clienteDoc) {
            const cliente = listaClientes.find(c => c.documento === clienteDoc);
            if (!cliente) {
                showAlert('Cliente não encontrado na lista.', 'danger');
                return;
            }
            const veiculosDoCliente = listaVeiculos.filter(v => v.cliente === cliente.nome);

            if (veiculosDoCliente.length > 0) {
                veiculosDoCliente.forEach(veiculo => {
                    const option = document.createElement('option');
                    option.value = veiculo.placa;
                    option.textContent = `${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})`;
                    selectVeiculo.appendChild(option);
                });
                selectVeiculo.disabled = false;
            } else {
                showAlert('Este cliente não possui veículos cadastrados.', 'warning');
            }
        }
    }

    searchClienteInput.addEventListener('input', () => {
        const searchTerm = searchClienteInput.value.toLowerCase();
        clienteSearchResults.innerHTML = '';

        if (searchTerm.length === 0) {
            clienteHiddenInput.value = ''; // Limpa o valor se a busca for apagada
            return;
        }

        const filteredClientes = listaClientes.filter(cliente =>
            cliente.nome.toLowerCase().includes(searchTerm) || cliente.documento.includes(searchTerm)
        );

        filteredClientes.forEach(cliente => {
            const item = document.createElement('a');
            item.href = '#';
            item.classList.add('list-group-item', 'list-group-item-action');
            item.textContent = `${cliente.nome} (${cliente.documento})`;
            item.dataset.documento = cliente.documento;
            item.dataset.nome = cliente.nome;
            clienteSearchResults.appendChild(item);
        });
    });

    clienteSearchResults.addEventListener('click', (e) => {
        if (e.target && e.target.matches('a.list-group-item')) {
            e.preventDefault();
            const clienteDoc = e.target.dataset.documento;
            const clienteNome = e.target.dataset.nome;

            searchClienteInput.value = clienteNome;
            clienteHiddenInput.value = clienteDoc;
            clienteSearchResults.innerHTML = '';

            carregarVeiculosDoCliente(clienteDoc);
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!searchClienteInput.contains(e.target) && !clienteSearchResults.contains(e.target)) {
            clienteSearchResults.innerHTML = '';
        }
    });

    selectVeiculo.addEventListener('change', () => {
        const placaSelecionada = selectVeiculo.value;
        if (placaSelecionada) {
            const veiculo = listaVeiculos.find(v => v.placa === placaSelecionada);
            if (veiculo) quilometragemInput.value = veiculo.quilometragem || '';
        } else {
            quilometragemInput.value = '';
        }
    });

    function adicionarPeca() {
        const row = document.createElement('tr');
        row.classList.add('peca-row');
        row.innerHTML = `
            <td><input type="text" class="form-control form-control-sm" name="descricao" placeholder="Descrição da peça" required></td>
            <td><input type="number" class="form-control form-control-sm" name="quantidade" value="1" min="1" step="1" required></td>
            <td><input type="number" class="form-control form-control-sm" name="valor" placeholder="0.00" min="0" step="0.01" required></td>
            <td><button type="button" class="btn btn-danger btn-sm" onclick="removerPeca(this)"><i class="bi bi-trash"></i></button></td>
        `;
        pecasBody.appendChild(row);
        row.querySelectorAll('input').forEach(input => input.addEventListener('input', calcularTotal));
        calcularTotal();
    }

    function removerPeca(button) {
        button.closest('tr').remove();
        calcularTotal();
    }

    function calcularTotal() {
        let subtotal = 0;
        pecasBody.querySelectorAll('.peca-row').forEach(row => {
            const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
            const valor = parseFloat(row.querySelector('[name=valor]').value) || 0;
            subtotal += quantidade * valor;
        });

        const maoDeObra = parseFloat(valorMaoDeObraInput.value) || 0;
        subtotal += maoDeObra;

        const descontoPercentual = parseFloat(descontoInput.value) || 0;
        const descontoValor = subtotal * (descontoPercentual / 100);
        const totalFinal = subtotal - descontoValor;

        subtotalDisplay.textContent = `R$ ${totalFinal.toFixed(2)}`; // Corrected to show final value, not subtotal
        valorDescontoDisplay.textContent = `- R$ ${descontoValor.toFixed(2)}`;
        totalFinalDisplay.textContent = `R$ ${totalFinal.toFixed(2)}`;
        atualizarValorParcela();
    }

    function atualizarValorParcela() {
        const jurosInicial = parseFloat(config.jurosInicial) || 0;
        const acrescimoParcela = parseFloat(config.acrescimoParcela) || 0;
        const parcelasSemJuros = parseInt(config.parcelasSemJuros, 10) || 0;
        const maxParcelas = parseInt(config.maxParcelas, 10) || 12;

        if (formaPagamentoSelect.value !== 'Cartão de Crédito') {
            for (let i = 1; i <= maxParcelas; i++) {
                const option = numeroParcelasInput.querySelector(`option[value="${i}"]`);
                if (option) option.textContent = `${i}x`;
            }
            return;
        }

        let subtotal = 0;
        pecasBody.querySelectorAll('.peca-row').forEach(row => {
            const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
            const valor = parseFloat(row.querySelector('[name=valor]').value) || 0;
            subtotal += quantidade * valor;
        });
        subtotal += parseFloat(valorMaoDeObraInput.value) || 0;

        const descontoPercentual = parseFloat(descontoInput.value) || 0;
        const descontoValor = subtotal * (descontoPercentual / 100);
        const totalFinal = subtotal - descontoValor;

        if (totalFinal > 0) {
            for (let i = 1; i <= maxParcelas; i++) {
                const option = numeroParcelasInput.querySelector(`option[value="${i}"]`);
                if (option) {
                    let valorParcela;
                    if (i <= parcelasSemJuros) {
                        valorParcela = totalFinal / i;
                        option.textContent = `${i}x de R$ ${valorParcela.toFixed(2)} (sem juros)`;
                    } else {
                        const taxaPercentual = jurosInicial + ((i - parcelasSemJuros - 1) * acrescimoParcela);
                        const i_juros = taxaPercentual / 100;
                        if (i_juros > 0) {
                            const n_parcelas = i;
                            const pv = totalFinal;
                            valorParcela = pv * (i_juros * Math.pow(1 + i_juros, n_parcelas)) / (Math.pow(1 + i_juros, n_parcelas) - 1);
                            option.textContent = `${i}x de R$ ${valorParcela.toFixed(2)}`;
                        } else {
                            valorParcela = totalFinal / i;
                            option.textContent = `${i}x de R$ ${valorParcela.toFixed(2)}`;
                        }
                    }
                }
            }
        } else {
            for (let i = 1; i <= maxParcelas; i++) {
                const option = numeroParcelasInput.querySelector(`option[value="${i}"]`);
                if (option) option.textContent = `${i}x`;
            }
        }
    }

    btnAdicionarPeca.addEventListener('click', () => adicionarPeca());

    formaPagamentoSelect.addEventListener('change', () => {
        parcelasContainer.style.display = formaPagamentoSelect.value === 'Cartão de Crédito' ? 'block' : 'none';
        atualizarValorParcela();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const itens = [];
        let subtotal = 0;

        pecasBody.querySelectorAll('.peca-row').forEach(row => {
            const descricao = row.querySelector('[name=descricao]').value;
            const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
            const valor = parseFloat(row.querySelector('[name=valor]').value) || 0;
            if(descricao && quantidade > 0 && valor > 0) {
                itens.push({ descricao, quantidade, valor, tipo: 'Peça' });
                subtotal += quantidade * valor;
            }
        });

        const maoDeObraValor = parseFloat(valorMaoDeObraInput.value) || 0;
        if (maoDeObraValor > 0) {
            itens.push({ descricao: 'Mão de Obra', quantidade: 1, valor: maoDeObraValor, tipo: 'Mão de Obra' });
            subtotal += maoDeObraValor;
        }

        if (itens.length === 0) {
            showAlert('Adicione pelo menos uma peça ou um valor de mão de obra.', 'warning');
            return;
        }

        const descontoPercentual = parseFloat(descontoInput.value) || 0;
        const descontoValor = subtotal * (descontoPercentual / 100);
        const totalFinal = subtotal - descontoValor;

        const placaVeiculo = selectVeiculo.value;
        const novaQuilometragem = quilometragemInput.value;
        if (placaVeiculo && novaQuilometragem) {
            const veiculosAtuais = await lerDados('veiculos.json');
            const veiculoIndex = veiculosAtuais.findIndex(v => v.placa === placaVeiculo);
            if (veiculoIndex !== -1) {
                const kmAntiga = parseInt(veiculosAtuais[veiculoIndex].quilometragem, 10) || 0;
                const kmNova = parseInt(novaQuilometragem, 10);
                if (kmNova >= kmAntiga) {
                    veiculosAtuais[veiculoIndex].quilometragem = kmNova;
                    await salvarDados('veiculos.json', veiculosAtuais);
                    listaVeiculos = veiculosAtuais;
                }
            }
        }

        const servicos = await lerDados('servicos.json') || [];
        const maiorId = servicos.reduce((max, s) => (s.id > max) ? s.id : max, 0);
        const novoServicoId = maiorId + 1;

        const clienteSelecionado = listaClientes.find(c => c.documento === clienteHiddenInput.value);
        if (!clienteSelecionado) {
            showAlert('Por favor, selecione um cliente válido da lista.', 'danger');
            return;
        }
        const formaPagamento = formaPagamentoSelect.value;
        const numeroParcelas = parseInt(numeroParcelasInput.value, 10) || 1;

        let valorFinalParaSalvar = totalFinal;
        let statusPagamento = 'Pendente';

        if (formaPagamento === 'Cartão de Crédito') {
            statusPagamento = 'Pago';
            const jurosInicial = parseFloat(config.jurosInicial) || 0;
            const acrescimoParcela = parseFloat(config.acrescimoParcela) || 0;
            const parcelasSemJuros = parseInt(config.parcelasSemJuros, 10) || 0;

            if (numeroParcelas > parcelasSemJuros) {
                const taxaPercentual = jurosInicial + ((numeroParcelas - parcelasSemJuros - 1) * acrescimoParcela);
                const i_juros = taxaPercentual / 100;
                if (i_juros > 0) {
                    const valorParcela = totalFinal * (i_juros * Math.pow(1 + i_juros, numeroParcelas)) / (Math.pow(1 + i_juros, numeroParcelas) - 1);
                    valorFinalParaSalvar = valorParcela * numeroParcelas;
                }
            }
        }

        const novoServico = {
            id: novoServicoId,
            clienteNome: clienteSelecionado.nome,
            clienteDoc: clienteHiddenInput.value,
            placaVeiculo: selectVeiculo.value,
            dataEntrada: document.getElementById('dataEntrada').value,
            problemaRelatado: document.getElementById('problemaRelatado').value,
            mecanico: document.getElementById('mecanico').value,
            status: document.getElementById('statusServico').value,
            statusPagamento: statusPagamento,
            itens: itens,
            valor: valorFinalParaSalvar,
            descontoPercentual: descontoPercentual,
            descontoValor: descontoValor,
            quilometragem: novaQuilometragem,
            formaPagamento: formaPagamento,
            parcelas: formaPagamento === 'Cartão de Crédito' ? numeroParcelas : null,
            pagamentos: []
        };

        if (formaPagamento === 'Cartão de Crédito') {
            const pagamento = {
                id: Date.now(),
                data: new Date().toISOString().split('T')[0],
                valor: valorFinalParaSalvar,
                metodo: 'Cartão de Crédito',
                anotacao: `Pagamento em ${numeroParcelas}x`
            };
            novoServico.pagamentos.push(pagamento);
        }

        servicos.push(novoServico);
        await salvarDados('servicos.json', servicos);

        showAlert('✅ Serviço salvo com sucesso!');
        form.reset();
        searchClienteInput.value = '';
        clienteHiddenInput.value = '';
        selectVeiculo.innerHTML = '<option value="">Selecione um veículo...</option>';
        selectVeiculo.disabled = true;
        quilometragemInput.value = '';
        pecasBody.innerHTML = '';
        calcularTotal();
        formaPagamentoSelect.dispatchEvent(new Event('change'));
    });

    carregarDadosIniciais();
});