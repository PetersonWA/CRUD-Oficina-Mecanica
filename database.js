const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { migrate } = require('@blackglory/better-sqlite3-migrations');

const { hashPassword, ROLES } = require('./auth');

let db;

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
        WHERE s.is_deleted = 0 AND s.status NOT IN ('Pendente', 'Recusado', 'Aprovado', 'Convertido')
    `;

    const params = [];

    if (termo && campo) {
        let campoSql = '';
        // Ajuste para buscar no campo correto usando COALESCE
        if (campo === 'clienteNome') campoSql = 'COALESCE(s.cliente_nome_manual, c.nome)';
        else if (campo === 'placaVeiculo') campoSql = 'COALESCE(s.veiculo_desc_manual, v.placa)';
        else if (campo === 'status') campoSql = 's.status_pagamento';

        if (campoSql) {
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
        SELECT 
            id,
            valor, 
            COALESCE(data_liquidacao, data_vencimento) as data,
            metodo, 
            anotacao,
            data_liquidacao IS NOT NULL as liquidado
        FROM pagamentos 
        WHERE servico_id = ? 
        ORDER BY COALESCE(data_liquidacao, data_vencimento) DESC
    `).all(servicoId);

    servico.totalPago = servico.pagamentos
        .filter(p => p.liquidado)
        .reduce((acc, p) => acc + p.valor, 0);

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
    const { dataInicio, dataFim, reportType, cliente, veiculo, status, tipoData, mecanico, pagamento } = filtros;

    const dateColumn = tipoData === 'data_conclusao' ? 'data_conclusao' : 'data_entrada';

    const params = {};
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    if (cliente) params.cliente = `%${cliente}%`;
    if (veiculo) params.veiculo = `%${veiculo}%`;
    if (status) params.status = status;
    if (mecanico) params.mecanico = mecanico;
    if (pagamento) params.pagamento = pagamento;

    if (reportType === 'DRE') {
        // DRE (Competence Basis)
        const revenueWhereClauses = [];
        if (dataInicio) revenueWhereClauses.push(`s.${dateColumn} >= @dataInicio`);
        if (dataFim) revenueWhereClauses.push(`s.${dateColumn} <= @dataFim`);
        if (cliente) revenueWhereClauses.push(`COALESCE(s.cliente_nome_manual, c.nome) LIKE @cliente`);
        if (veiculo) revenueWhereClauses.push(`COALESCE(s.veiculo_desc_manual, v.placa) LIKE @veiculo`);
        if (status) revenueWhereClauses.push(`s.status = @status`);
        if (mecanico) revenueWhereClauses.push(`s.mecanico_responsavel = @mecanico`);
        if (pagamento) revenueWhereClauses.push(`s.forma_pagamento = @pagamento`);

        const revenueWhereString = revenueWhereClauses.length > 0 ? `WHERE ${revenueWhereClauses.join(' AND ')}` : '';

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
            LEFT JOIN clientes c ON s.cliente_id = c.id
            LEFT JOIN veiculos v ON s.veiculo_id = v.id
            ${revenueWhereString}
        `;

        const expenseWhereClauses = [];
        if (dataInicio) expenseWhereClauses.push(`p.data_competencia >= @dataInicio`);
        if (dataFim) expenseWhereClauses.push(`p.data_competencia <= @dataFim`);
        // Note: Expenses are NOT filtered by client/vehicle/mechanic as they are general costs.
        // If specific logic is needed effectively allocating costs to mechanics, we would need a different model.

        const expenseWhereString = expenseWhereClauses.length > 0 ? `AND ${expenseWhereClauses.join(' AND ')}` : '';

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
            ${expenseWhereString}
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
        const cashInWhereClauses = [`p.servico_id IS NOT NULL`];
        if (dataInicio) cashInWhereClauses.push(`s.${dateColumn} >= @dataInicio`);
        if (dataFim) cashInWhereClauses.push(`s.${dateColumn} <= @dataFim`);
        if (cliente) cashInWhereClauses.push(`COALESCE(s.cliente_nome_manual, c.nome) LIKE @cliente`);
        if (veiculo) cashInWhereClauses.push(`COALESCE(s.veiculo_desc_manual, v.placa) LIKE @veiculo`);
        if (status) cashInWhereClauses.push(`s.status = @status`);
        if (mecanico) cashInWhereClauses.push(`s.mecanico_responsavel = @mecanico`);
        if (pagamento) cashInWhereClauses.push(`s.forma_pagamento = @pagamento`);

        const cashInWhereString = `WHERE ${cashInWhereClauses.join(' AND ')}`;

        const cashInQuery = `
            SELECT
                p.id AS transaction_id,
                p.valor AS valor,
                p.data_liquidacao,
                'entrada' AS tipo_transacao
            FROM pagamentos p
            JOIN servicos s ON p.servico_id = s.id
            LEFT JOIN clientes c ON s.cliente_id = c.id
            LEFT JOIN veiculos v ON s.veiculo_id = v.id
            ${cashInWhereString}
        `;

        const cashOutWhereClauses = [`p.servico_id IS NULL`];
        if (dataInicio) cashOutWhereClauses.push(`p.data_competencia >= @dataInicio`); // Use competence date for filtering general expenses
        if (dataFim) cashOutWhereClauses.push(`p.data_competencia <= @dataFim`); // Use competence date for filtering general expenses
        const cashOutWhereString = `WHERE ${cashOutWhereClauses.join(' AND ')}`;

        const cashOutQuery = `
            SELECT
                p.id AS transaction_id,
                p.valor AS valor,
                p.data_liquidacao,
                'saida' AS tipo_transacao
            FROM pagamentos p
            JOIN plano_contas pc ON p.id_plano_contas = pc.id
            ${cashOutWhereString}
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
    const { dataInicio, dataFim, groupBy, cliente, veiculo, status, tipoData, mecanico, pagamento } = filtros;

    // Fetch all transactions for DRE (competence basis)
    const dreTransactions = getFinancialTransactions({ dataInicio, dataFim, reportType: 'DRE', cliente, veiculo, status, tipoData, mecanico, pagamento });

    // Fetch all transactions for DFC (cash basis)
    const dfcTransactions = getFinancialTransactions({ dataInicio, dataFim, reportType: 'DFC', cliente, veiculo, status, tipoData, mecanico, pagamento });

    // --- DRE Calculations ---
    const deducoesId = db.prepare("SELECT id FROM plano_contas WHERE nome_conta = 'DEDUÇÕES DA RECEITA BRUTA'").get()?.id;

    let receitaBruta = 0;
    let deducoesReceita = 0;
    let custosVariaveis = 0;
    let custosFixos = 0;
    let despesasVariaveis = 0;
    let despesasFixas = 0;

    // Set to track distinct services involved in revenue for Ticket Médio calculation
    const servicosComReceita = new Set();

    dreTransactions.forEach(t => {
        if (t.tipo_transacao === 'receita') {
            receitaBruta += t.valor;
            if (t.transaction_id) {
                // Assuming transaction_id maps to service_id for 'receita' from services
                // We must ensure that we are counting services.
                // In database.js queries (line 154), transaction_id IS servicos.id.
                servicosComReceita.add(t.transaction_id);
            }
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

    // --- Ticket Médio (Corrected Logic) ---
    // Uses the count of distinct services found in the Filtered DRE Revenue transactions
    const numServicosNoPeriodo = servicosComReceita.size;
    const ticketMedio = numServicosNoPeriodo > 0 ? receitaBruta / numServicosNoPeriodo : 0;

    // --- Ponto de Equilíbrio (Corrected Logic) ---
    // Uses the FIXED costs of the SELECTED PERIOD and the MARGIN of the SELECTED PERIOD.
    const totalFixos = custosFixos + despesasFixas;
    const indiceMC = receitaLiquida > 0 ? margemContribuicao / receitaLiquida : 0;
    const pontoEquilibrio = indiceMC > 0 ? totalFixos / indiceMC : 0;

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

    // --- Projected Cash Flow ---
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30); // 30 days projection
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // TODO: We could filter this by the selected date range if needed,
    // but typically "Accounts Payable/Receivable" implies "Open items" which are future-oriented.
    // However, if the user sees 'History', maybe they want to see what WAS open back then?
    // That's complex time-travel logic. For now, sticking to "Open Items (Upcoming)" is standard,
    // but the Frontend will hide these cards if we are looking at the distant past.

    const contasAReceberQuery = `
        SELECT data_vencimento, SUM(valor) as total
        FROM pagamentos
        WHERE data_liquidacao IS NULL 
        AND servico_id IS NOT NULL 
        AND data_vencimento BETWEEN ? AND ?
        GROUP BY data_vencimento
        ORDER BY data_vencimento
    `;
    const contasAReceberData = db.prepare(contasAReceberQuery).all(todayStr, futureDateStr);

    const contasAPagarQuery = `
        SELECT data_vencimento, SUM(valor) as total
        FROM pagamentos
        WHERE data_liquidacao IS NULL 
        AND servico_id IS NULL 
        AND data_vencimento BETWEEN ? AND ?
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

    // --- Retrabalho KPI ---
    // Must also be filtered by the same period
    // The previous implementation was Global. Fixing it.
    let retraWhere = `status = 'Em Garantia/Retrabalho' AND is_deleted = 0`;
    const retraParams = [];
    if (dataInicio) {
        retraWhere += ` AND data_entrada >= ?`;
        retraParams.push(dataInicio);
    }
    if (dataFim) {
        retraWhere += ` AND data_entrada <= ?`;
        retraParams.push(dataFim);
    }
    const servicosRetrabalho = db.prepare(`SELECT COUNT(id) as count FROM servicos WHERE ${retraWhere}`).get(...retraParams).count;

    // We compare reworks against the TOTAL services in that period (numServicosNoPeriodo) or concluded?
    // Usually against total concluded.
    // Let's use numServicosNoPeriodo which is services with revenue (likely concluded or partially paid).
    // Or we can count concluded specifically if needed.
    // Let's stick to numServicosNoPeriodo as a proxy for "Volume of work".
    const indiceRetrabalho = numServicosNoPeriodo > 0 ? (servicosRetrabalho / numServicosNoPeriodo) * 100 : 0;


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

function initDb(userDataPath) {
    const dbName = 'oficina.db';
    const dbPath = path.join(userDataPath, dbName);
    const oldDbPath = path.resolve(__dirname, 'data', dbName);
    const isFirstRun = !fs.existsSync(dbPath);

    if (isFirstRun && fs.existsSync(oldDbPath)) {
        try {
            fs.mkdirSync(userDataPath, { recursive: true });
            fs.copyFileSync(oldDbPath, dbPath);
            console.log(`Database copied from ${oldDbPath} to ${dbPath}`);
        } catch (error) {
            console.error('Failed to copy database:', error);
        }
    }

    db = new Database(dbPath, { verbose: console.log });

    console.log('Running database migrations...');
    const migrationsPath = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsPath).filter(file => file.endsWith('.sql'));

    const migrations = migrationFiles.map(file => {
        const version = parseInt(file.split('-')[0]);
        const up = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');
        return { version, up };
    });

    migrate(db, migrations);
    console.log('Migrations completed.');

    // Seed initial data if necessary
    seedPlanoContas();

    // Seed default admin user if table is empty
    const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
    if (userCount === 0) {
        console.log('Seeding default admin user...');
        const adminHash = hashPassword('admin');
        const stmt = db.prepare('INSERT INTO users (nome, username, password_hash, role) VALUES (?, ?, ?, ?)');
        stmt.run('Administrador', 'admin', adminHash, ROLES.ADMIN);
    }

    console.log('Database initialized successfully.');
}

function getPlanoContas() {
    return db.prepare('SELECT id, nome_conta, tipo, variabilidade, id_pai FROM plano_contas ORDER BY nome_conta').all();
}

function addDespesa(despesa) {
    const stmt = db.prepare(
        'INSERT INTO pagamentos (servico_id, valor, data_liquidacao, metodo, anotacao, data_competencia, data_vencimento, id_plano_contas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
        null, // servico_id is NULL
        despesa.valor,
        despesa.data_liquidacao,
        despesa.metodo || 'N/A', // Provide a default value if metodo is missing
        despesa.anotacao,
        despesa.data_competencia,
        despesa.data_vencimento,
        despesa.id_plano_contas
    );
    return { success: true, id: result.lastInsertRowid };
}

function addReceitaAvulsa(receita) {
    const stmt = db.prepare(`
        INSERT INTO servicos (
            id_plano_contas, valor_total, descricao_problema, data_competencia, 
            data_vencimento, data_entrada, data_conclusao, status, status_pagamento,
            cliente_id, veiculo_id, is_deleted, metodo_pagamento, numero_parcelas_servico
        ) VALUES (
            @id_plano_contas, @valor_total, @descricao_problema, @data_competencia,
            @data_vencimento, @data_entrada, @data_conclusao, @status, @status_pagamento,
            NULL, NULL, 0, @metodo_pagamento, @numero_parcelas
        )
    `);
    const result = stmt.run(receita);
    return { success: true, id: result.lastInsertRowid };
}

function getDespesas(filtros = {}) {
    const { dataInicio, dataFim, categoriaId } = filtros;
    let query = `
        SELECT 
            p.id,
            p.valor,
            p.anotacao,
            p.data_liquidacao,
            p.data_competencia,
            p.data_vencimento,
            p.data_vencimento,
            pc.nome_conta,
            p.id_plano_contas
        FROM pagamentos p
        JOIN plano_contas pc ON p.id_plano_contas = pc.id
    `;
    const params = [];

    let whereClauses = ['p.servico_id IS NULL'];

    if (categoriaId) {
        query = `
            WITH RECURSIVE CategoriaContas(id) AS (
              SELECT id FROM plano_contas WHERE id = ?
              UNION ALL
              SELECT pc.id FROM plano_contas pc JOIN CategoriaContas cc ON pc.id_pai = cc.id
            )
            ${query}
        `;
        whereClauses.push('p.id_plano_contas IN (SELECT id FROM CategoriaContas)');
        params.push(categoriaId);
    }

    if (dataInicio) {
        whereClauses.push('p.data_competencia >= ?');
        params.push(dataInicio);
    }
    if (dataFim) {
        whereClauses.push('p.data_competencia <= ?');
        params.push(dataFim);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY p.data_competencia DESC';
    return db.prepare(query).all(params);
}

function deleteDespesa(id) {
    const result = db.prepare('DELETE FROM pagamentos WHERE id = ? AND servico_id IS NULL').run(id);
    return { success: result.changes > 0 };
}

function updateDespesa(despesa) {
    const { id, valor, anotacao, data_competencia, data_vencimento, data_liquidacao, id_plano_contas } = despesa;

    // Ensure we are updating a despesa (servico_id IS NULL)
    const checkStmt = db.prepare('SELECT id FROM pagamentos WHERE id = ? AND servico_id IS NULL');
    const existing = checkStmt.get(id);

    if (!existing) {
        throw new Error('Despesa não encontrada ou não é uma despesa editável.');
    }

    const stmt = db.prepare(`
        UPDATE pagamentos 
        SET valor = ?, anotacao = ?, data_competencia = ?, data_vencimento = ?, data_liquidacao = ?, id_plano_contas = ?
        WHERE id = ?
    `);

    const result = stmt.run(
        valor,
        anotacao,
        data_competencia,
        data_vencimento,
        data_liquidacao === '' ? null : data_liquidacao,
        id_plano_contas,
        id
    );

    return { success: result.changes > 0 };
}

function getReceitasAvulsas(filtros = {}) {
    const { dataInicio, dataFim, categoriaId } = filtros;
    let query = `
        SELECT 
            s.id,
            s.valor_total,
            s.descricao_problema,
            s.data_competencia,
            s.data_conclusao,
            pc.nome_conta
        FROM servicos s
        JOIN plano_contas pc ON s.id_plano_contas = pc.id
    `;
    const params = [];
    let whereClauses = [
        's.cliente_id IS NULL',
        's.veiculo_id IS NULL',
        's.is_deleted = 0'
    ];

    if (categoriaId) {
        query = `
            WITH RECURSIVE CategoriaContas(id) AS (
              SELECT id FROM plano_contas WHERE id = ?
              UNION ALL
              SELECT pc.id FROM plano_contas pc JOIN CategoriaContas cc ON pc.id_pai = cc.id
            )
            ${query}
        `;
        whereClauses.push('s.id_plano_contas IN (SELECT id FROM CategoriaContas)');
        params.push(categoriaId);
    }

    if (dataInicio) {
        whereClauses.push('s.data_competencia >= ?');
        params.push(dataInicio);
    }
    if (dataFim) {
        whereClauses.push('s.data_competencia <= ?');
        params.push(dataFim);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY s.data_competencia DESC';
    return db.prepare(query).all(params);
}

function deleteReceitaAvulsa(id) {
    const result = db.prepare('DELETE FROM servicos WHERE id = ? AND cliente_id IS NULL AND veiculo_id IS NULL').run(id);
    return { success: result.changes > 0 };
}

function confirmarPagamento(pagamentoId) {
    const transaction = db.transaction(() => {
        // 1. Obter o pagamento e o servico_id associado
        const pagamento = db.prepare('SELECT servico_id, valor FROM pagamentos WHERE id = ?').get(pagamentoId);
        if (!pagamento) {
            throw new Error('Pagamento não encontrado.');
        }
        const { servico_id, valor: valorPagamento } = pagamento;

        // 2. Atualizar a data_liquidacao do pagamento
        const dataAtual = new Date().toISOString().split('T')[0];
        const updatePagamentoStmt = db.prepare('UPDATE pagamentos SET data_liquidacao = ? WHERE id = ?');
        updatePagamentoStmt.run(dataAtual, pagamentoId);

        // Se não houver servico_id (despesa avulsa), apenas confirma o pagamento e sai
        if (!servico_id) {
            return { success: true, message: 'Pagamento avulso confirmado com sucesso.' };
        }

        // 3. Recalcular o total pago para o serviço
        const { totalPago } = db.prepare(
            'SELECT SUM(valor) as totalPago FROM pagamentos WHERE servico_id = ? AND data_liquidacao IS NOT NULL'
        ).get(servico_id);

        // 4. Obter o valor total do serviço
        const { valorTotal } = db.prepare('SELECT valor_total as valorTotal FROM servicos WHERE id = ?').get(servico_id);

        // 5. Determinar o novo status de pagamento do serviço
        let novoStatus;
        if (totalPago >= valorTotal) {
            novoStatus = 'Pago';
        } else if (totalPago > 0) {
            novoStatus = 'Parcialmente Pago';
        } else {
            novoStatus = 'Pendente'; // Caso todos os pagamentos confirmados sejam estornados, por exemplo
        }

        // 6. Determinar a forma de pagamento consolidada (apenas para o serviço principal)
        const metodos = db.prepare('SELECT DISTINCT metodo FROM pagamentos WHERE servico_id = ? AND data_liquidacao IS NOT NULL').all(servico_id);
        let novaFormaPagamento = '';
        if (metodos.length === 1) {
            novaFormaPagamento = metodos[0].metodo;
        } else if (metodos.length > 1) {
            novaFormaPagamento = 'Múltiplos';
        } else {
            // Se não há pagamentos liquidados, a forma de pagamento pode ser a original do serviço ou 'N/A'
            const servicoOriginal = db.prepare('SELECT forma_pagamento FROM servicos WHERE id = ?').get(servico_id);
            novaFormaPagamento = servicoOriginal ? servicoOriginal.forma_pagamento : 'N/A';
        }


        // 7. Atualizar a tabela de serviços
        const stmtUpdateServico = db.prepare(
            'UPDATE servicos SET status_pagamento = ?, forma_pagamento = ? WHERE id = ?'
        );
        stmtUpdateServico.run(novoStatus, novaFormaPagamento, servico_id);

        return { success: true, message: 'Pagamento confirmado e serviço atualizado com sucesso!' };
    });

    try {
        return transaction();
    } catch (error) {
        console.error("Erro ao confirmar pagamento:", error);
        return { success: false, error: error.message };
    }
}


// --- User Management CRUD ---

function getUsers() {
    // Return users without password hash for security
    return db.prepare('SELECT id, nome, username, role, is_active, created_at FROM users ORDER BY nome').all();
}

function addUser(user) {
    const { nome, username, password, role } = user;

    // Check if username exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
        throw new Error('Nome de usuário já existe.');
    }

    const password_hash = hashPassword(password);

    const stmt = db.prepare(
        'INSERT INTO users (nome, username, password_hash, role) VALUES (?, ?, ?, ?)'
    );

    const result = stmt.run(nome, username, password_hash, role);
    return { success: true, id: result.lastInsertRowid };
}

function updateUser(user) {
    const { id, nome, username, password, role } = user;

    // Check if username is taken by another user
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
    if (existing) {
        throw new Error('Nome de usuário já existe.');
    }

    if (password && password.trim() !== '') {
        // Update with new password
        const password_hash = hashPassword(password);
        const stmt = db.prepare(
            'UPDATE users SET nome = ?, username = ?, password_hash = ?, role = ? WHERE id = ?'
        );
        stmt.run(nome, username, password_hash, role, id);
    } else {
        // Update without changing password
        const stmt = db.prepare(
            'UPDATE users SET nome = ?, username = ?, role = ? WHERE id = ?'
        );
        stmt.run(nome, username, role, id);
    }

    return { success: true };
}

function deleteUser(id) {
    // Prevent deleting the last admin? Not strictly required but good practice.
    // For now, simple delete.
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { success: result.changes > 0 };
}

module.exports = {
    get db() { return db; },
    initDb,
    getServicosParaPagamentos,
    getServicoComPagamentos,
    adicionarPagamento,
    getDadosDashboard,
    getPlanoContas,
    addDespesa,
    addReceitaAvulsa,
    getDespesas,
    deleteDespesa,
    updateDespesa,
    getReceitasAvulsas,
    deleteReceitaAvulsa,
    confirmarPagamento,
    getUsers,
    addUser,
    updateUser,
    deleteUser
};
