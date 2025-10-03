/* Scripts específicos para a página de OS Manual */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('os-manual-form');
  if (!form) return; // Exit if not on the OS Manual page

  const telefoneInput = document.getElementById('telefone');
  const itensBody = document.getElementById('itens-os-body');
  const subtotalDisplay = document.getElementById('subtotal-os');
  const descontoInput = document.getElementById('desconto-percentual');
  const valorDescontoDisplay = document.getElementById('valor-desconto');
  const totalFinalDisplay = document.getElementById('total-final-os');

  // Initialize page
  adicionarItem(); // Adiciona a primeira linha em branco
  descontoInput.addEventListener('input', calcularTotal);
  telefoneInput.addEventListener('input', () => { telefoneInput.value = maskPhone(telefoneInput.value); });

  // Make functions available to inline onclick attributes
  window.adicionarItem = adicionarItem;
  window.removerItem = removerItem;

  function adicionarItem() {
    const row = document.createElement('tr');
    row.classList.add('item-row');
    row.innerHTML = `
      <td><input type="text" class="form-control form-control-sm" placeholder="Serviço ou Peça" name="descricao"></td>
      <td><input type="number" class="form-control form-control-sm" value="1" min="1" name="quantidade"></td>
      <td><input type="text" class="form-control form-control-sm" placeholder="R$ 0,00" name="valor"></td>
      <td><button type="button" class="btn btn-danger btn-sm" onclick="removerItem(this)"><i class="bi bi-trash"></i></button></td>
    `;
    itensBody.appendChild(row);

    const valorInput = row.querySelector('[name=valor]');
    valorInput.addEventListener('input', () => maskCurrency(valorInput));

    row.querySelectorAll('input').forEach(input => input.addEventListener('input', calcularTotal));
    calcularTotal();
  }

  function removerItem(button) {
    button.closest('tr').remove();
    calcularTotal();
  }

  function calcularTotal() {
    let subtotal = 0;
    itensBody.querySelectorAll('.item-row').forEach(row => {
      const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
      const valorInput = row.querySelector('[name=valor]').value;
      const cleanValorString = String(valorInput).replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(cleanValorString) || 0;
      subtotal += quantidade * valor;
    });

    const descontoPercentual = parseFloat(descontoInput.value) || 0;
    const descontoValor = subtotal * (descontoPercentual / 100);
    const totalFinal = subtotal - descontoValor;

    subtotalDisplay.textContent = `R$ ${formatarValor(subtotal)}`;
    valorDescontoDisplay.textContent = `- R$ ${formatarValor(descontoValor)}`;
    totalFinalDisplay.textContent = `R$ ${formatarValor(totalFinal)}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Validação
    if (!validatePercentage(descontoInput.value)) {
        showAlert('O percentual de desconto deve ser um número entre 0 e 100.', 'danger');
        return;
    }

    const itemRows = itensBody.querySelectorAll('.item-row');
    for (let i = 0; i < itemRows.length; i++) {
        const row = itemRows[i];
        const descricao = row.querySelector('[name=descricao]').value;
        if (descricao) { // Só valida linhas que foram preenchidas
            if (!validatePositiveNumber(row.querySelector('[name=quantidade]').value)) {
                showAlert(`Verifique a linha ${i + 1}: a quantidade deve ser maior que zero.`, 'danger');
                return;
            }
            if (!validatePositiveNumber(row.querySelector('[name=valor]').value)) {
                showAlert(`Verifique a linha ${i + 1}: o valor unitário deve ser maior que zero.`, 'danger');
                return;
            }
        }
    }
    
    let subtotal = 0;
    const itens = [];
    itensBody.querySelectorAll('.item-row').forEach(row => {
        const descricao = row.querySelector('[name=descricao]').value;
        const quantidade = parseFloat(row.querySelector('[name=quantidade]').value) || 0;
        const valorInput = row.querySelector('[name=valor]').value;
        const cleanValorString = String(valorInput).replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
        const valor = parseFloat(cleanValorString) || 0;

        if(descricao && quantidade > 0 && valor > 0) {
            itens.push({ descricao, quantidade, valor });
            subtotal += quantidade * valor;
        }
    });

    if (itens.length === 0) {
        showAlert('Adicione pelo menos um item de serviço com quantidade e valor válidos.', 'warning');
        return;
    }

    const descontoPercentual = parseFloat(descontoInput.value) || 0;
    const descontoValor = subtotal * (descontoPercentual / 100);
    const totalFinal = subtotal - descontoValor;

    const osData = {
        id: 'os-' + Date.now(),
        cliente: document.getElementById('cliente').value,
        telefone: document.getElementById('telefone').value,
        veiculo: document.getElementById('veiculo').value,
        problemaRelatado: document.getElementById('problemaRelatado').value,
        dataEntrada: getLocalDateAsString('yyyy-mm-dd'),
        status: 'Concluído',
        itens: itens,
        valor: totalFinal,
        descontoPercentual: descontoPercentual,
        descontoValor: descontoValor
    };

    if (!osData.cliente || !osData.veiculo) {
        showAlert('Preencha o nome do cliente e a descrição do veículo.', 'warning');
        return;
    }

    const ordens = await lerDados('ordens.json').catch(() => []);
    ordens.push(osData);
    await salvarDados('ordens.json', ordens);
    showAlert('Ordem de Serviço salva com sucesso!', 'success');

    // Resetar o formulário após salvar
    form.reset();
    itensBody.innerHTML = '';
    adicionarItem(); // Adiciona uma nova linha em branco
    calcularTotal(); // Recalcula para zerar os totais

    const config = await lerDados('configuracao.json').catch(() => ({}));
    const templateHtml = await fetch('template-orcamento.html').then(res => res.text());

    let htmlFinal = templateHtml;
    const logoPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect fill='%23F8F9FA' width='200' height='150'/%3E%3Ctext fill='rgba(0,0,0,0.4)' font-family='sans-serif' font-size='16' dy='5.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ELogo%3C/text%3E%3C/svg%3E";
    const assinaturaHtml = config.assinaturaPath ? `<img src="${config.assinaturaPath}" alt="Assinatura" class="signature-image">` : '';

    const replacements = {
        '{{LOGO_PATH}}': config.logoPath || logoPlaceholder,
        '{{NOME_OFICINA}}': config.nomeOficina || 'Nome da Oficina',
        '{{ENDERECO}}': config.endereco || 'Endereço da Oficina',
        '{{TELEFONE}}': config.telefone || 'Telefone da Oficina',
        '{{EMAIL}}': config.email || 'Email da Oficina',
        '{{CNPJ}}': config.cnpj || 'CNPJ da Oficina',
        '{{OS_ID}}': osData.id,
        '{{DATA_EMISSAO}}': new Date(osData.dataEntrada).toLocaleDateString('pt-BR'),
        '{{DATA_VALIDADE}}': '', // N/A for Work Order
        '{{NOME_CLIENTE}}': osData.cliente,
        '{{TELEFONE_CLIENTE}}': osData.telefone,
        '{{EMAIL_CLIENTE}}': '', // N/A
        '{{ENDERECO_CLIENTE}}': '', // N/A
        '{{MODELO_VEICULO}}': osData.veiculo,
        '{{PLACA_VEICULO}}': '', // N/A
        '{{ANO_VEICULO}}': '', // N/A
        '{{KM_VEICULO}}': '', // N/A
        '{{OBS_INICIAIS}}': osData.problemaRelatado || 'Nenhuma observação.',
        '{{SUBTOTAL}}': formatarValor(subtotal),
        '{{DESCONTO}}': formatarValor(descontoValor),
        '{{TOTAL}}': formatarValor(totalFinal),
        '{{FORMAS_PAGAMENTO}}': '<p>Consulte as opções de pagamento.</p>',
        '{{IMAGEM_ASSINATURA}}': assinaturaHtml,
        '{{NOME_RESPONSAVEL}}': config.nomeResponsavel || ''
    };

    let itensHtml = '';
    osData.itens.forEach(item => {
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
  });
});