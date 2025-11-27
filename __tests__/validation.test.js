const { validateDocument, validatePhone, validateVehicleYear, validateVehiclePlate, validatePositiveNumber, validatePercentage, maskCpfCnpj, maskPhone, maskCep, maskPlate, formatCurrency } = require('../public/js/validation.js');

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

  describe('formatCurrency', () => {
    test('deve formatar um valor para moeda (inteiro)', () => {
      expect(formatCurrency('12345')).toBe('R$ 123,45');
    });

    test('deve formatar um valor para moeda (centavos)', () => {
      expect(formatCurrency('75')).toBe('R$ 0,75');
    });

    test('deve formatar um valor para moeda (milhares)', () => {
      expect(formatCurrency('100000')).toBe('R$ 1.000,00');
    });

    test('deve retornar string vazia para input vazio', () => {
      expect(formatCurrency('')).toBe('');
    });

    test('deve remover caracteres não numéricos e formatar', () => {
      expect(formatCurrency('abc12.3,45')).toBe('R$ 123,45');
      expect(formatCurrency('R$ 1.234,56')).toBe('R$ 1.234,56');
    });
  });
});

// ===================================================================================
// Novos Testes Adicionados
// ===================================================================================

describe('validateVehicleYear', () => {
  const currentYear = new Date().getFullYear();

  test('deve retornar true para um ano válido', () => {
    expect(validateVehicleYear(currentYear)).toBe(true);
    expect(validateVehicleYear(2010)).toBe(true);
    expect(validateVehicleYear(1999)).toBe(true);
  });

  test('deve retornar true para um ano futuro (próximo ano)', () => {
    expect(validateVehicleYear(currentYear + 1)).toBe(true);
  });

  test('deve retornar false para um ano muito no futuro', () => {
    expect(validateVehicleYear(currentYear + 2)).toBe(false);
  });

  test('deve retornar false para um ano muito antigo', () => {
    expect(validateVehicleYear(1899)).toBe(false);
  });

  test('deve retornar false para formatos inválidos', () => {
    expect(validateVehicleYear('abc')).toBe(false);
    expect(validateVehicleYear('201')).toBe(false);
    expect(validateVehicleYear('20100')).toBe(false);
  });

  test('deve retornar true para input vazio ou nulo', () => {
    expect(validateVehicleYear('')).toBe(true);
    expect(validateVehicleYear(null)).toBe(true);
  });
});

describe('validateVehiclePlate', () => {
  test('deve retornar true para placas no padrão antigo', () => {
    expect(validateVehiclePlate('ABC-1234')).toBe(true);
    expect(validateVehiclePlate('XYZ-9876')).toBe(true);
  });

  test('deve retornar true para placas no padrão antigo digitadas sem hífen', () => {
    expect(validateVehiclePlate('ABC1234')).toBe(true);
  });
  
  test('deve retornar true para placas no padrão Mercosul', () => {
    expect(validateVehiclePlate('ABC1D23')).toBe(true);
  });
  
  test('deve ser case-insensitive', () => {
    expect(validateVehiclePlate('abc-1234')).toBe(true);
    expect(validateVehiclePlate('abc1d23')).toBe(true);
  });

  test('deve retornar false para placas inválidas', () => {
    expect(validateVehiclePlate('AB-1234')).toBe(false);
    expect(validateVehiclePlate('A12-1234')).toBe(false);
    expect(validateVehiclePlate('ABC-123')).toBe(false);
    expect(validateVehiclePlate('ABC12345')).toBe(false);
  });

  test('deve retornar true para input vazio ou nulo', () => {
    expect(validateVehiclePlate('')).toBe(true);
    expect(validateVehiclePlate(null)).toBe(true);
  });
});

describe('validatePositiveNumber', () => {
  test('deve retornar true para números positivos', () => {
    expect(validatePositiveNumber('100')).toBe(true);
    expect(validatePositiveNumber('0.5')).toBe(true);
    expect(validatePositiveNumber('R$ 1.234,56')).toBe(true);
  });

  test('deve retornar false para zero', () => {
    expect(validatePositiveNumber('0')).toBe(false);
    expect(validatePositiveNumber('R$ 0,00')).toBe(false);
  });

  test('deve retornar false para números negativos', () => {
    expect(validatePositiveNumber('-10')).toBe(false);
  });

  test('deve retornar false para strings não numéricas', () => {
    expect(validatePositiveNumber('abc')).toBe(false);
  });
});

describe('validatePercentage', () => {
  test('deve retornar true para percentuais válidos (0-100)', () => {
    expect(validatePercentage('0')).toBe(true);
    expect(validatePercentage('100')).toBe(true);
    expect(validatePercentage('55.5')).toBe(true);
  });

  test('deve retornar false para percentuais fora do range', () => {
    expect(validatePercentage('-1')).toBe(false);
    expect(validatePercentage('100.1')).toBe(false);
  });

  test('deve retornar false para strings não numéricas', () => {
    expect(validatePercentage('abc')).toBe(false);
  });
});