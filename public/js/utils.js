/* Funções utilitárias reutilizáveis */

function formatarValor(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}