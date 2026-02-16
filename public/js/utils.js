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
// Modal de Confirmação Genérico
function showConfirm(message, callback, title = 'Confirmar Exclusão') {
  let modalEl = document.getElementById('modalConfirmarExclusao');

  // Cria o modal dinamicamente se ele não existir
  if (!modalEl) {
    const modalHTML = `
      <div class="modal fade" id="modalConfirmarExclusao" tabindex="-1" aria-labelledby="modalConfirmarExclusaoLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="modalConfirmarExclusaoLabel">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="corpoModalConfirmacao">
              ${message}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-danger" id="btnConfirmarExclusao">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modalEl = document.getElementById('modalConfirmarExclusao');
  }

  const corpoModal = modalEl.querySelector('#corpoModalConfirmacao');
  const tituloModal = modalEl.querySelector('.modal-title');
  const btnConfirmar = modalEl.querySelector('#btnConfirmarExclusao');

  if (corpoModal) corpoModal.textContent = message;
  if (tituloModal) tituloModal.textContent = title;

  // Verifica se o Bootstrap está disponível
  if (typeof bootstrap === 'undefined') {
    console.error('Bootstrap não carregado. Não é possível exibir o modal.');
    if (confirm(message)) {
      if (callback) callback();
    }
    return;
  }

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
 * Formata uma string de data de 'YYYY-MM-DD' para 'DD/MM/YYYY'.
 * @param {string} dateStr A data no formato 'YYYY-MM-DD'.
 * @returns {string} A data formatada como 'DD/MM/YYYY' ou a string original se o formato for inválido.
 */
function formatDateForDisplay(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
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

  const parcela = valorTotal * ((i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1));
  return parcela;
}

/**
 * Converte uma string de moeda (ex: "R$ 1.234,56") em um número float.
 * @param {string | number} value - O valor a ser convertido.
 * @returns {number} O valor como float, ou 0 se a conversão falhar.
 */
function parseCurrency(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  let numericString = String(value).replace(/R\$\s?/, '');

  // Se a string contém vírgula, assume-se o formato BRL (1.234,56)
  if (numericString.includes(',')) {
    numericString = numericString.replace(/\./g, '').replace(',', '.');
  }
  // Se não contém vírgula, o ponto (se existir) é o separador decimal

  const number = parseFloat(numericString);
  return isNaN(number) ? 0 : number;
}

/**
 * Formata um valor numérico ou uma string de dígitos para o formato de moeda BRL (para inputs).
 * @param {string | number} value - O valor a ser formatado.
 * @returns {string} O valor formatado como moeda (ex: "R$ 1.234,56").
 */
function formatCurrencyForInput(value) {
  if (value === null || value === undefined || value === '') return '';

  let numericValue;
  if (typeof value === 'number') {
    numericValue = value; // O valor já é um número, não precisa de conversão de centavos
  } else {
    // Se for string, assume que são dígitos representando centavos (ex: '12345' -> R$ 123,45)
    let cleanValue = String(value).replace(/\D/g, '');
    if (cleanValue === '') return '';
    numericValue = parseFloat(cleanValue) / 100;
  }

  // Formata para a localidade pt-BR
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(numericValue);

  // Garante um espaço regular após 'R$'
  return formatted.replace('\u00A0', ' ');
}


// Exporta as funções puras para que possam ser usadas pelo Jest nos testes
// E as expõe globalmente para uso no lado do cliente no navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatarValor,
    getLocalDateAsString,
    formatDateForDisplay,
    calcularTabelaPrice,
    parseCurrency,
    formatCurrencyForInput,
  };
  // Expõe as funções globalmente para o ambiente do navegador SOMENTE se window existir
  if (typeof window !== 'undefined') {
    window.formatarValor = formatarValor;
    window.getLocalDateAsString = getLocalDateAsString;
    window.formatDateForDisplay = formatDateForDisplay;
    window.calcularTabelaPrice = calcularTabelaPrice;
    window.parseCurrency = parseCurrency;
    window.formatCurrencyForInput = formatCurrencyForInput;
    window.showConfirm = showConfirm;
  }
}
