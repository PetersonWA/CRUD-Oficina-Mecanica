// Definição da função de renderização segura para testabilidade
function _renderTemplateOrcamentoSeguro(data, document, formatarValor) {
    // Populate company details
    document.getElementById('nome-oficina').textContent = data.config.nomeOficina || '';
    document.getElementById('endereco-oficina').textContent = data.config.endereco || '';
    document.getElementById('telefone-oficina').textContent = `Telefone: ${data.config.telefone || ''}`;
    document.getElementById('email-oficina').textContent = `Email: ${data.config.email || ''}`;
    document.getElementById('cnpj-oficina').textContent = `CNPJ: ${data.config.cnpj || ''}`;

    if (data.config.logoPath) {
        const logo = document.getElementById('logo');
        logo.src = data.config.logoPath;
        logo.style.display = 'block';
    } else {
        document.getElementById('logo').style.display = 'none';
    }

    // Populate budget details
    document.getElementById('os-id').textContent = String(data.budget.id).padStart(6, '0');
    document.getElementById('data-emissao').textContent = new Date(data.budget.data_entrada).toLocaleDateString('pt-BR');
    const validade = new Date(data.budget.data_entrada);
    validade.setDate(validade.getDate() + 30);
    document.getElementById('data-validade').textContent = validade.toLocaleDateString('pt-BR');

    // Populate client details
    document.getElementById('nome-cliente').textContent = data.client.nome || '';
    document.getElementById('telefone-cliente').textContent = data.client.telefone || '';
    document.getElementById('email-cliente').textContent = data.client.email || '';
    document.getElementById('endereco-cliente').textContent = data.client.endereco || '';

    // Populate vehicle details
    document.getElementById('modelo-veiculo').textContent = `${data.vehicle.marca || ''} ${data.vehicle.modelo || ''}`;
    document.getElementById('placa-veiculo').textContent = data.vehicle.placa || '';
    document.getElementById('ano-veiculo').textContent = data.vehicle.ano || '';
    document.getElementById('km-veiculo').textContent = data.vehicle.quilometragem || '';

    // Populate observations
    document.getElementById('obs-iniciais').textContent = data.budget.descricao_problema || '';

    // Populate items table (XSS SAFE)
    const itemsTbody = document.getElementById('lista-servicos-tbody');
    itemsTbody.innerHTML = ''; // Clear previous content
    let subtotal = 0;
    (data.budget.itens || []).forEach(item => {
        const itemTotal = item.quantidade * item.valor_unitario;
        subtotal += itemTotal;
        const row = itemsTbody.insertRow();
        row.insertCell(0).textContent = item.descricao;
        row.insertCell(1).textContent = String(item.quantidade);
        row.insertCell(2).textContent = `R$ ${formatarValor(item.valor_unitario)}`;
        row.insertCell(3).textContent = `R$ ${formatarValor(itemTotal)}`;
    });

    // Populate totals
    const desconto = data.budget.valor_total ? subtotal - data.budget.valor_total : 0;
    document.getElementById('subtotal').textContent = `R$ ${formatarValor(subtotal)}`;
    document.getElementById('desconto').textContent = `R$ ${formatarValor(desconto)}`;
    document.getElementById('total').textContent = `R$ ${formatarValor(data.budget.valor_total)}`;

    // Populate footer and signature
    document.getElementById('footer-nome-oficina').textContent = data.config.nomeOficina || '';
    document.getElementById('footer-telefone').textContent = data.config.telefone || '';
    document.getElementById('nome-responsavel').textContent = data.config.nomeResponsavel || '';
    if (data.config.assinaturaPath) {
        const assinatura = document.getElementById('imagem-assinatura');
        assinatura.src = data.config.assinaturaPath;
        assinatura.style.display = 'block';
    } else {
        document.getElementById('imagem-assinatura').style.display = 'none';
    }
    
    const formasPagamentoContainer = document.getElementById('formas-pagamento');
    if (data.config.formasPagamento) {
        const formas = data.config.formasPagamento.split(',').map(forma => forma.trim());
        const ul = document.createElement('ul');
        formas.forEach(forma => {
            const li = document.createElement('li');
            li.textContent = forma; // Already safe
            ul.appendChild(li);
        });
        formasPagamentoContainer.innerHTML = ''; // Clear previous content
        formasPagamentoContainer.appendChild(ul);
    } else {
        formasPagamentoContainer.textContent = 'Consulte-nos';
    }
}

// Expor para testes
if (typeof window.testHooks === 'undefined') {
    window.testHooks = {};
}
window.testHooks.renderTemplateOrcamento = _renderTemplateOrcamentoSeguro;

window.electronAPI.onPrintData((_event, data) => {
    // Funções utilitárias (assumindo que estão em utils.js ou similar)
    const formatarValor = (valor) => valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // getLocalDateAsString
    
    let imagesToLoad = 0;
    let imagesLoaded = 0;

    const signalReadyWhenLoaded = () => {
        imagesLoaded++;
        if (imagesLoaded === imagesToLoad) {
            window.electronAPI.readyToPrint();
        }
    };

    if (data.config.logoPath) {
        imagesToLoad++;
        const logo = document.getElementById('logo');
        logo.onload = signalReadyWhenLoaded;
        logo.onerror = signalReadyWhenLoaded; // Also count errors as "loaded" to avoid getting stuck
    }

    if (data.config.assinaturaPath) {
        imagesToLoad++;
        const assinatura = document.getElementById('imagem-assinatura');
        assinatura.onload = signalReadyWhenLoaded;
        assinatura.onerror = signalReadyWhenLoaded;
    }

    try {
        _renderTemplateOrcamentoSeguro(data, document, formatarValor);

        // If there are no images, signal ready immediately
        if (imagesToLoad === 0) {
            window.electronAPI.readyToPrint();
        }
    } catch (error) {
        window.electronAPI.printError(error.message);
    }
});