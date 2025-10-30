const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, 'data', 'oficina.db');
const db = new Database(dbPath, { verbose: console.log });

function getServicosParaPagamentos(busca) {
    const { termo, campo, sortKey, sortOrder } = busca;

    let query = `
        SELECT 
            s.id,
            COALESCE(s.cliente_nome_manual, c.nome) as clienteNome,
            COALESCE(s.veiculo_desc_manual, v.placa) as placaVeiculo,
            s.data as dataEntrada,
            s.valor_total as valorTotal,
            s.forma_pagamento as formaPagamento,
            s.status_pagamento as statusPagamento
        FROM servicos s
        LEFT JOIN clientes c ON s.cliente_id = c.id
        LEFT JOIN veiculos v ON s.veiculo_id = v.id
        WHERE s.is_deleted = 0 AND s.status NOT IN ('Pendente', 'Recusado')
    `;

    const params = [];

    if (termo && campo) {
        let campoSql = '';
        // Ajuste para buscar no campo correto usando COALESCE
        if (campo === 'clienteNome') campoSql = 'COALESCE(s.cliente_nome_manual, c.nome)';
        else if (campo === 'placaVeiculo') campoSql = 'COALESCE(s.veiculo_desc_manual, v.placa)';
        else if (campo === 'status') campoSql = 's.status_pagamento';
        
        if(campoSql){
            query += ` AND ${campoSql} LIKE ?`;
            params.push(`%${termo}%`);
        }
    }

    const validSortKeys = ['id', 'clienteNome', 'placaVeiculo', 'dataEntrada', 'valorTotal', 'formaPagamento', 'statusPagamento'];
    const sortColumn = validSortKeys.includes(sortKey) ? (sortKey === 'id' ? 's.id' : sortKey) : 's.id';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${orderDirection}`;

    return db.prepare(query).all(params);
}

function getServicoComPagamentos(servicoId) {
    const servico = db.prepare(`
        SELECT id, valor_total as valorTotal FROM servicos WHERE id = ?
    `).get(servicoId);

    if (!servico) return null;

    servico.pagamentos = db.prepare(`
        SELECT valor, data, metodo, anotacao FROM pagamentos WHERE servico_id = ? ORDER BY data DESC
    `).all(servicoId);

    servico.totalPago = servico.pagamentos.reduce((acc, p) => acc + p.valor, 0);
    servico.saldoDevedor = servico.valorTotal - servico.totalPago;

    return servico;
}

function adicionarPagamento(pagamento) {
    const transaction = db.transaction((p) => {
        // 1. Inserir o novo pagamento
        const stmtPagamento = db.prepare(
            'INSERT INTO pagamentos (servico_id, valor, data, metodo, anotacao) VALUES (?, ?, ?, ?, ?)'
        );
        stmtPagamento.run(p.servico_id, p.valor, p.data, p.metodo, p.anotacao);

        // 2. Recalcular o total pago para o serviço
        const { totalPago } = db.prepare(
            'SELECT SUM(valor) as totalPago FROM pagamentos WHERE servico_id = ?'
        ).get(p.servico_id);

        // 3. Obter o valor total do serviço
        const { valorTotal } = db.prepare('SELECT valor_total as valorTotal FROM servicos WHERE id = ?').get(p.servico_id);

        // 4. Determinar o novo status de pagamento
        let novoStatus;
        if (totalPago >= valorTotal) {
            novoStatus = 'Pago';
        } else if (totalPago > 0) {
            novoStatus = 'Parcialmente Pago';
        } else {
            novoStatus = 'Pendente';
        }

        // 5. Determinar a forma de pagamento consolidada
        const metodos = db.prepare('SELECT DISTINCT metodo FROM pagamentos WHERE servico_id = ?').all(p.servico_id);
        let novaFormaPagamento = '';
        if (metodos.length === 1) {
            novaFormaPagamento = metodos[0].metodo;
        } else if (metodos.length > 1) {
            novaFormaPagamento = 'Múltiplos';
        }

        // 6. Atualizar a tabela de serviços
        const stmtUpdateServico = db.prepare(
            'UPDATE servicos SET status_pagamento = ?, forma_pagamento = ? WHERE id = ?'
        );
        stmtUpdateServico.run(novoStatus, novaFormaPagamento, p.servico_id);

        return { message: 'Pagamento adicionado e serviço atualizado com sucesso!' };
    });

    try {
        return transaction(pagamento);
    } catch (error) {
        console.error("Erro ao adicionar pagamento:", error);
        throw new Error('Falha ao processar o pagamento no banco de dados.');
    }
}

function getDadosDashboard(filtros) {
    const { cliente, veiculo, status, dataInicio, dataFim, page, itemsPerPage, groupBy } = filtros;

    let whereClauses = [];
    const params = {};

    if (cliente) {
        whereClauses.push('COALESCE(s.cliente_nome_manual, c.nome) LIKE @cliente');
        params.cliente = `%${cliente}%`;
    }
    if (veiculo) {
        whereClauses.push('COALESCE(s.veiculo_desc_manual, v.placa) LIKE @veiculo');
        params.veiculo = `%${veiculo}%`;
    }
    if (status) {
        whereClauses.push('s.status = @status');
        params.status = status;
    }
    if (dataInicio) {
        whereClauses.push('s.data >= @dataInicio');
        params.dataInicio = dataInicio;
    }
    if (dataFim) {
        whereClauses.push('s.data <= @dataFim');
        params.dataFim = dataFim;
    }

    whereClauses.push('s.is_deleted = 0');
    whereClauses.push("s.status NOT IN ('Pendente', 'Recusado')");
    const whereString = `WHERE ${whereClauses.join(' AND ')}`;

    const baseQuery = `
        FROM servicos s
        LEFT JOIN clientes c ON s.cliente_id = c.id
        LEFT JOIN veiculos v ON s.veiculo_id = v.id
        ${whereString}
    `;

    const offset = (page - 1) * itemsPerPage;

    const servicos = db.prepare(`
        SELECT 
            s.id, s.status, s.data as dataEntrada, s.data_conclusao as dataConclusao, 
            s.valor_total as valorTotal, 
            COALESCE(s.cliente_nome_manual, c.nome) as clienteNome, 
            COALESCE(s.veiculo_desc_manual, v.placa) as placaVeiculo, 
            s.mecanico_responsavel as mecanico,
            s.status_pagamento as statusPagamento
        ${baseQuery}
        ORDER BY s.data DESC
        LIMIT @itemsPerPage OFFSET @offset
    `).all({ ...params, itemsPerPage, offset });

    const totalServicos = db.prepare(`SELECT COUNT(s.id) as count ${baseQuery}`).get(params).count;

    // KPI Calculations
        const allFilteredServicos = db.prepare(`SELECT s.id, s.valor_total, s.status_pagamento, s.status ${baseQuery}`).all(params);
        const servicoIds = allFilteredServicos.map(s => s.id);

        let receitaRealizada = 0;
        let pendente = 0;
        let servicosPagosCount = 0;

        if (servicoIds.length > 0) {
            const placeholders = servicoIds.map(() => '?').join(',');
            const pagamentos = db.prepare(`SELECT servico_id, valor, data FROM pagamentos WHERE servico_id IN (${placeholders})`).all(servicoIds);
            
            const pagamentosPorServico = pagamentos.reduce((acc, p) => {
                if (!acc[p.servico_id]) {
                    acc[p.servico_id] = 0;
                }
                acc[p.servico_id] += p.valor;
                return acc;
            }, {});

            allFilteredServicos.forEach(s => {
                const totalPago = pagamentosPorServico[s.id] || 0;
                receitaRealizada += totalPago;

                if (s.valor_total > totalPago) {
                    pendente += s.valor_total - totalPago;
                }

                if (s.status_pagamento === 'Pago') {
                    servicosPagosCount++;
                }
            });

            // Chart data
            const receitaRealizadaChartData = (() => {
                let format;
                switch (filtros.groupBy) {
                    case 'day': format = '%d/%m/%Y'; break;
                    case 'year': format = '%Y'; break;
                    default: format = '%m/%Y'; break;
                }
                const query = `
                    SELECT STRFTIME('${format}', data) as time_unit, SUM(valor) as total
                    FROM pagamentos
                    WHERE servico_id IN (${placeholders})
                    GROUP BY time_unit
                    ORDER BY data
                `;
                return db.prepare(query).all(servicoIds);
            })();

            const tipoItemData = db.prepare(`
                SELECT tipo, SUM(valor_unitario * quantidade) as total
                FROM itens_servico
                WHERE servico_id IN (${placeholders})
                GROUP BY tipo
            `).all(servicoIds);

            const statusData = allFilteredServicos.reduce((acc, s) => {
                acc[s.status] = (acc[s.status] || 0) + 1;
                return acc;
            }, {});

            const topItensData = db.prepare(`
                SELECT descricao, SUM(valor_unitario * quantidade) as total
                FROM itens_servico
                WHERE servico_id IN (${placeholders})
                GROUP BY descricao
                ORDER BY total DESC
                LIMIT 10
            `).all(servicoIds);

            const charts = {
                receitaRealizada: {
                    labels: receitaRealizadaChartData.map(item => item.time_unit),
                    data: receitaRealizadaChartData.map(item => item.total),
                },
                tipoItem: {
                    receita: tipoItemData,
                    status: statusData,
                },
                topItens: topItensData,
            };

            const ticketMedio = servicosPagosCount > 0 ? receitaRealizada / servicosPagosCount : 0;

            const kpis = {
                receitaRealizada,
                pendente,
                ticketMedio,
                lucroBruto: tipoItemData.find(item => item.tipo === 'Mão de Obra')?.total || 0,
            };

            return { servicos, totalServicos, kpis, charts };
        }

        // Default return if no services
        return {
            servicos: [],
            totalServicos: 0,
            kpis: { receitaRealizada: 0, pendente: 0, ticketMedio: 0, lucroBruto: 0 },
            charts: { 
                receitaRealizada: { labels: [], data: [] },
                tipoItem: { receita: [], status: {} },
                topItens: [],
            },
        };
}


function initDb() {
    console.log('Initializing the database...');

    // Tabela de Clientes
    db.prepare(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf_cnpj TEXT UNIQUE,
            telefone TEXT,
            email TEXT,
            endereco TEXT
        )
    `).run();
    try { db.prepare('ALTER TABLE clientes ADD COLUMN is_deleted INTEGER DEFAULT 0').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }

    // Tabela de Veículos
    db.prepare(`
        CREATE TABLE IF NOT EXISTS veiculos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            placa TEXT NOT NULL UNIQUE,
            marca TEXT,
            modelo TEXT,
            ano TEXT,
            cor TEXT,
            quilometragem TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
        )
    `).run();
    try { db.prepare('ALTER TABLE veiculos ADD COLUMN is_deleted INTEGER DEFAULT 0').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }

    // Tabela de Serviços
    db.prepare(`
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            veiculo_id INTEGER,
            data TEXT NOT NULL,
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
            is_deleted INTEGER DEFAULT 0,
            cliente_nome_manual TEXT,
            veiculo_desc_manual TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE SET NULL,
            FOREIGN KEY (veiculo_id) REFERENCES veiculos (id) ON DELETE SET NULL
        )
    `).run();

    // Tabela de Itens de Serviço/Peças
    db.prepare(`
        CREATE TABLE IF NOT EXISTS itens_servico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            servico_id INTEGER NOT NULL,
            descricao TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            valor_unitario REAL NOT NULL,
            tipo TEXT,
            FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE CASCADE
        )
    `).run();

    // Tabela de Pagamentos
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pagamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            servico_id INTEGER NOT NULL,
            valor REAL NOT NULL,
            data TEXT NOT NULL,
            metodo TEXT NOT NULL,
            anotacao TEXT,
            FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE CASCADE
        )
    `).run();

    // Tabela de Configurações (Chave-Valor)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS configuracoes (
            chave TEXT PRIMARY KEY NOT NULL,
            valor TEXT
        )
    `).run();

    console.log('Database initialized successfully.');
}

module.exports = { 
    db, 
    initDb, 
    getServicosParaPagamentos,
    getServicoComPagamentos,
    adicionarPagamento,
    getDadosDashboard
};
