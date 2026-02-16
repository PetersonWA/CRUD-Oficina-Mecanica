-- Migration 001: Initial Schema
-- This migration creates the complete database schema as of version 2.0.5

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT UNIQUE,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    is_deleted INTEGER DEFAULT 0 NOT NULL
);

-- Tabela de Veículos
CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    placa TEXT NOT NULL UNIQUE,
    marca TEXT,
    modelo TEXT,
    ano TEXT,
    cor TEXT,
    quilometragem TEXT,
    is_deleted INTEGER DEFAULT 0 NOT NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
);

-- Tabela de Plano de Contas Gerencial
CREATE TABLE IF NOT EXISTS plano_contas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_conta TEXT NOT NULL,
    tipo TEXT NOT NULL,
    variabilidade TEXT NOT NULL,
    id_pai INTEGER,
    FOREIGN KEY (id_pai) REFERENCES plano_contas (id)
);

-- Tabela de Serviços
CREATE TABLE IF NOT EXISTS servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    veiculo_id INTEGER,
    data_entrada TEXT NOT NULL,
    descricao_problema TEXT,
    valor_total REAL NOT NULL,
    status TEXT NOT NULL,
    mecanico_responsavel TEXT,
    data_conclusao TEXT,
    valor_original REAL,
    valor_desconto REAL,
    forma_pagamento TEXT,
    numero_parcelas INTEGER,
    status_pagamento TEXT,
    is_deleted INTEGER DEFAULT 0 NOT NULL,
    cliente_nome_manual TEXT,
    veiculo_desc_manual TEXT,
    data_competencia TEXT,
    data_vencimento TEXT,
    id_plano_contas INTEGER,
    metodo_pagamento TEXT,
    numero_parcelas_servico INTEGER,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE SET NULL,
    FOREIGN KEY (veiculo_id) REFERENCES veiculos (id) ON DELETE SET NULL,
    FOREIGN KEY (id_plano_contas) REFERENCES plano_contas (id)
);

-- Tabela de Itens de Serviço/Peças
CREATE TABLE IF NOT EXISTS itens_servico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servico_id INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario REAL NOT NULL,
    valor_custo REAL,
    tipo TEXT,
    FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE CASCADE
);

-- Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    servico_id INTEGER,
    valor REAL NOT NULL,
    data_liquidacao TEXT,
    metodo TEXT NOT NULL,
    anotacao TEXT,
    data_competencia TEXT,
    data_vencimento TEXT,
    id_plano_contas INTEGER,
    FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE CASCADE,
    FOREIGN KEY (id_plano_contas) REFERENCES plano_contas (id)
);

-- Tabela de Configurações (Chave-Valor)
CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY NOT NULL,
    valor TEXT
);
