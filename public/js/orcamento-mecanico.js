/* Scripts específicos para a página de Orçamento Mecânico */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('orcamentoForm');
  if (!form) return; // Exit if not on the right page

  const searchClienteInput = document.getElementById('search-cliente-input');
  const clienteHiddenInput = document.getElementById('clienteOrcamento');
  const clienteSearchResults = document.getElementById('cliente-search-results');
  const selectVeiculo = document.getElementById('veiculoOrcamento');
  const telefoneInput = document.getElementById('telefoneOrcamento');
  const emailInput = document.getElementById('emailOrcamento');
  const modeloVeiculoInput = document.getElementById('modeloVeiculo');
  const placaVeiculoInput = document.getElementById('placaVeiculo');
  const kmVeiculoInput = document.getElementById('kmVeiculo');
  const statusOrcamentoContainer = document.getElementById('statusOrcamentoContainer');
  const statusOrcamentoSelect = document.getElementById('statusOrcamento');
  const pecasBody = document.getElementById('pecas-orcamento-body');
  const btnAdicionarPeca = document.getElementById('adicionar-peca');
  const valorMaoDeObraInput = document.getElementById('valor-mao-de-obra');
  const subtotalDisplay = document.getElementById('subtotal-orcamento');
  const descontoInput = document.getElementById('desconto-percentual');
  const valorDescontoDisplay = document.getElementById('valor-desconto');
  const totalFinalDisplay = document.getElementById('total-final-orcamento');

  let listaClientes = [];
  let listaVeiculos = [];
  let orcamentoIdEmEdicao = null;

  // Attach functions to window for inline event handlers
  window.salvarEGerarPDF = salvarEGerarPDF;
  window.removerPeca = removerPeca;

  async function carregarDadosIniciais() {
    const urlParams = new URLSearchParams(window.location.search);
    orcamentoIdEmEdicao = urlParams.get('id');

    [listaClientes, listaVeiculos] = await Promise.all([
        lerDados('clientes.json'),
        lerDados('veiculos.json')
    ]);

    if (orcamentoIdEmEdicao) {
      document.querySelector('h2.text-primary').textContent = 'Editar Orçamento Mecânico';
      document.querySelector('.btn-lg').innerHTML = '<i class="bi bi-save me-2"></i>Salvar Alterações e Gerar PDF';
      statusOrcamentoContainer.style.display = 'block';
      await carregarOrcamentoParaEdicao(orcamentoIdEmEdicao);
    } else {
      statusOrcamentoContainer.style.display = 'none';
    }
    
    descontoInput.addEventListener('input', calcularTotal);
    valorMaoDeObraInput.addEventListener('input', () => {
        maskCurrency(valorMaoDeObraInput);
        calcularTotal();
    });
    btnAdicionarPeca.addEventListener('click', () => adicionarPeca());
  }

  async function carregarOrcamentoParaEdicao(id) {
    const orcamentos = await lerDados('orcamentos.json');
    const orcamento = orcamentos.find(o => o.id === parseInt(id));

    if (!orcamento) {
      showAlert('Orçamento não encontrado para edição.', 'danger');
      return;
    }

    const cliente = listaClientes.find(c => c.nome === orcamento.clienteNome);
    if (cliente) {
      searchClienteInput.value = cliente.nome;
      clienteHiddenInput.value = cliente.documento;
      carregarDadosDoCliente(cliente.documento);
    }
    
    setTimeout(() => {
        const veiculo = listaVeiculos.find(v => v.placa === orcamento.placaVeiculo);
        if(veiculo) {
            selectVeiculo.value = veiculo.placa;
            selectVeiculo.dispatchEvent(new Event('change'));
        }
    }, 500);

    document.getElementById('problemaRelatado').value = orcamento.problemaRelatado;
    statusOrcamentoSelect.value = orcamento.status;
    descontoInput.value = orcamento.descontoPercentual || 0;
    
    pecasBody.innerHTML = '';
    orcamento.itens.forEach(item => {
      if (item.tipo === 'Peça') {
        adicionarPeca(item.descricao, item.quantidade, item.valor);
      } else if (item.tipo === 'Mão de Obra') {
        valorMaoDeObraInput.value = formatarValor(item.valor);
        maskCurrency(valorMaoDeObraInput);
      }
    });
    calcularTotal();
  }

  function carregarDadosDoCliente(clienteDoc) {
    selectVeiculo.innerHTML = '<option value="">Selecione um veículo...</option>';
    selectVeiculo.disabled = true;
    telefoneInput.value = '';
    emailInput.value = '';

    if (clienteDoc) {
      const cliente = listaClientes.find(c => c.documento === clienteDoc);
      telefoneInput.value = cliente.telefone;
      emailInput.value = cliente.email;

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
        modeloVeiculoInput.value = '';
        placaVeiculoInput.value = '';
        kmVeiculoInput.value = '';
      }
    } else {
        modeloVeiculoInput.value = '';
        placaVeiculoInput.value = '';
        kmVeiculoInput.value = '';
    }
  }

  searchClienteInput.addEventListener('input', () => {
      const searchTerm = searchClienteInput.value.toLowerCase();
      clienteSearchResults.innerHTML = '';

      if (searchTerm.length === 0) {
          clienteHiddenInput.value = '';
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

          carregarDadosDoCliente(clienteDoc);
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
        if (veiculo) {
            modeloVeiculoInput.value = `${veiculo.marca} ${veiculo.modelo}`;
            placaVeiculoInput.value = veiculo.placa;
            kmVeiculoInput.value = veiculo.quilometragem;
        }
    } else {
        modeloVeiculoInput.value = '';
        placaVeiculoInput.value = '';
        kmVeiculoInput.value = '';
    }
  });

  function adicionarPeca(descricao = '', quantidade = 1, valor = 0.00) {
    const row = document.createElement('tr');
    row.classList.add('peca-row');
    row.innerHTML = `
      <td><input type="text" class="form-control form-control-sm" placeholder="Descrição da Peça" name="descricao" value="${descricao}"></td>
      <td><input type="number" class="form-control form-control-sm" value="${quantidade}" min="1" name="quantidade"></td>
      <td><input type="text" class="form-control form-control-sm" value="${formatarValor(valor)}" placeholder="R$ 0,00" name="valor"></td>
      <td><button type="button" class="btn btn-danger btn-sm" onclick="removerPeca(this)"><i class="bi bi-trash"></i></button></td>
    `;
    pecasBody.appendChild(row);

    const valorInput = row.querySelector('[name=valor]');
    valorInput.addEventListener('input', () => maskCurrency(valorInput));

    row.querySelectorAll('input').forEach(input => input.addEventListener('input', calcularTotal));
    calcularTotal();
  }

  function removerPeca(button) {
    button.closest('tr').remove();
    calcularTotal();
  }

  function getNumericValue(valueString) {
      return parseFloat(String(valueString).replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.')) || 0;
  }

  function calcularTotal() {
    let subtotal = 0;
    pecasBody.querySelectorAll('.peca-row').forEach(row => {
      const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
      const valor = getNumericValue(row.querySelector('[name=valor]').value);
      subtotal += quantidade * valor;
    });

    const maoDeObra = getNumericValue(valorMaoDeObraInput.value);
    subtotal += maoDeObra;

    const descontoPercentual = parseFloat(descontoInput.value) || 0;
    const descontoValor = subtotal * (descontoPercentual / 100);
    const totalFinal = subtotal - descontoValor;

    subtotalDisplay.textContent = `R$ ${formatarValor(subtotal)}`;
    valorDescontoDisplay.textContent = `- R$ ${formatarValor(descontoValor)}`;
    totalFinalDisplay.textContent = `R$ ${formatarValor(totalFinal)}`;
  }

  async function salvarEGerarPDF() {
    const clienteDoc = clienteHiddenInput.value;
    const placaVeiculo = selectVeiculo.value;
    if (!clienteDoc || !placaVeiculo) {
      showAlert('Por favor, selecione um cliente e um veículo.', 'warning');
      return;
    }
    const cliente = listaClientes.find(c => c.documento === clienteDoc);
    if (!cliente) {
        showAlert('Cliente selecionado não é válido. Por favor, busque e selecione novamente.', 'danger');
        return;
    }
    const veiculo = listaVeiculos.find(v => v.placa === placaVeiculo);
    
    const itens = [];
    let subtotal = 0;

    pecasBody.querySelectorAll('.peca-row').forEach(row => {
        const descricao = row.querySelector('[name=descricao]').value;
        const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
        const valor = getNumericValue(row.querySelector('[name=valor]').value);

        if(descricao && quantidade > 0 && valor > 0) {
            itens.push({ descricao, quantidade, valor, tipo: 'Peça' });
            subtotal += quantidade * valor;
        }
    });

    const maoDeObraValor = getNumericValue(valorMaoDeObraInput.value);
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

    const orcamentos = await lerDados('orcamentos.json').catch(() => []);
    let orcamentoAtual;

    if (orcamentoIdEmEdicao) {
        const id = parseInt(orcamentoIdEmEdicao);
        orcamentoAtual = orcamentos.find(o => o.id === id);
        if (orcamentoAtual) {
            orcamentoAtual.clienteNome = cliente.nome;
            orcamentoAtual.placaVeiculo = veiculo.placa;
            orcamentoAtual.valor = totalFinal;
            orcamentoAtual.itens = itens;
            orcamentoAtual.problemaRelatado = document.getElementById('problemaRelatado').value || 'Nenhuma observação.';
            orcamentoAtual.status = statusOrcamentoSelect.value;
            orcamentoAtual.descontoPercentual = descontoPercentual;
            orcamentoAtual.descontoValor = descontoValor;
        }
    } else {
        const ultimoId = orcamentos.reduce((max, o) => o.id > max ? o.id : max, 0);
        orcamentoAtual = {
            id: ultimoId + 1,
            clienteNome: cliente.nome,
            placaVeiculo: veiculo.placa,
            data: getLocalDateAsString(),
            valor: totalFinal,
            status: 'Pendente',
            itens: itens,
            problemaRelatado: document.getElementById('problemaRelatado').value || 'Nenhuma observação.',
            descontoPercentual: descontoPercentual,
            descontoValor: descontoValor
        };
        orcamentos.push(orcamentoAtual);
    }

    await salvarDados('orcamentos.json', orcamentos);
    showAlert(`✅ Orçamento ${orcamentoIdEmEdicao ? 'atualizado' : 'salvo'} com sucesso!`, 'success');

    const config = await lerDados('configuracao.json').catch(() => ({}));
    const templateHtml = await fetch('template-orcamento.html').then(res => res.text());

    let formasPagamentoHtml = `<ul><li>Dinheiro</li><li>PIX</li><li>Cartão de Débito</li>`;
    const maxParcelas = parseInt(config.maxParcelas, 10) || 12;
    const parcelasSemJuros = parseInt(config.parcelasSemJuros, 10) || 0;
    if (parcelasSemJuros > 0) formasPagamentoHtml += `<li>Cartão de Crédito em até ${parcelasSemJuros}x sem juros</li>`;
    if (maxParcelas > parcelasSemJuros) formasPagamentoHtml += `<li>Cartão de Crédito em até ${maxParcelas}x (consulte taxas)</li>`;
    formasPagamentoHtml += `</ul>`;

    let htmlFinal = templateHtml;
    const replacements = {
        '{{LOGO_PATH}}': config.logoPath ? `${config.logoPath}?t=${new Date().getTime()}` : '',
        '{{IMAGEM_ASSINATURA}}': config.assinaturaPath ? `<img src="${config.assinaturaPath}?t=${new Date().getTime()}" alt="Assinatura" class="signature-image">` : '',
        '{{NOME_OFICINA}}': config.nomeOficina || 'Nome da Oficina',
        '{{NOME_RESPONSAVEL}}': config.nomeResponsavel || ' ',
        '{{ENDERECO}}': config.endereco || 'Endereço da Oficina',
        '{{TELEFONE}}': config.telefone || 'Telefone da Oficina',
        '{{EMAIL}}': config.email || 'Email da Oficina',
        '{{CNPJ}}': config.cnpj || 'CNPJ da Oficina',
        '{{OS_ID}}': orcamentoAtual.id.toString().padStart(6, '0'),
        '{{DATA_EMISSAO}}': orcamentoAtual.data,
        '{{DATA_VALIDADE}}': new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        '{{NOME_CLIENTE}}': cliente.nome,
        '{{TELEFONE_CLIENTE}}': cliente.telefone,
        '{{EMAIL_CLIENTE}}': cliente.email,
        '{{ENDERECO_CLIENTE}}': cliente.endereco,
        '{{MODELO_VEICULO}}': `${veiculo.marca} ${veiculo.modelo}`,
        '{{PLACA_VEICULO}}': veiculo.placa,
        '{{ANO_VEICULO}}': veiculo.ano,
        '{{KM_VEICULO}}': kmVeiculoInput.value || veiculo.quilometragem || 'N/A',
        '{{OBS_INICIAIS}}': orcamentoAtual.problemaRelatado,
        '{{SUBTOTAL}}': formatarValor(subtotal),
        '{{DESCONTO}}': formatarValor(descontoValor),
        '{{TOTAL}}': formatarValor(totalFinal),
        '{{FORMAS_PAGAMENTO}}': formasPagamentoHtml
    };

    let itensHtml = '';
    itens.forEach(item => {
        itensHtml += `
            <tr>
                <td>${item.descricao}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${formatarValor(item.valor)}</td>
                <td>R$ ${formatarValor(item.quantidade * item.valor)}</td>
            </tr>
        `;
    });
    replacements['{{LISTA_SERVICOS}}'] = itensHtml;

    for (const [key, value] of Object.entries(replacements)) {
        htmlFinal = htmlFinal.replace(new RegExp(key, 'g'), value);
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(htmlFinal);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  carregarDadosIniciais();
});