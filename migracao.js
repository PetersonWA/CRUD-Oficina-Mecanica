const fs = require('fs');
const path = require('path');
const { db, initDb } = require('./database.js');

// Caminho para a pasta de dados original
const dataDir = path.join(__dirname, 'data');

function lerJson(nomeArquivo) {
    const filePath = path.join(dataDir, nomeArquivo);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } 
    return [];
}

function migrar() {
    initDb(); // Garante que o DB e as tabelas existam
    console.log('Iniciando migração de dados do JSON para o SQLite...');

    const clientes = lerJson('clientes.json');
    const veiculos = lerJson('veiculos.json');
    const servicos = lerJson('servicos.json');
    const orcamentos = lerJson('orcamentos.json');
    const ordens = lerJson('ordens.json');

    // Usar transação para performance
    db.transaction(() => {
        // Migrar Clientes
        const stmtCliente = db.prepare('INSERT OR IGNORE INTO clientes (nome, cpf_cnpj, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)');
        for (const cliente of clientes) {
            stmtCliente.run(cliente.nome, cliente.cpf_cnpj, cliente.telefone, cliente.email, cliente.endereco);
        }
        console.log(`${clientes.length} clientes migrados.`);

        // Criar um mapa de nome de cliente para ID para facilitar a associação
        const clienteMap = new Map();
        const todosClientesDb = db.prepare('SELECT id, nome FROM clientes').all();
        todosClientesDb.forEach(c => clienteMap.set(c.nome, c.id));

        // Migrar Veículos
        const stmtVeiculo = db.prepare('INSERT OR IGNORE INTO veiculos (cliente_id, placa, marca, modelo, ano, cor) VALUES (?, ?, ?, ?, ?, ?)');
        for (const veiculo of veiculos) {
            const clienteId = clienteMap.get(veiculo.cliente);
            if (clienteId) {
                stmtVeiculo.run(clienteId, veiculo.placa, veiculo.marca, veiculo.modelo, veiculo.ano, veiculo.cor);
            }
        }
        console.log(`${veiculos.length} veículos migrados.`);
        
    })();

    console.log('Migração concluída com sucesso!');
}

migrar();
