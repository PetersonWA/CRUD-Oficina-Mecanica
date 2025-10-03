/* Scripts específicos para a página de Clientes e Veículos */
document.addEventListener('DOMContentLoaded', () => {
  const formCliente = document.getElementById('form-cliente');
  if (!formCliente) return; // Exit if not on the right page

  // Aplica as máscaras aos campos de input
  addInputMask('telefoneCliente', maskPhone);
  addInputMask('documentoCliente', maskCpfCnpj);
  addInputMask('cepCliente', maskCep);
  addInputMask('placaVeiculo', maskPlate);
  addInputMask('editTelefoneCliente', maskPhone);
  addInputMask('editCepCliente', maskCep);
  addInputMask('editPlacaVeiculo', maskPlate);
  addInputMask('editAnoVeiculo', (v) => v.replace(/\D/g, '')); // Apenas números para o ano

  const formVeiculo = document.getElementById('form-veiculo');
  const listaClientesTable = document.getElementById('lista-clientes');
  const listaVeiculosTable = document.getElementById('lista-veiculos');
  const selectClienteVeiculo = document.getElementById('selectClienteVeiculo');
  const inputBusca = document.getElementById('inputBusca');
  const campoBusca = document.getElementById('campoBusca');

  let todosClientes = [];
  let todosVeiculos = [];
  let paginaAtualClientes = 1;
  let paginaAtualVeiculos = 1;
  const itensPorPagina = 10;
  let confirmacaoCallback = () => {};

  const modalConfirmacao = new bootstrap.Modal(document.getElementById('modalConfirmarExclusao'));
  const corpoModalConfirmacao = document.getElementById('corpoModalConfirmacao');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

  // Attach functions to window for inline event handlers
  window.realizarBusca = realizarBusca;
  window.limparBusca = limparBusca;
  window.abrirModalEditarCliente = abrirModalEditarCliente;
  window.excluirCliente = excluirCliente;
  window.abrirModalEditarVeiculo = abrirModalEditarVeiculo;
  window.excluirVeiculo = excluirVeiculo;

  btnConfirmarExclusao.addEventListener('click', () => {
    confirmacaoCallback();
    modalConfirmacao.hide();
  });

  function showConfirm(message, callback) {
    corpoModalConfirmacao.textContent = message;
    confirmacaoCallback = callback;
    modalConfirmacao.show();
  }

  function renderizarPaginacao(totalItens, paginaAtual, callback, idPaginacao) {
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    const paginacaoEl = document.getElementById(idPaginacao);
    paginacaoEl.innerHTML = '';

    if (totalPaginas <= 1) {
        paginacaoEl.style.display = 'none';
        return;
    }

    paginacaoEl.style.display = 'flex';

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${paginaAtual === 1 ? 'disabled' : ''}`;
    const prevA = document.createElement('a');
    prevA.className = 'page-link';
    prevA.href = '#';
    prevA.setAttribute('aria-label', 'Previous');
    prevA.innerHTML = '<span aria-hidden="true">&laquo;</span>';
    prevA.onclick = (e) => {
        e.preventDefault();
        if (paginaAtual > 1) {
            callback(paginaAtual - 1);
        }
    };
    prevLi.appendChild(prevA);
    paginacaoEl.appendChild(prevLi);

    for (let i = 1; i <= totalPaginas; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === paginaAtual ? 'active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = i;
        a.onclick = (e) => {
            e.preventDefault();
            callback(i);
        };
        li.appendChild(a);
        paginacaoEl.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}`;
    const nextA = document.createElement('a');
    nextA.className = 'page-link';
    nextA.href = '#';
    nextA.setAttribute('aria-label', 'Next');
    nextA.innerHTML = '<span aria-hidden="true">&raquo;</span>';
    nextA.onclick = (e) => {
        e.preventDefault();
        if (paginaAtual < totalPaginas) {
            callback(paginaAtual + 1);
        }
    };
    nextLi.appendChild(nextA);
    paginacaoEl.appendChild(nextLi);
  }

  async function carregarClientesEVeiculos(termo = '', campo = '') {
    todosClientes = await buscarDados('clientes.json', termo, campo === 'nome' || campo === 'documento' ? campo : '');
    todosVeiculos = await buscarDados('veiculos.json', termo, campo === 'placa' || campo === 'modelo' ? campo : '');

    const inicioClientes = (paginaAtualClientes - 1) * itensPorPagina;
    const clientesPagina = todosClientes.slice(inicioClientes, inicioClientes + itensPorPagina);

    listaClientesTable.innerHTML = clientesPagina.map(c => `
      <tr>
        <td>${c.nome}</td>
        <td>${c.telefone}</td>
        <td>${c.email}</td>
        <td>${c.documento}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="abrirModalEditarCliente('${c.documento}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger" onclick="excluirCliente('${c.documento}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');

    renderizarPaginacao(
      todosClientes.length,
      paginaAtualClientes,
      (pagina) => { paginaAtualClientes = pagina; carregarClientesEVeiculos(termo, campo); },
      'paginacao-clientes'
    );

    const inicioVeiculos = (paginaAtualVeiculos - 1) * itensPorPagina;
    const veiculosPagina = todosVeiculos.slice(inicioVeiculos, inicioVeiculos + itensPorPagina);

    listaVeiculosTable.innerHTML = veiculosPagina.map(v => `
      <tr>
        <td>${v.cliente}</td>
        <td>${v.marca}</td>
        <td>${v.modelo}</td>
        <td>${v.ano}</td>
        <td>${v.placa}</td>
        <td>${v.cor}</td>
        <td>${v.quilometragem}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="abrirModalEditarVeiculo('${v.placa}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger" onclick="excluirVeiculo('${v.placa}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');

    renderizarPaginacao(
      todosVeiculos.length,
      paginaAtualVeiculos,
      (pagina) => { paginaAtualVeiculos = pagina; carregarClientesEVeiculos(termo, campo); },
      'paginacao-veiculos'
    );

    const clientesParaSelect = await lerDados('clientes.json');
    selectClienteVeiculo.innerHTML = '<option value="">Selecione o cliente...</option>';
    clientesParaSelect.forEach(cliente => {
      const option = document.createElement('option');
      option.value = cliente.nome;
      option.textContent = cliente.nome;
      selectClienteVeiculo.appendChild(option);
    });
  }

  function realizarBusca() {
    paginaAtualClientes = 1;
    paginaAtualVeiculos = 1;
    const termo = inputBusca.value;
    const campo = campoBusca.value;
    carregarClientesEVeiculos(termo, campo);
  }

  function limparBusca() {
    inputBusca.value = '';
    campoBusca.value = '';
    paginaAtualClientes = 1;
    paginaAtualVeiculos = 1;
    carregarClientesEVeiculos();
  }

  formCliente.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nomeCliente').value;
    const telefone = document.getElementById('telefoneCliente').value;
    const email = document.getElementById('emailCliente').value;
    const documento = document.getElementById('documentoCliente').value;
    const endereco = document.getElementById('enderecoCliente').value;
    const cidade = document.getElementById('cidadeCliente').value;
    const bairro = document.getElementById('bairroCliente').value;
    const cep = document.getElementById('cepCliente').value;

    if (!validateDocument(documento)) {
        showAlert('CPF ou CNPJ inválido. Verifique o número digitado.', 'danger');
        return;
    }
    if (!validatePhone(telefone)) {
        showAlert('Telefone inválido. Deve conter DDD + 8 ou 9 dígitos.', 'danger');
        return;
    }

    const cliente = {
      id: Date.now().toString(),
      nome: nome,
      telefone: telefone,
      email: email,
      documento: documento,
      endereco: endereco,
      cidade: cidade,
      bairro: bairro,
      cep: cep
    };
    const clientesExistentes = await lerDados('clientes.json');
    const clienteJaExiste = clientesExistentes.some(c => c.documento === cliente.documento);
    if (clienteJaExiste) {
      showAlert('Um cliente com este CPF/CNPJ já está cadastrado!', 'danger');
      return;
    }
    clientesExistentes.push(cliente);
    await salvarDados('clientes.json', clientesExistentes);
    showAlert('✅ Cliente salvo com sucesso!'); 
    formCliente.reset();
    await carregarClientesEVeiculos();
  });

  formVeiculo.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ano = document.getElementById('anoVeiculo').value;
    const placa = document.getElementById('placaVeiculo').value;

    if (!validateVehicleYear(ano)) {
        showAlert('Ano do veículo inválido. Use 4 dígitos (ex: 2023) e um ano realista.', 'danger');
        return;
    }
    if (!validateVehiclePlate(placa)) {
        showAlert('Placa do veículo inválida. Use o formato AAA-1234 ou AAA-1B23.', 'danger');
        return;
    }

    if (selectClienteVeiculo.value === '') {
      showAlert('Selecione um cliente para o veículo!', 'warning');
      return;
    }
    const veiculo = {
      cliente: selectClienteVeiculo.value,
      id: Date.now().toString(),
      marca: document.getElementById('marcaVeiculo').value,
      modelo: document.getElementById('modeloVeiculo').value,
      ano: ano,
      placa: placa,
      cor: document.getElementById('corVeiculo').value,
      quilometragem: document.getElementById('quilometragemVeiculo').value
    };
    const veiculosExistentes = await lerDados('veiculos.json');
    const veiculoJaExiste = veiculosExistentes.some(v => v.placa === veiculo.placa);
    if (veiculoJaExiste) {
      showAlert('Um veículo com esta placa já está cadastrado!', 'danger');
      return;
    }
    veiculosExistentes.push(veiculo);
    await salvarDados('veiculos.json', veiculosExistentes);
    showAlert('✅ Veículo salvo com sucesso!');
    formVeiculo.reset();
    selectClienteVeiculo.value = '';
    await carregarClientesEVeiculos();
  });

  async function abrirModalEditarCliente(documentoCliente) {
    const clienteParaEditar = todosClientes.find(c => c.documento === documentoCliente);
    if (clienteParaEditar) {
      document.getElementById('editClienteDocumento').value = clienteParaEditar.documento;
      document.getElementById('editNomeCliente').value = clienteParaEditar.nome;
      document.getElementById('editTelefoneCliente').value = clienteParaEditar.telefone;
      document.getElementById('editEmailCliente').value = clienteParaEditar.email;
      document.getElementById('editEnderecoCliente').value = clienteParaEditar.endereco;
      document.getElementById('editCidadeCliente').value = clienteParaEditar.cidade;
      document.getElementById('editBairroCliente').value = clienteParaEditar.bairro;
      document.getElementById('editCepCliente').value = clienteParaEditar.cep;
      const modal = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
      modal.show();
    }
  }

  document.getElementById('form-editar-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();

    const telefone = document.getElementById('editTelefoneCliente').value;
    if (!validatePhone(telefone)) {
        showAlert('Telefone inválido. Deve conter DDD + 8 ou 9 dígitos.', 'danger');
        return;
    }

    const documentoOriginal = document.getElementById('editClienteDocumento').value;
    const novosDadosCliente = {
      nome: document.getElementById('editNomeCliente').value,
      telefone: document.getElementById('editTelefoneCliente').value,
      email: document.getElementById('editEmailCliente').value,
      endereco: document.getElementById('editEnderecoCliente').value,
      cidade: document.getElementById('editCidadeCliente').value,
      bairro: document.getElementById('editBairroCliente').value,
      cep: document.getElementById('editCepCliente').value
    };
    const sucesso = await editarDados('clientes.json', 'documento', documentoOriginal, novosDadosCliente);
    if (sucesso) {
      showAlert('✅ Cliente atualizado com sucesso!');
      const clienteAntigo = todosClientes.find(c => c.documento === documentoOriginal);
      if (clienteAntigo && clienteAntigo.nome !== novosDadosCliente.nome) {
        const veiculosDoCliente = todosVeiculos.filter(v => v.cliente === clienteAntigo.nome);
        for (const veiculo of veiculosDoCliente) {
          await editarDados('veiculos.json', 'placa', veiculo.placa, { cliente: novosDadosCliente.nome });
        }
      }
      bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente')).hide();
      await carregarClientesEVeiculos();
    } else {
      showAlert('❌ Erro ao atualizar cliente.', 'danger');
    }
  });

  async function abrirModalEditarVeiculo(placaVeiculo) {
    const veiculoParaEditar = todosVeiculos.find(v => v.placa === placaVeiculo);
    if (veiculoParaEditar) {
      document.getElementById('editVeiculoPlacaOriginal').value = veiculoParaEditar.placa;
      document.getElementById('editVeiculoCliente').value = veiculoParaEditar.cliente;
      document.getElementById('editMarcaVeiculo').value = veiculoParaEditar.marca;
      document.getElementById('editModeloVeiculo').value = veiculoParaEditar.modelo;
      document.getElementById('editAnoVeiculo').value = veiculoParaEditar.ano;
      document.getElementById('editPlacaVeiculo').value = veiculoParaEditar.placa;
      document.getElementById('editCorVeiculo').value = veiculoParaEditar.cor;
      document.getElementById('editQuilometragemVeiculo').value = veiculoParaEditar.quilometragem;
      const modal = new bootstrap.Modal(document.getElementById('modalEditarVeiculo'));
      modal.show();
    }
  }

  document.getElementById('form-editar-veiculo').addEventListener('submit', async (e) => {
    e.preventDefault();

    const ano = document.getElementById('editAnoVeiculo').value;
    const placa = document.getElementById('editPlacaVeiculo').value;

    if (!validateVehicleYear(ano)) {
        showAlert('Ano do veículo inválido. Use 4 dígitos (ex: 2023) e um ano realista.', 'danger');
        return;
    }
    if (!validateVehiclePlate(placa)) {
        showAlert('Placa do veículo inválida. Use o formato AAA-1234 ou AAA-1B23.', 'danger');
        return;
    }

    const placaOriginal = document.getElementById('editVeiculoPlacaOriginal').value;
    const novosDadosVeiculo = {
      marca: document.getElementById('editMarcaVeiculo').value,
      modelo: document.getElementById('editModeloVeiculo').value,
      ano: document.getElementById('editAnoVeiculo').value,
      placa: document.getElementById('editPlacaVeiculo').value,
      cor: document.getElementById('editCorVeiculo').value,
      quilometragem: document.getElementById('editQuilometragemVeiculo').value
    };
    if (placaOriginal !== novosDadosVeiculo.placa) {
      const veiculosExistentes = await lerDados('veiculos.json');
      const placaJaExiste = veiculosExistentes.some(v => v.placa === novosDadosVeiculo.placa && v.placa !== placaOriginal);
      if (placaJaExiste) {
        showAlert('❌ Já existe um veículo com a nova placa informada!', 'danger');
        return;
      }
    }
    const sucesso = await editarDados('veiculos.json', 'placa', placaOriginal, novosDadosVeiculo);
    if (sucesso) {
      showAlert('✅ Veículo atualizado com sucesso!');
      bootstrap.Modal.getInstance(document.getElementById('modalEditarVeiculo')).hide();
      await carregarClientesEVeiculos();
    } else {
      showAlert('❌ Erro ao atualizar veículo.', 'danger');
    }
  });

  async function excluirCliente(documentoCliente) {
    showConfirm(`Tem certeza que deseja excluir o cliente com CPF/CNPJ: ${documentoCliente}? Isso também removerá todos os veículos associados a ele.`, async () => {
      const clienteParaExcluir = todosClientes.find(c => c.documento === documentoCliente);
      if (clienteParaExcluir) {
        const nomeCliente = clienteParaExcluir.nome;
        const veiculosDoCliente = todosVeiculos.filter(v => v.cliente === nomeCliente);
        for (const veiculo of veiculosDoCliente) {
          await excluirDados('veiculos.json', 'placa', veiculo.placa);
        }
        const servicosDoCliente = await lerDados('servicos.json');
        const servicosAtualizados = servicosDoCliente.filter(s => s.cliente !== nomeCliente);
        await salvarDados('servicos.json', servicosAtualizados);
        const sucesso = await excluirDados('clientes.json', 'documento', documentoCliente);
        if (sucesso) {
          showAlert('✅ Cliente e seus dados associados excluídos com sucesso!');
          await carregarClientesEVeiculos();
        } else {
          showAlert('❌ Erro ao excluir cliente.', 'danger');
        }
      }
    });
  }

  async function excluirVeiculo(placaVeiculo) {
    showConfirm(`Tem certeza que deseja excluir o veículo com placa: ${placaVeiculo}? Isso também removerá todos os serviços associados a ele.`, async () => {
      const servicosExistentes = await lerDados('servicos.json');
      const servicosAtualizados = servicosExistentes.filter(s => {
        return !s.veiculo.includes(placaVeiculo);
      });
      await salvarDados('servicos.json', servicosAtualizados);
      const sucesso = await excluirDados('veiculos.json', 'placa', placaVeiculo);
      if (sucesso) {
        showAlert('✅ Veículo e seus serviços associados excluídos com sucesso!');
        await carregarClientesEVeiculos();
      } else {
        showAlert('❌ Erro ao excluir veículo.', 'danger');
      }
    });
  }

  carregarClientesEVeiculos();
});