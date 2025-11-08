window.electronAPI.onPrintData((_event, data) => {
    console.log("Dados recebidos para impressão:", data);
    try {
        // Populate company details
        document.getElementById('nome-oficina').textContent = data.config.nomeOficina || '';
        document.getElementById('endereco-oficina').textContent = data.config.endereco || '';
        document.getElementById('telefone-oficina').textContent = `Telefone: ${data.config.telefone || ''}`;
        document.getElementById('email-oficina').textContent = `Email: ${data.config.email || ''}`;
        document.getElementById('cnpj-oficina').textContent = `CNPJ: ${data.config.cnpj || ''}`;

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

        // Populate items table
        const itemsTbody = document.getElementById('lista-servicos-tbody');
        let subtotal = 0;
        itemsTbody.innerHTML = data.budget.itens.map(item => {
            const itemTotal = item.quantidade * item.valor_unitario;
            subtotal += itemTotal;
            return `
                <tr>
                    <td>${item.descricao}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.valor_unitario.toFixed(2)}</td>
                    <td>R$ ${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        // Populate totals
        const desconto = data.budget.valor_total ? subtotal - data.budget.valor_total : 0;
        document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
        document.getElementById('desconto').textContent = `R$ ${desconto.toFixed(2)}`;
        document.getElementById('total').textContent = `R$ ${data.budget.valor_total.toFixed(2)}`;

        // Populate footer and signature
        document.getElementById('footer-nome-oficina').textContent = data.config.nomeOficina || '';
        document.getElementById('footer-telefone').textContent = data.config.telefone || '';
        document.getElementById('nome-responsavel').textContent = data.config.nomeResponsavel || '';
        if (data.config.assinaturaPath) {
            imagesToLoad++;
            const assinatura = document.getElementById('imagem-assinatura');
            assinatura.onload = signalReadyWhenLoaded;
            assinatura.onerror = signalReadyWhenLoaded;
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
                li.textContent = forma;
                ul.appendChild(li);
            });
            formasPagamentoContainer.innerHTML = ''; // Clear previous content
            formasPagamentoContainer.appendChild(ul);
        } else {
            formasPagamentoContainer.textContent = 'Consulte-nos';
        }

        // If there are no images, signal ready immediately
        if (imagesToLoad === 0) {
            window.electronAPI.readyToPrint();
        }
    } catch (error) {
        window.electronAPI.printError(error.message);
    }
});