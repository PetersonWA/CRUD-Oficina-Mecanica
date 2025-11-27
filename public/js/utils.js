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

/**
 * Calcula o valor de uma parcela usando a fórmula da Tabela Price.
 * @param {number} valorTotal - O valor total do financiamento.
 * @param {number} numeroParcelas - O número de parcelas.
 * @param {number} taxaJuros - A taxa de juros mensal (ex: 0.05 para 5%).
 * @returns {number} O valor da parcela.
 */
function calcularTabelaPrice(valorTotal, numeroParcelas, taxaJuros) {
    if (numeroParcelas <= 0) return valorTotal;
    if (taxaJuros <= 0) {
        return valorTotal / numeroParcelas;
    }
    
    const i = taxaJuros;
    const n = numeroParcelas;
    
    const parcela = valorTotal * ( (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1) );
    return parcela;
}


// Exporta as funções puras para que possam ser usadas pelo Jest nos testes
// E as expõe globalmente para uso no lado do cliente no navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatarValor,
    getLocalDateAsString,
    calcularTabelaPrice,
  };
  // Expõe as funções globalmente para o ambiente do navegador SOMENTE se window existir
  if (typeof window !== 'undefined') {
    window.formatarValor = formatarValor;
    window.getLocalDateAsString = getLocalDateAsString;
    window.calcularTabelaPrice = calcularTabelaPrice;
  }
}
