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
            s.data_entrada as dataEntrada,
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
        SELECT valor, data_liquidacao as data, metodo, anotacao FROM pagamentos WHERE servico_id = ? ORDER BY data_liquidacao DESC
    `).all(servicoId);

    servico.totalPago = servico.pagamentos.reduce((acc, p) => acc + p.valor, 0);
    servico.saldoDevedor = servico.valorTotal - servico.totalPago;

    return servico;
}

function adicionarPagamento(pagamento) {
    const transaction = db.transaction((p) => {
        // 1. Inserir o novo pagamento
        const stmtPagamento = db.prepare(
            'INSERT INTO pagamentos (servico_id, valor, data_liquidacao, metodo, anotacao) VALUES (?, ?, ?, ?, ?)'
        );
        stmtPagamento.run(p.servico_id, p.valor, p.data_liquidacao, p.metodo, p.anotacao);

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

function getFinancialTransactions(filtros) {
    const { dataInicio, dataFim, reportType } = filtros;

    const params = {};
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;

    if (reportType === 'DRE') {
        // DRE (Competence Basis)
        const whereClauses = [];
        if (dataInicio) whereClauses.push(`data_competencia >= @dataInicio`);
        if (dataFim) whereClauses.push(`data_competencia <= @dataFim`);
        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const revenuesQuery = `
            SELECT
                s.id AS transaction_id,
                s.valor_total AS valor,
                s.data_competencia,
                pc.nome_conta,
                pc.tipo,
                pc.variabilidade,
                'receita' AS tipo_transacao,
                pc.id_pai
            FROM servicos s
            JOIN plano_contas pc ON s.id_plano_contas = pc.id
            ${whereString}
        `;

        const expensesQuery = `
            SELECT
                p.id AS transaction_id,
                p.valor AS valor,
                p.data_competencia,
                pc.nome_conta,
                pc.tipo,
                pc.variabilidade,
                'despesa' AS tipo_transacao,
                pc.id_pai
            FROM pagamentos p
            JOIN plano_contas pc ON p.id_plano_contas = pc.id
            WHERE p.servico_id IS NULL -- General expenses only
            ${whereClauses.length > 0 ? `AND ${whereClauses.map(c => 'p.' + c).join(' AND ')}` : ''}
        `;

        const combinedQuery = `
            ${revenuesQuery}
            UNION ALL
            ${expensesQuery}
            ORDER BY data_competencia ASC
        `;
        return db.prepare(combinedQuery).all(params);

    } else if (reportType === 'DFC') {
        // DFC (Cash Basis)
        const whereClauses = [];
        if (dataInicio) whereClauses.push(`data_liquidacao >= @dataInicio`);
        if (dataFim) whereClauses.push(`data_liquidacao <= @dataFim`);
        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const cashInQuery = `
            SELECT
                p.id AS transaction_id,
                p.valor AS valor,
                p.data_liquidacao,
                'entrada' AS tipo_transacao
            FROM pagamentos p
            WHERE p.servico_id IS NOT NULL -- Payments for services
            ${whereClauses.length > 0 ? `AND ${whereClauses.map(c => 'p.' + c).join(' AND ')}` : ''}
        `;

        const cashOutQuery = `
            SELECT
                p.id AS transaction_id,
                p.valor AS valor,
                p.data_liquidacao,
                'saida' AS tipo_transacao
            FROM pagamentos p
            WHERE p.servico_id IS NULL -- General expenses
            ${whereClauses.length > 0 ? `AND ${whereClauses.map(c => 'p.' + c).join(' AND ')}` : ''}
        `;

        const combinedQuery = `
            ${cashInQuery}
            UNION ALL
            ${cashOutQuery}
            ORDER BY data_liquidacao ASC
        `;
        return db.prepare(combinedQuery).all(params);
    }

    return [];
}

function getDadosDashboard(filtros) {
    const { dataInicio, dataFim, groupBy } = filtros;

    // Fetch all transactions for DRE (competence basis)
    const dreTransactions = getFinancialTransactions({ dataInicio, dataFim, reportType: 'DRE' });

    // Fetch all transactions for DFC (cash basis)
    const dfcTransactions = getFinancialTransactions({ dataInicio, dataFim, reportType: 'DFC' });

    // --- DRE Calculations ---
    const deducoesId = db.prepare("SELECT id FROM plano_contas WHERE nome_conta = 'DEDUÇÕES DA RECEITA BRUTA'").get()?.id;

    let receitaBruta = 0;
    let deducoesReceita = 0;
    let custosVariaveis = 0;
    let custosFixos = 0;
    let despesasVariaveis = 0;
    let despesasFixas = 0;

    dreTransactions.forEach(t => {
        if (t.tipo_transacao === 'receita') {
            receitaBruta += t.valor;
        } else if (t.tipo_transacao === 'despesa') {
            if (t.id_pai === deducoesId) {
                deducoesReceita += t.valor;
            } else if (t.tipo === 'Custo') {
                if (t.variabilidade === 'Variável') {
                    custosVariaveis += t.valor;
                } else if (t.variabilidade === 'Fixo') {
                    custosFixos += t.valor;
                }
            } else if (t.tipo === 'Despesa') {
                if (t.variabilidade === 'Variável') {
                    despesasVariaveis += t.valor;
                } else if (t.variabilidade === 'Fixo') {
                    despesasFixas += t.valor;
                }
            }
        }
    });

    const receitaLiquida = receitaBruta - deducoesReceita;
    const margemContribuicao = receitaLiquida - custosVariaveis - despesasVariaveis;
    const lucroLiquido = margemContribuicao - custosFixos - despesasFixas;

    // --- DFC Calculations & Chart Data ---
    let totalEntradas = 0;
    let totalSaidas = 0;
    const dfcChartData = {};

    dfcTransactions.forEach(t => {
        const date = t.data_liquidacao;
        if (!dfcChartData[date]) {
            dfcChartData[date] = { entradas: 0, saidas: 0 };
        }

        if (t.tipo_transacao === 'entrada') {
            totalEntradas += t.valor;
            dfcChartData[date].entradas += t.valor;
        } else if (t.tipo_transacao === 'saida') {
            totalSaidas += t.valor;
            dfcChartData[date].saidas += t.valor;
        }
    });
    const caixaGerado = totalEntradas - totalSaidas;

    const dfcChartLabels = Object.keys(dfcChartData).sort();
    const dfcChartEntradas = dfcChartLabels.map(date => dfcChartData[date].entradas);
    const dfcChartSaidas = dfcChartLabels.map(date => dfcChartData[date].saidas);

    // --- Projected Cash Flow (Contas a Receber / Pagar) & Chart Data ---
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30); // 30 days projection
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const contasAReceberQuery = `
        SELECT s.data_vencimento, SUM(s.valor_total) as total
        FROM servicos s
        LEFT JOIN (
            SELECT servico_id, SUM(valor) as total_pago
            FROM pagamentos
            GROUP BY servico_id
        ) p ON s.id = p.servico_id
        WHERE (p.total_pago IS NULL OR s.valor_total > p.total_pago)
        AND s.data_vencimento BETWEEN ? AND ?
        GROUP BY s.data_vencimento
        ORDER BY s.data_vencimento
    `;
    const contasAReceberData = db.prepare(contasAReceberQuery).all(todayStr, futureDateStr);

    const contasAPagarQuery = `
        SELECT data_vencimento, SUM(valor) as total
        FROM pagamentos
        WHERE data_liquidacao IS NULL AND data_vencimento BETWEEN ? AND ?
        GROUP BY data_vencimento
        ORDER BY data_vencimento
    `;
    const contasAPagarData = db.prepare(contasAPagarQuery).all(todayStr, futureDateStr);

    const projectedCashFlowData = {};
    contasAReceberData.forEach(item => {
        if (!projectedCashFlowData[item.data_vencimento]) {
            projectedCashFlowData[item.data_vencimento] = { aReceber: 0, aPagar: 0 };
        }
        projectedCashFlowData[item.data_vencimento].aReceber += item.total;
    });
    contasAPagarData.forEach(item => {
        if (!projectedCashFlowData[item.data_vencimento]) {
            projectedCashFlowData[item.data_vencimento] = { aReceber: 0, aPagar: 0 };
        }
        projectedCashFlowData[item.data_vencimento].aPagar += item.total;
    });

    const projectedCashFlowLabels = Object.keys(projectedCashFlowData).sort();
    const projectedCashFlowAReceber = projectedCashFlowLabels.map(date => projectedCashFlowData[date].aReceber);
    const projectedCashFlowAPagar = projectedCashFlowLabels.map(date => projectedCashFlowData[date].aPagar);


    // --- KPIs ---
    const todayForKpi = new Date();
    const priorMonth = new Date(todayForKpi.getFullYear(), todayForKpi.getMonth() - 1, 1);
    const priorMonthEnd = new Date(todayForKpi.getFullYear(), todayForKpi.getMonth(), 0);

    const priorMonthFiltros = {
        dataInicio: priorMonth.toISOString().split('T')[0],
        dataFim: priorMonthEnd.toISOString().split('T')[0],
        reportType: 'DRE'
    };
    const priorMonthTransactions = getFinancialTransactions(priorMonthFiltros);

    let priorMonthReceitaBruta = 0;
    let priorMonthDeducoesReceita = 0;
    let priorMonthCustosVariaveis = 0;
    let priorMonthCustosFixos = 0;
    let priorMonthDespesasVariaveis = 0;
    let priorMonthDespesasFixas = 0;

    priorMonthTransactions.forEach(t => {
        if (t.tipo_transacao === 'receita') {
            priorMonthReceitaBruta += t.valor;
        } else if (t.tipo_transacao === 'despesa') {
            if (t.id_pai === 2) { // This is a hardcoded ID for 'DEDUÇÕES DA RECEITA BRUTA'
                priorMonthDeducoesReceita += t.valor;
            } else if (t.tipo === 'Custo') {
                if (t.variabilidade === 'Variável') {
                    priorMonthCustosVariaveis += t.valor;
                } else if (t.variabilidade === 'Fixo') {
                    priorMonthCustosFixos += t.valor;
                }
            } else if (t.tipo === 'Despesa') {
                if (t.variabilidade === 'Variável') {
                    priorMonthDespesasVariaveis += t.valor;
                } else if (t.variabilidade === 'Fixo') {
                    priorMonthDespesasFixas += t.valor;
                }
            }
        }
    });

    const priorMonthReceitaLiquida = priorMonthReceitaBruta - priorMonthDeducoesReceita;
    const priorMonthMargemContribuicao = priorMonthReceitaLiquida - priorMonthCustosVariaveis - priorMonthDespesasVariaveis;
    const priorMonthTotalFixos = priorMonthCustosFixos + priorMonthDespesasFixas;
    const priorMonthIndiceMC = priorMonthReceitaLiquida > 0 ? priorMonthMargemContribuicao / priorMonthReceitaLiquida : 0;
    const pontoEquilibrio = priorMonthIndiceMC > 0 ? priorMonthTotalFixos / priorMonthIndiceMC : 0;

    const allServicos = db.prepare(`SELECT id, valor_total, status FROM servicos WHERE is_deleted = 0 AND status = 'Concluído'`).all();
    const totalFaturamento = allServicos.reduce((sum, s) => sum + s.valor_total, 0);
    const totalOSConcluidos = allServicos.length;
    const ticketMedio = totalOSConcluidos > 0 ? totalFaturamento / totalOSConcluidos : 0;

    const servicosRetrabalho = db.prepare(`SELECT COUNT(id) as count FROM servicos WHERE status = 'Em Garantia/Retrabalho' AND is_deleted = 0`).get().count;
    const indiceRetrabalho = totalOSConcluidos > 0 ? (servicosRetrabalho / totalOSConcluidos) * 100 : 0;

    // --- Chart Data ---
    const charts = {
        dreChart: {
            labels: ['Receita Líquida', 'Custos Variáveis', 'Margem de Contribuição', 'Custos Fixos', 'Despesas Fixas', 'Lucro Líquido'],
            data: [receitaLiquida, custosVariaveis, margemContribuicao, custosFixos, despesasFixas, lucroLiquido]
        },
        dfcChart: {
            labels: dfcChartLabels,
            entradas: dfcChartEntradas,
            saidas: dfcChartSaidas
        },
        projectedCashFlowChart: {
            labels: projectedCashFlowLabels,
            aReceber: projectedCashFlowAReceber,
            aPagar: projectedCashFlowAPagar
        }
    };

    const kpis = {
        lucroLiquido,
        caixaGerado,
        ticketMedio,
        pontoEquilibrio,
        contasAReceber: contasAReceberData.reduce((sum, item) => sum + item.total, 0),
        contasAPagar: contasAPagarData.reduce((sum, item) => sum + item.total, 0),
        indiceRetrabalho
    };

    return { kpis, charts };
}


function seedPlanoContas() {
    const planoContasData = [
        { id: 1, nome_conta: 'RECEITAS OPERACIONAIS', tipo: 'Receita', variabilidade: 'Variável', id_pai: null },
        { id: 11, nome_conta: 'Receita com Serviços', tipo: 'Receita', variabilidade: 'Variável', id_pai: 1 },
        { id: 111, nome_conta: 'Serviços de Mecânica Geral', tipo: 'Receita', variabilidade: 'Variável', id_pai: 11 },
        { id: 112, nome_conta: 'Serviços de Funilaria e Pintura', tipo: 'Receita', variabilidade: 'Variável', id_pai: 11 },
        { id: 113, nome_conta: 'Serviços de Elétrica e Injeção', tipo: 'Receita', variabilidade: 'Variável', id_pai: 11 },
        { id: 114, nome_conta: 'Serviços de Alinhamento/Balanceamento', tipo: 'Receita', variabilidade: 'Variável', id_pai: 11 },
        { id: 12, nome_conta: 'Receita com Venda de Peças', tipo: 'Receita', variabilidade: 'Variável', id_pai: 1 },
        { id: 121, nome_conta: 'Peças (Revenda)', tipo: 'Receita', variabilidade: 'Variável', id_pai: 12 },
        { id: 122, nome_conta: 'Venda de Balcão (Peças)', tipo: 'Receita', variabilidade: 'Variável', id_pai: 12 },

        { id: 2, nome_conta: 'DEDUÇÕES DA RECEITA BRUTA', tipo: 'Despesa', variabilidade: 'Variável', id_pai: null },
        { id: 21, nome_conta: 'Impostos sobre Vendas', tipo: 'Despesa', variabilidade: 'Variável', id_pai: 2 },
        { id: 211, nome_conta: 'Simples Nacional (DAS)', tipo: 'Despesa', variabilidade: 'Variável', id_pai: 21 },
        { id: 212, nome_conta: 'Impostos (ISS, ICMS)', tipo: 'Despesa', variabilidade: 'Variável', id_pai: 21 },
        { id: 22, nome_conta: 'Devoluções e Abatimentos', tipo: 'Despesa', variabilidade: 'Variável', id_pai: 2 },
        { id: 23, nome_conta: 'Taxas de Cartão (sobre vendas)', tipo: 'Despesa', variabilidade: 'Variável', id_pai: 2 },

        { id: 3, nome_conta: 'CUSTOS OPERACIONAIS', tipo: 'Custo', variabilidade: 'Variável', id_pai: null },
        { id: 31, nome_conta: 'Custos Variáveis (Diretos)', tipo: 'Custo', variabilidade: 'Variável', id_pai: 3 },
        { id: 311, nome_conta: 'Custo das Peças Vendidas (CMV)', tipo: 'Custo', variabilidade: 'Variável', id_pai: 31 },
        { id: 312, nome_conta: 'Insumos de Serviço', tipo: 'Custo', variabilidade: 'Variável', id_pai: 31 },
        { id: 313, nome_conta: 'Comissões da Equipe Técnica', tipo: 'Custo', variabilidade: 'Variável', id_pai: 31 },
        { id: 314, nome_conta: 'Serviços de Terceiros', tipo: 'Custo', variabilidade: 'Variável', id_pai: 31 },
        { id: 32, nome_conta: 'Custos Fixos (Indiretos)', tipo: 'Custo', variabilidade: 'Fixo', id_pai: 3 },
        { id: 321, nome_conta: 'Salários e Encargos (Equipe Técnica/Mecânicos)', tipo: 'Custo', variabilidade: 'Fixo', id_pai: 32 },
        { id: 322, nome_conta: 'Aluguel e IPTU (Oficina)', tipo: 'Custo', variabilidade: 'Fixo', id_pai: 32 },
        { id: 323, nome_conta: 'Depreciação de Equipamentos', tipo: 'Custo', variabilidade: 'Fixo', id_pai: 32 },
        { id: 324, nome_conta: 'Energia Elétrica (Produção)', tipo: 'Custo', variabilidade: 'Fixo', id_pai: 32 },
        { id: 325, nome_conta: 'Água (Produção)', tipo: 'Custo', variabilidade: 'Fixo', id_pai: 32 },
        { id: 326, nome_conta: 'Manutenção de Equipamentos', tipo: 'Custo', variabilidade: 'Fixo', id_pai: 32 },
        { id: 327, nome_conta: 'Vigilância e Limpeza (Oficina)', tipo: 'Custo', variabilidade: 'Fixo', id_pai: 32 },

        { id: 4, nome_conta: 'DESPESAS OPERACIONAIS', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: null },
        { id: 41, nome_conta: 'Despesas Administrativas (Fixas)', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 4 },
        { id: 411, nome_conta: 'Salários e Encargos (Admin/Recepção)', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 41 },
        { id: 412, nome_conta: 'Pró-Labore (Salário do Dono)', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 41 },
        { id: 413, nome_conta: 'Honorários Contábeis', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 41 },
        { id: 414, nome_conta: 'Aluguel (Escritório - se separado)', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 41 },
        { id: 415, nome_conta: 'Água, Luz, Internet (Escritório)', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 41 },
        { id: 416, nome_conta: 'Materiais de Escritório e Limpeza', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 41 },
        { id: 417, nome_conta: 'Softwares e Assinaturas (Sistema de Gestão)', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 41 },
        { id: 418, nome_conta: 'Taxas e Alvarás', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 41 },
        { id: 42, nome_conta: 'Despesas com Vendas e Marketing (Variáveis)', tipo: 'Despesa', variabilidade: 'Variável', id_pai: 4 },
        { id: 421, nome_conta: 'Publicidade e Propaganda', tipo: 'Despesa', variabilidade: 'Variável', id_pai: 42 },
        { id: 422, nome_conta: 'Comissões de Vendedores', tipo: 'Despesa', variabilidade: 'Variável', id_pai: 42 },
        { id: 43, nome_conta: 'Despesas Financeiras', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 4 }, // Assuming Fixo for simplicity, can be F/V
        { id: 431, nome_conta: 'Taxas Bancárias (Manutenção)', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 43 },
        { id: 432, nome_conta: 'Juros de Empréstimos', tipo: 'Despesa', variabilidade: 'Fixo', id_pai: 43 },
    ];

    const insert = db.prepare('INSERT OR IGNORE INTO plano_contas (id, nome_conta, tipo, variabilidade, id_pai) VALUES (?, ?, ?, ?, ?)');
    db.transaction(() => {
        for (const conta of planoContasData) {
            insert.run(conta.id, conta.nome_conta, conta.tipo, conta.variabilidade, conta.id_pai);
        }
    })();
    console.log('Plano de Contas seeded successfully.');
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

    // Tabela de Plano de Contas Gerencial
    db.prepare(`
        CREATE TABLE IF NOT EXISTS plano_contas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_conta TEXT NOT NULL,
            tipo TEXT NOT NULL,
            variabilidade TEXT NOT NULL,
            id_pai INTEGER,
            FOREIGN KEY (id_pai) REFERENCES plano_contas (id)
        )
    `).run();

    // Tabela de Serviços
    db.prepare(`
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
            is_deleted INTEGER DEFAULT 0,
            cliente_nome_manual TEXT,
            veiculo_desc_manual TEXT,
            data_competencia TEXT,
            data_vencimento TEXT,
            id_plano_contas INTEGER,
            FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE SET NULL,
            FOREIGN KEY (veiculo_id) REFERENCES veiculos (id) ON DELETE SET NULL,
            FOREIGN KEY (id_plano_contas) REFERENCES plano_contas (id)
        )
    `).run();
    try { db.prepare('ALTER TABLE servicos RENAME COLUMN data TO data_entrada').run(); } catch (e) { if (!e.message.includes('no such column') && !e.message.includes('duplicate column name')) throw e; }
    try { db.prepare('ALTER TABLE servicos ADD COLUMN data_competencia TEXT').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }
    try { db.prepare('ALTER TABLE servicos ADD COLUMN data_vencimento TEXT').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }
    try { db.prepare('ALTER TABLE servicos ADD COLUMN id_plano_contas INTEGER').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }

    // Tabela de Itens de Serviço/Peças
    db.prepare(`
        CREATE TABLE IF NOT EXISTS itens_servico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            servico_id INTEGER NOT NULL,
            descricao TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            valor_unitario REAL NOT NULL,
            valor_custo REAL,
            tipo TEXT,
            FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE CASCADE
        )
    `).run();
    try { db.prepare('ALTER TABLE itens_servico ADD COLUMN valor_custo REAL').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }

    // Tabela de Pagamentos
    db.prepare(`
        CREATE TABLE IF NOT EXISTS pagamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            servico_id INTEGER,
            valor REAL NOT NULL,
            data_liquidacao TEXT NOT NULL,
            metodo TEXT NOT NULL,
            anotacao TEXT,
            data_competencia TEXT,
            data_vencimento TEXT,
            id_plano_contas INTEGER,
            FOREIGN KEY (servico_id) REFERENCES servicos (id) ON DELETE CASCADE,
            FOREIGN KEY (id_plano_contas) REFERENCES plano_contas (id)
        )
    `).run();
    try { db.prepare('ALTER TABLE pagamentos RENAME COLUMN data TO data_liquidacao').run(); } catch (e) { if (!e.message.includes('no such column') && !e.message.includes('duplicate column name')) throw e; }
    try { db.prepare('ALTER TABLE pagamentos ADD COLUMN data_competencia TEXT').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }
    try { db.prepare('ALTER TABLE pagamentos ADD COLUMN data_vencimento TEXT').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }
    try { db.prepare('ALTER TABLE pagamentos ADD COLUMN id_plano_contas INTEGER').run(); } catch (e) { if (!e.message.includes('duplicate column name')) throw e; }

    // Tabela de Configurações (Chave-Valor)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS configuracoes (
            chave TEXT PRIMARY KEY NOT NULL,
            valor TEXT
        )
    `).run();

    seedPlanoContas(); // Seed initial plano_contas data

    console.log('Database initialized successfully.');
}

function getPlanoContas() {
    return db.prepare('SELECT id, nome_conta FROM plano_contas ORDER BY nome_conta').all();
}

function addDespesa(despesa) {
    const stmt = db.prepare(
        'INSERT INTO pagamentos (servico_id, valor, data_liquidacao, metodo, anotacao, data_competencia, data_vencimento, id_plano_contas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
        null, // servico_id is NULL
        despesa.valor,
        despesa.data_liquidacao,
        despesa.metodo,
        despesa.anotacao,
        despesa.data_competencia,
        despesa.data_vencimento,
        despesa.id_plano_contas
    );
    return { success: true, id: result.lastInsertRowid };
}

module.exports = { 
    db, 
    initDb, 
    getServicosParaPagamentos,
    getServicoComPagamentos,
    adicionarPagamento,
    getDadosDashboard,
    getPlanoContas,
    addDespesa
};
