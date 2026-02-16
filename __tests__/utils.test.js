// __tests__/utils.test.js

// Mock a a função 'getLocalDateAsString' se ela não for exportada, ou importe-a
// Como não temos um ambiente de módulo ES6, vamos ter que redefinir as funções aqui ou usar require se o arquivo utils.js exportá-las.

// Supondo que utils.js precise ser adaptado para exportar suas funções como validation.js fez.
// Vamos primeiro criar o teste como se utils.js já exportasse as funções.

const { formatarValor, getLocalDateAsString, parseCurrency, formatCurrencyForInput } = require('../public/js/utils.js');


describe('formatarValor', () => {

  test('deve formatar um número para uma string com duas casas decimais', () => {
    expect(formatarValor(1500.5)).toBe('1.500,50');
  });

  test('deve formatar um número inteiro', () => {
    expect(formatarValor(200)).toBe('200,00');
  });

  test('deve usar um ponto para milhares', () => {
    expect(formatarValor(1234567.89)).toBe('1.234.567,89');
  });

  test('deve retornar "0,00" para input não numérico', () => {
    expect(formatarValor('abc')).toBe('0,00');
    expect(formatarValor(null)).toBe('0,00');
    expect(formatarValor(undefined)).toBe('0,00');
  });

});


describe('getLocalDateAsString', () => {

  test('deve formatar corretamente uma data UTC de meio-dia', () => {
    // Usando uma data que não tem problemas de timezone na conversão
    const date = new Date('2025-10-01T12:00:00Z'); // Meio-dia UTC
    expect(getLocalDateAsString(date)).toBe('2025-10-01');
  });

  test('deve formatar corretamente a virada do ano', () => {
    const date = new Date('2024-12-31T12:00:00Z');
    expect(getLocalDateAsString(date)).toBe('2024-12-31');
  });

  test('deve formatar datas que podem causar problemas de fuso horário', () => {
    // Um instante antes da meia-noite UTC. Em fusos como o do Brasil (UTC-3), isso ainda é dia 25.
    const dateInBrazil = new Date('2025-11-26T02:59:59Z'); // 23:59:59 do dia 25 no Brasil
    expect(getLocalDateAsString(dateInBrazil)).toBe('2025-11-25');
  });
  
    test('deve formatar corretamente o início de um mês', () => {
    const date = new Date('2025-03-01T12:00:00Z');
    expect(getLocalDateAsString(date)).toBe('2025-03-01');
  });

});

describe('parseCurrency', () => {
  test('deve converter formato BRL com R$ para float', () => {
    expect(parseCurrency('R$ 1.234,56')).toBe(1234.56);
  });

  test('deve converter formato BRL sem R$ para float', () => {
    expect(parseCurrency('1.234,56')).toBe(1234.56);
  });

  test('deve converter formato com vírgula para float', () => {
    expect(parseCurrency('123,45')).toBe(123.45);
  });

  test('deve converter formato com ponto para float', () => {
    expect(parseCurrency('123.45')).toBe(123.45);
  });

  test('deve converter um número inteiro em string para float', () => {
    expect(parseCurrency('123')).toBe(123);
  });
  
  test('deve retornar o próprio número se a entrada for um número', () => {
    expect(parseCurrency(123.45)).toBe(123.45);
  });

  test('deve retornar 0 para string vazia, nula ou indefinida', () => {
    expect(parseCurrency('')).toBe(0);
    expect(parseCurrency(null)).toBe(0);
    expect(parseCurrency(undefined)).toBe(0);
  });

  test('deve retornar 0 para uma string inválida', () => {
    expect(parseCurrency('abc')).toBe(0);
  });
});

describe('formatCurrencyForInput', () => {
  test('deve formatar um número float para o formato de moeda BRL', () => {
    expect(formatCurrencyForInput(1234.56)).toBe('R$ 1.234,56');
  });

  test('deve formatar um número inteiro para o formato de moeda BRL', () => {
    expect(formatCurrencyForInput(1234)).toBe('R$ 1.234,00');
  });

  test('deve formatar uma string de dígitos para o formato de moeda BRL', () => {
    expect(formatCurrencyForInput('123456')).toBe('R$ 1.234,56');
  });

  test('deve retornar uma string vazia para uma string de input vazia', () => {
    expect(formatCurrencyForInput('')).toBe('');
  });

  test('deve retornar uma string vazia para null ou undefined', () => {
    expect(formatCurrencyForInput(null)).toBe('');
    expect(formatCurrencyForInput(undefined)).toBe('');
  });
});

