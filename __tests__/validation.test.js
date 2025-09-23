const { validateDocument, validatePhone, validateVehicleYear, validateVehiclePlate, validatePositiveNumber, validatePercentage, maskCpfCnpj, maskPhone, maskCep, maskPlate, maskCurrency } = require('../public/js/validation.js');

describe('validateDocument', () => {

  describe('CPF Validation', () => {
    test('deve retornar true para um CPF válido', () => {
      expect(validateDocument('214.130.648-50')).toBe(true);
    });

    test('deve retornar false para um CPF inválido', () => {
      expect(validateDocument('214.130.648-35')).toBe(false);
    });
  });

  describe('CNPJ Validation', () => {
    test('deve retornar true para um CNPJ válido', () => {
      expect(validateDocument('45.997.418/0001-53')).toBe(true);
    });

    test('deve retornar false para um CNPJ inválido', () => {
      expect(validateDocument('26.775.624/0001-21')).toBe(false);
    });
  });
});

describe('validatePhone', () => {
  test('deve retornar true para telefones válidos', () => {
    expect(validatePhone('(11) 98765-4321')).toBe(true);
    expect(validatePhone('1187654321')).toBe(true);
  });

  test('deve retornar false para telefones inválidos', () => {
    expect(validatePhone('123456789')).toBe(false);
    expect(validatePhone('123456789012')).toBe(false);
  });
});

// ... (outros testes de validação que já estavam passando)

// ===================================================================================
// Testes para as Funções de Máscara (Versão Corrigida)
// ===================================================================================

describe('Funções de Máscara', () => {

  describe('maskCpfCnpj', () => {
    test('deve aplicar a máscara de CPF em um número completo', () => {
      expect(maskCpfCnpj('12345678901')).toBe('123.456.789-01');
    });

    test('deve aplicar a máscara de CNPJ em um número completo', () => {
      expect(maskCpfCnpj('12345678000190')).toBe('12.345.678/0001-90');
    });
  });

  describe('maskPhone', () => {
    test('deve aplicar a máscara para celular (11 dígitos)', () => {
      expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    });

    test('deve aplicar a máscara para telefone fixo (10 dígitos)', () => {
      expect(maskPhone('1187654321')).toBe('(11) 8765-4321');
    });
  });

  describe('maskCep', () => {
    test('não deve adicionar hífen em CEP incompleto', () => {
      expect(maskCep('12345')).toBe('12345');
    });

    test('deve aplicar a máscara em CEP completo', () => {
      expect(maskCep('12345678')).toBe('12345-678');
    });
  });

  describe('maskPlate', () => {
    test('deve converter para maiúsculas', () => {
      expect(maskPlate('abc-1234')).toBe('ABC-1234');
    });
  });

  describe('maskCurrency', () => {
    test('deve formatar um valor para moeda', () => {
      const input = { value: '12345' }; // R$ 123,45
      maskCurrency(input);
      expect(input.value).toMatch(/R\$\s*123,45/);
    });
  });
});