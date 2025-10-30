/* Funções utilitárias reutilizáveis */

function formatarValor(valor) {
  if (typeof valor !== 'number') {
    return '0,00';
  }
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function lerDados(arquivo) {
  return await window.api.readData(arquivo) || [];
}

async function salvarDados(arquivo, dados) {
  await window.api.writeData(arquivo, dados);
}

// Modal de Confirmação Genérico
function showConfirm(message, callback) {
  const modalEl = document.getElementById('modalConfirmarExclusao');
  if (!modalEl) {
    console.error('Elemento do modal de confirmação não encontrado no DOM.');
    return;
  }

  const corpoModal = modalEl.querySelector('#corpoModalConfirmacao');
  const btnConfirmar = modalEl.querySelector('#btnConfirmarExclusao');
  
  corpoModal.textContent = message;

  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);

  // Clona o botão para remover listeners antigos e evitar chamadas múltiplas
  const newBtn = btnConfirmar.cloneNode(true);
  btnConfirmar.parentNode.replaceChild(newBtn, btnConfirmar);

  newBtn.addEventListener('click', () => {
    if (callback) callback();
    modalInstance.hide();
  });

  modalInstance.show();
}

/**
 * Converte um objeto Date para uma string no formato YYYY-MM-DD, respeitando o fuso horário local.
 * Evita o problema de "pular um dia" que ocorre com toISOString() em algumas zonas.
 * @param {Date} date O objeto Date a ser convertido.
 * @returns {string} A data formatada como YYYY-MM-DD.
 */
function getLocalDateAsString(date) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
}
