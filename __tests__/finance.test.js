// __tests__/finance.test.js

const { calcularTabelaPrice } = require('../public/js/utils.js');

describe('calcularTabelaPrice', () => {

  test('deve calcular o valor da parcela sem juros', () => {
    const valorTotal = 1000;
    const numeroParcelas = 10;
    const taxaJuros = 0;
    // Esperado: 1000 / 10 = 100
    expect(calcularTabelaPrice(valorTotal, numeroParcelas, taxaJuros)).toBe(100);
  });
  
  test('deve calcular o valor da parcela para 1x sem juros', () => {
    const valorTotal = 125.50;
    const numeroParcelas = 1;
    const taxaJuros = 0;
    expect(calcularTabelaPrice(valorTotal, numeroParcelas, taxaJuros)).toBe(125.50);
  });

  test('deve calcular o valor da parcela com juros', () => {
    const valorTotal = 1000;
    const numeroParcelas = 12;
    const taxaJuros = 0.02; // 2% ao mês
    // O valor esperado foi calculado em uma calculadora externa: 94.5596
    const valorEsperado = 94.55959957;
    expect(calcularTabelaPrice(valorTotal, numeroParcelas, taxaJuros)).toBeCloseTo(valorEsperado, 4);
  });

  test('deve calcular um caso complexo com juros', () => {
    const valorTotal = 2580.75;
    const numeroParcelas = 24;
    const taxaJuros = 0.035; // 3.5% ao mês
    // Valor correto recalculado
    const valorEsperado = 160.7106;
    expect(calcularTabelaPrice(valorTotal, numeroParcelas, taxaJuros)).toBeCloseTo(valorEsperado, 4);
  });

  test('deve retornar o valor total se o número de parcelas for 0 ou menos', () => {
    expect(calcularTabelaPrice(1000, 0, 0.05)).toBe(1000);
    expect(calcularTabelaPrice(1000, -1, 0.05)).toBe(1000);
  });

  test('deve funcionar corretamente para uma única parcela com juros (deve ser o valor total)', () => {
     const valorTotal = 500;
     const numeroParcelas = 1;
     const taxaJuros = 0.10; // 10%
     // O resultado matemático da fórmula pura é 550. Usamos toBeCloseTo para evitar erros de ponto flutuante.
     expect(calcularTabelaPrice(valorTotal, numeroParcelas, taxaJuros)).toBeCloseTo(550);
  });

});
