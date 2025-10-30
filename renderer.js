function getLocalDateAsString(format = 'dd/mm/yyyy') {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
    const ano = hoje.getFullYear();

    if (format === 'yyyy-mm-dd') {
        return `${ano}-${mes}-${dia}`;
    }
    return `${dia}/${mes}/${ano}`;
}


async function buscarDados(arquivo, termoBusca, campo) {
  const dados = await lerDados(arquivo);
  if (!termoBusca || !campo) {
    return dados; // Retorna todos os dados se não houver termo ou campo de busca
  }
  const termoBuscaLower = termoBusca.toLowerCase();
  return dados.filter(item => {
    const valorCampo = item[campo];
    return valorCampo && String(valorCampo).toLowerCase().includes(termoBuscaLower);
  });
}
async function editarDados(arquivo, idCampo, idValor, novosDados) {
  const dados = await lerDados(arquivo);
  const index = dados.findIndex(item => item[idCampo] === idValor);
  if (index !== -1) {
    dados[index] = { ...dados[index], ...novosDados };
    await salvarDados(arquivo, dados);
    return true;
  }
  return false;
}
async function excluirDados(arquivo, idCampo, idValor) {
  const dados = await lerDados(arquivo);
  const dadosAtualizados = dados.filter(item => item[idCampo] !== idValor);
  if (dadosAtualizados.length < dados.length) {
    await salvarDados(arquivo, dadosAtualizados);
    return true;
  }
  return false;
}

function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.error('Elemento #alert-container não encontrado no DOM.');
        alert(message);
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const alertElement = wrapper.firstElementChild;
    if (alertElement) {
        alertContainer.append(alertElement);
        const bsAlert = new bootstrap.Alert(alertElement);
        setTimeout(() => {
            bsAlert.close();
        }, 5000);
    }
}