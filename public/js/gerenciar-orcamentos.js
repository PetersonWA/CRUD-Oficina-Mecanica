/* Scripts específicos para a página de Gerenciar Orçamentos */
document.addEventListener('DOMContentLoaded', () => {
  const listaOrcamentosTable = document.getElementById('lista-orcamentos');
  if (!listaOrcamentosTable) return; // Exit if not on the right page

  const inputBusca = document.getElementById('inputBusca');
  const campoBusca = document.getElementById('campoBusca');
  const itensOrcamentoModalBody = document.getElementById('itens-orcamento-modal-body');
  const orcamentoIdModal = document.getElementById('orcamento-id-modal');
  const problemaRelatadoModal = document.getElementById('problema-relatado-modal');

  let todosOrcamentos = [];
  let orcamentosFiltrados = [];
  let todosClientes = [];
  let todosVeiculos = [];
  let paginaAtual = 1;
  const itensPorPagina = 10;
  let confirmacaoCallback = () => {};
  let editModalInstance = null;

  const modalConfirmacaoEl = document.getElementById('modalConfirmarExclusao');
  const modalConfirmacao = new bootstrap.Modal(modalConfirmacaoEl);
  const corpoModalConfirmacao = document.getElementById('corpoModalConfirmacao');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

  // Attach functions to window for inline event handlers
  window.realizarBusca = realizarBusca;
  window.limparBusca = limparBusca;
  window.abrirModalVerItens = abrirModalVerItens;
  window.abrirModalEditarOrcamento = abrirModalEditarOrcamento;
  window.imprimirOrcamento = imprimirOrcamento;
  window.excluirOrcamento = excluirOrcamento;
  window.mudarPagina = mudarPagina;
  window.atualizarValorTotalModal = atualizarValorTotalModal;

  btnConfirmarExclusao.addEventListener('click', () => {
    if(confirmacaoCallback) confirmacaoCallback();
    modalConfirmacao.hide();
  });

  function showConfirm(message, callback) {
    corpoModalConfirmacao.textContent = message;
    confirmacaoCallback = callback;
    modalConfirmacao.show();
  }

  window.showConfirm = showConfirm;

  async function carregarDados() {
    [todosOrcamentos, todosClientes, todosVeiculos] = await Promise.all([
        lerDados('orcamentos.json'),
        lerDados('clientes.json'),
        lerDados('veiculos.json')
    ]);
    orcamentosFiltrados = todosOrcamentos.sort((a, b) => b.id - a.id);
    renderizarPagina();
  }

  window.carregarDados = carregarDados;

  function renderizarPagina() {
    renderizarOrcamentos();
    renderizarPaginacao();
  }

  function renderizarOrcamentos() {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const orcamentosPagina = orcamentosFiltrados.slice(inicio, fim);

    listaOrcamentosTable.innerHTML = orcamentosPagina.map(o => `
      <tr>
        <td>${String(o.id).padStart(6, '0')}</td>
        <td>${o.clienteNome}</td>
        <td>${o.placaVeiculo}</td>
        <td>${o.data}</td>
        <td>R$ ${formatarValor(o.valor)}</td>
        <td><span class="badge bg-warning text-dark">${o.status}</span></td>
        <td>
          <button class="btn btn-sm btn-info" onclick="abrirModalVerItens(${o.id})"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-primary" onclick="abrirModalEditarOrcamento(${o.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-secondary" onclick="imprimirOrcamento(${o.id})"><i class="bi bi-printer"></i></button>
          <button class="btn btn-sm btn-danger" onclick="excluirOrcamento(${o.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  function renderizarPaginacao() {
    const totalPaginas = Math.ceil(orcamentosFiltrados.length / itensPorPagina);
    const paginacaoEl = document.getElementById('paginacao-orcamentos');
    if (!paginacaoEl) return;

    paginacaoEl.innerHTML = '';

    if (totalPaginas <= 1) {
        paginacaoEl.style.display = 'none';
        return;
    }

    paginacaoEl.style.display = 'flex';

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${paginaAtual === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous" onclick="mudarPagina(${paginaAtual - 1})"><span aria-hidden="true">&laquo;</span></a>`;
    paginacaoEl.appendChild(prevLi);

    for (let i = 1; i <= totalPaginas; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === paginaAtual ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="mudarPagina(${i})">${i}</a>`;
        paginacaoEl.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next" onclick="mudarPagina(${paginaAtual + 1})"><span aria-hidden="true">&raquo;</span></a>`;
    paginacaoEl.appendChild(nextLi);
  }

  function mudarPagina(pagina) {
    const totalPaginas = Math.ceil(orcamentosFiltrados.length / itensPorPagina);
    if (pagina < 1 || pagina > totalPaginas) return;
    paginaAtual = pagina;
    renderizarPagina();
  }

  function realizarBusca() {
    const termo = inputBusca.value.toLowerCase();
    const campo = campoBusca.value;
    if (!termo || !campo) {
      orcamentosFiltrados = todosOrcamentos;
    } else {
      orcamentosFiltrados = todosOrcamentos.filter(o => {
        const valorCampo = o[campo] ? String(o[campo]).toLowerCase() : '';
        return valorCampo.includes(termo);
      });
    }
    paginaAtual = 1;
    renderizarPagina();
  }

  function limparBusca() {
    inputBusca.value = '';
    campoBusca.value = '';
    orcamentosFiltrados = todosOrcamentos;
    paginaAtual = 1;
    renderizarPagina();
  }

  function abrirModalVerItens(id) {
    const orcamento = todosOrcamentos.find(o => o.id === id);
    if (orcamento) {
      orcamentoIdModal.textContent = String(id).padStart(6, '0');
      problemaRelatadoModal.textContent = orcamento.problemaRelatado;
      itensOrcamentoModalBody.innerHTML = orcamento.itens.map(item => `
        <tr>
          <td>${item.descricao}</td>
          <td>${item.quantidade}</td>
          <td>R$ ${formatarValor(item.valor)}</td>
          <td>R$ ${formatarValor(item.quantidade * item.valor)}</td>
        </tr>
      `).join('');
      new bootstrap.Modal(document.getElementById('modalVerItens')).show();
    }
  }

  async function imprimirOrcamento(id) {
    const orcamento = todosOrcamentos.find(o => o.id === id);
    if (!orcamento) {
        showAlert('Orçamento não encontrado!', 'danger');
        return;
    }

    const cliente = todosClientes.find(c => c.nome === orcamento.clienteNome);
    const veiculo = todosVeiculos.find(v => v.placa === orcamento.placaVeiculo);
    const config = await lerDados('configuracao.json');
    const templateHtml = await fetch('template-orcamento.html').then(res => res.text());

    if(!cliente || !veiculo) {
        showAlert('Dados do cliente ou veículo não encontrados para este orçamento!', 'danger');
        return;
    }

    const subtotal = orcamento.itens.reduce((acc, item) => acc + (item.quantidade * item.valor), 0);
    const descontoValor = orcamento.descontoValor || 0;
    const totalFinal = orcamento.valor;

    const imagemAssinaturaHtml = config.assinaturaPath ? `<img src="${config.assinaturaPath}?t=${new Date().getTime()}" alt="Assinatura" class="signature-image">` : '';
    let htmlFinal = templateHtml;
    const replacements = {
        '{{LOGO_PATH}}': config.logoPath ? `${config.logoPath}?t=${new Date().getTime()}` : '',
        '{{IMAGEM_ASSINATURA}}': imagemAssinaturaHtml,
        '{{NOME_OFICINA}}': config.nomeOficina || 'Nome da Oficina',
        '{{NOME_RESPONSAVEL}}': config.nomeResponsavel || ' ',
        '{{ENDERECO}}': config.endereco || 'Endereço da Oficina',
        '{{TELEFONE}}': config.telefone || 'Telefone da Oficina',
        '{{EMAIL}}': config.email || 'Email da Oficina',
        '{{CNPJ}}': config.cnpj || 'CNPJ da Oficina',
        '{{OS_ID}}': String(orcamento.id).padStart(6, '0'),
        '{{DATA_EMISSAO}}': orcamento.data,
        '{{DATA_VALIDADE}}': new Date(new Date(orcamento.data.split('/').reverse().join('-') + 'T00:00:00').getTime() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        '{{NOME_CLIENTE}}': cliente.nome,
        '{{TELEFONE_CLIENTE}}': cliente.telefone,
        '{{EMAIL_CLIENTE}}': cliente.email,
        '{{ENDERECO_CLIENTE}}': cliente.endereco,
        '{{MODELO_VEICULO}}': `${veiculo.marca} ${veiculo.modelo}`,
        '{{PLACA_VEICULO}}': veiculo.placa,
        '{{ANO_VEICULO}}': veiculo.ano,
        '{{KM_VEICULO}}': veiculo.quilometragem || 'N/A',
        '{{OBS_INICIAIS}}': orcamento.problemaRelatado,
        '{{SUBTOTAL}}': formatarValor(subtotal),
        '{{DESCONTO}}': formatarValor(descontoValor),
        '{{TOTAL}}': formatarValor(totalFinal)
    };

    let itensHtml = '';
    orcamento.itens.forEach(item => {
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

  async function excluirOrcamento(id) {
    const orcamento = todosOrcamentos.find(o => o.id == id);
    showConfirm(`Tem certeza que deseja excluir o orçamento #${String(id).padStart(6, '0')} do cliente "${orcamento.clienteNome}"?`, async () => {
      const orcamentosAtualizados = todosOrcamentos.filter(o => o.id !== id);
      await salvarDados('orcamentos.json', orcamentosAtualizados);
      showAlert('✅ Orçamento excluído com sucesso!');
      await carregarDados();
    });
  }

  async function abrirModalEditarOrcamento(id) {
    const orcamento = todosOrcamentos.find(o => o.id === id);
    if (!orcamento) {
      showAlert('Orçamento não encontrado!', 'danger');
      return;
    }

    document.getElementById('editOrcamentoId').value = orcamento.id;
    document.getElementById('editClienteNome').value = orcamento.clienteNome;
    document.getElementById('editPlacaVeiculo').value = orcamento.placaVeiculo;
    document.getElementById('editProblemaRelatado').value = orcamento.problemaRelatado;
    document.getElementById('editStatus').value = orcamento.status;
    document.getElementById('edit-desconto-percentual').value = orcamento.descontoPercentual || 0;

    const itensContainer = document.getElementById('edit-itens-orcamento-container');
    itensContainer.innerHTML = '';
    orcamento.itens.forEach((item, index) => {
      adicionarLinhaItem(item, index);
    });
    
    atualizarValorTotalModal();
    document.getElementById('edit-desconto-percentual').addEventListener('input', atualizarValorTotalModal);

    const statusSelect = document.getElementById('editStatus');
    const btnSalvarServico = document.getElementById('btnSalvarServico');
    btnSalvarServico.disabled = statusSelect.value !== 'Concluído';

    statusSelect.onchange = () => {
      btnSalvarServico.disabled = statusSelect.value !== 'Concluído';
    };

    editModalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarOrcamento'));
    editModalInstance.show();
  }

  function adicionarLinhaItem(item = { descricao: '', quantidade: 1, valor: 0 }, index) {
      const itensContainer = document.getElementById('edit-itens-orcamento-container');
      const div = document.createElement('div');
      div.className = 'row g-3 mb-2 align-items-center item-row';
      div.innerHTML = `
          <div class="col-md-5">
              <input type="text" class="form-control" placeholder="Descrição" value="${item.descricao}" oninput="atualizarValorTotalModal()">
          </div>
          <div class="col-md-2">
              <input type="number" class="form-control" placeholder="Qtd" value="${item.quantidade}" min="1" oninput="atualizarValorTotalModal()">
          </div>
          <div class="col-md-3">
              <input type="number" class="form-control" placeholder="Valor Unit." value="${item.valor}" step="0.01" min="0" oninput="atualizarValorTotalModal()">
          </div>
          <div class="col-md-2">
              <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.item-row').remove(); atualizarValorTotalModal();">Remover</button>
          </div>
      `;
      itensContainer.appendChild(div);
  }
  
  function atualizarValorTotalModal() {
      let subtotal = 0;
      document.querySelectorAll('#edit-itens-orcamento-container .item-row').forEach(row => {
          const quantidade = parseFloat(row.querySelector('input[placeholder="Qtd"]').value) || 0;
          const valor = parseFloat(row.querySelector('input[placeholder="Valor Unit."]').value) || 0;
          subtotal += quantidade * valor;
      });

      const descontoPercentual = parseFloat(document.getElementById('edit-desconto-percentual').value) || 0;
      const descontoValor = subtotal * (descontoPercentual / 100);
      const totalFinal = subtotal - descontoValor;

      document.getElementById('edit-subtotal-orcamento').textContent = `R$ ${formatarValor(subtotal)}`;
      document.getElementById('edit-valor-desconto').textContent = `- R$ ${formatarValor(descontoValor)}`;
      document.getElementById('edit-total-final-orcamento').textContent = `R$ ${formatarValor(totalFinal)}`;
  }

  document.getElementById('btnAdicionarItem').addEventListener('click', () => {
      adicionarLinhaItem();
  });

  document.getElementById('form-editar-orcamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('editOrcamentoId').value);
    const orcamentoIndex = todosOrcamentos.findIndex(o => o.id === id);
    if (orcamentoIndex === -1) {
      showAlert('Erro ao encontrar orçamento para atualizar.', 'danger');
      return;
    }

    const itens = [];
    let subtotal = 0;
    document.querySelectorAll('#edit-itens-orcamento-container .item-row').forEach(row => {
        const descricao = row.children[0].children[0].value;
        const quantidade = parseFloat(row.children[1].children[0].value) || 0;
        const valor = parseFloat(row.children[2].children[0].value) || 0;
        if (descricao && quantidade > 0 && valor >= 0) {
            itens.push({ descricao, quantidade, valor });
            subtotal += quantidade * valor;
        }
    });

    const descontoPercentual = parseFloat(document.getElementById('edit-desconto-percentual').value) || 0;
    const descontoValor = subtotal * (descontoPercentual / 100);
    const totalFinal = subtotal - descontoValor;

    const orcamentoAtualizado = {
      ...todosOrcamentos[orcamentoIndex],
      problemaRelatado: document.getElementById('editProblemaRelatado').value,
      status: document.getElementById('editStatus').value,
      itens: itens,
      valor: totalFinal,
      descontoPercentual: descontoPercentual,
      descontoValor: descontoValor
    };

    todosOrcamentos[orcamentoIndex] = orcamentoAtualizado;
    await salvarDados('orcamentos.json', todosOrcamentos);
    
    showAlert('✅ Orçamento atualizado com sucesso!');

    const modalEl = document.getElementById('modalEditarOrcamento');
    if (editModalInstance) {
      // Garante que os dados só serão recarregados após o modal ser completamente fechado
      modalEl.addEventListener('hidden.bs.modal', async () => {
        await carregarDados();
      }, { once: true });

      editModalInstance.hide();
    } else {
      await carregarDados(); // Fallback caso a instância não exista
    }
  });

  document.getElementById('btnSalvarServico').addEventListener('click', async () => {
      const id = parseInt(document.getElementById('editOrcamentoId').value);
      const orcamentoIndex = todosOrcamentos.findIndex(o => o.id === id);
      if (orcamentoIndex === -1) {
          showAlert('Orçamento não encontrado!', 'danger');
          return;
      }

      const orcamento = todosOrcamentos[orcamentoIndex];

      // 1. Coletar dados atualizados do modal
      const itens = [];
      document.querySelectorAll('#edit-itens-orcamento-container .item-row').forEach(row => {
          const descricao = row.querySelector('input[placeholder="Descrição"]').value;
          const quantidade = parseFloat(row.querySelector('input[placeholder="Qtd"]').value) || 0;
          const valor = parseFloat(row.querySelector('input[placeholder="Valor Unit."]').value) || 0;
          if (descricao && quantidade > 0 && valor >= 0) {
              itens.push({ descricao, quantidade, valor });
          }
      });
      const valorTotal = itens.reduce((acc, item) => acc + (item.quantidade * item.valor), 0);

      // 2. Buscar dados adicionais
      const cliente = todosClientes.find(c => c.nome === orcamento.clienteNome);
      const veiculo = todosVeiculos.find(v => v.placa === orcamento.placaVeiculo);

      // 3. Criar novo objeto de serviço
      const novoServico = {
          id: Date.now(),
          clienteNome: orcamento.clienteNome,
          clienteDoc: cliente ? cliente.documento : 'N/A',
          placaVeiculo: orcamento.placaVeiculo,
          dataEntrada: getLocalDateAsString('yyyy-mm-dd'), // Data de hoje
          problemaRelatado: document.getElementById('editProblemaRelatado').value,
          mecanico: '', // Mecânico pode ser definido depois
          status: 'Em andamento',
          itens: itens,
          valor: valorTotal, // Adicionado para compatibilidade
          valorTotal: valorTotal,
          quilometragem: veiculo ? veiculo.quilometragem : 'N/A',
          statusPagamento: 'Pendente', // Status inicial de pagamento
          pagamentos: [], // Inicializa a lista de pagamentos
          formaPagamento: '' // Inicializa a forma de pagamento
      };

      // 4. Salvar o novo serviço
      const todosServicos = await lerDados('servicos.json') || [];
      todosServicos.push(novoServico);
      await salvarDados('servicos.json', todosServicos);

      // 5. Atualizar o orçamento
      orcamento.status = 'Faturado';
      todosOrcamentos[orcamentoIndex] = orcamento;
      await salvarDados('orcamentos.json', todosOrcamentos);

      // 6. Feedback e atualização da UI
      showAlert('✅ Serviço gerado com sucesso a partir do orçamento!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('modalEditarOrcamento')).hide();
      await carregarDados();
  });

  carregarDados();
});