// ===================================================================================
// Funções de Validação e Máscara (v2 - Corrigida)
// ===================================================================================

/**
 * Adiciona um listener a um campo de input para aplicar uma máscara em tempo real.
 * @param {string} inputId - O ID do elemento de input.
 * @param {function} maskFn - A função de máscara a ser aplicada.
 */
function addInputMask(inputId, maskFn) {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', (e) => {
            e.target.value = maskFn(e.target.value);
        });
    }
}

// -----------------------------------------------------------------------------------
// Máscaras
// -----------------------------------------------------------------------------------

function maskCpfCnpj(value) {
    value = value.replace(/\D/g, '');
    if (value.length > 11) {
        // CNPJ: 00.000.000/0000-00
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        // CPF: 000.000.000-00
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
}

function maskPhone(value) {
    value = value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d{4,5})(\d{4})$/, '$1-$2');
    return value;
}

function maskCep(value) {
    value = value.replace(/\D/g, '');
    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    return value;
}

function maskPlate(value) {
    value = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return value;
}


// -----------------------------------------------------------------------------------
// Validações
// -----------------------------------------------------------------------------------

function validateCPF(cpf) {
    cpf = String(cpf).replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    let rest;

    for (let i = 1; i <= 9; i++) {
        sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    rest = (sum * 10) % 11;

    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    rest = (sum * 10) % 11;

    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

function validateCNPJ(cnpj) {
    cnpj = String(cnpj).replace(/[^\d]+/g, '');

    if (cnpj.length !== 14) return false;

    // Elimina CNPJs com todos os dígitos iguais
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    // Valida DVs
    let tamanho = 12;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(12);
    let soma = 0;
    let pos = 5;

    for (let i = 0; i < tamanho; i++) {
        soma += parseInt(numeros.charAt(i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = 13;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = 6;

    for (let i = 0; i < tamanho; i++) {
        soma += parseInt(numeros.charAt(i)) * pos--;
        if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
}

// Valida o documento (CPF/CNPJ). Retorna true se o campo estiver vazio.
function validateDocument(doc) {
    const cleanDoc = String(doc).replace(/[^\d]+/g, '');
    if (cleanDoc.length === 0) return true; // Permite campo vazio
    if (cleanDoc.length === 11) return validateCPF(cleanDoc);
    if (cleanDoc.length === 14) return validateCNPJ(cleanDoc);
    return false; // Inválido se não estiver vazio e não tiver o tamanho certo
}

// Valida o telefone. Retorna true se o campo estiver vazio.
function validatePhone(phone) {
    const cleanPhone = String(phone).replace(/[^\d]+/g, '');
    if (cleanPhone.length === 0) return true; // Permite campo vazio
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

// Valida o ano do veículo. Retorna true se o campo estiver vazio.
function validateVehicleYear(year) {
    if (!year) return true; // Permite campo vazio
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year, 10);
    return /^\d{4}$/.test(year) && yearNum <= currentYear + 1 && yearNum >= 1900;
}

// Valida a placa do veículo. Retorna true se o campo estiver vazio.
function validateVehiclePlate(plate) {
    if (!plate) return true; // Permite campo vazio
    const p = plate.toUpperCase();

    // Padrão Mercosul: AAA1B23 (sem hífen)
    const mercosulPattern = /^[A-Z]{3}\d[A-Z]\d{2}$/;
    if (mercosulPattern.test(p)) {
        return true;
    }

    // Padrão antigo: AAA-1234 (com hífen)
    const oldPattern = /^[A-Z]{3}-\d{4}$/;
    if (oldPattern.test(p)) {
        return true;
    }

    // Tenta validar padrão antigo digitado sem o hífen: AAA1234
    const cleanPlate = p.replace(/-/g, '');
    const oldPatternNoHyphen = /^[A-Z]{3}\d{4}$/;
    if (cleanPlate.length === 7 && oldPatternNoHyphen.test(cleanPlate)) {
        return true;
    }

    return false; // Se não passou em nenhum dos padrões
}

// -----------------------------------------------------------------------------------
// Funções para Orçamento e OS
// -----------------------------------------------------------------------------------

/**
 * Formata um valor numérico (em string) para o formato de moeda BRL.
 * Esta é uma função pura: recebe um valor e retorna um valor formatado.
 * @param {string} value - O valor a ser formatado (ex: "12345" para R$123,45).
 * @returns {string} O valor formatado como moeda (ex: "R$ 123,45").
 */
function maskCurrency(inputElement) {
    if (inputElement && inputElement.value !== undefined) {
        inputElement.value = window.formatCurrencyForInput(inputElement.value);
    }
}

function validatePercentage(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
}

// Exporta as funções para que possam ser usadas pelo Jest nos testes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateCPF,
    validateCNPJ,
    validateDocument,
    validatePhone,
    validateVehicleYear,
    validateVehiclePlate,
    validatePercentage,
    maskCpfCnpj,
    maskPhone,
    maskCep,
    maskPlate,
    maskCurrency
  };
}