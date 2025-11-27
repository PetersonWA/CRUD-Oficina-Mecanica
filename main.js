const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const fs = require("fs");

// --- Início do Logger de Arquivo Simples ---
// Cuidado: app só está disponível depois de 'ready'. Usaremos um caminho de log provisório se necessário.
let logStream;
function initializeLogger(userDataPath) {
    if (logStream) return; // Logger já inicializado
    const logPath = path.join(userDataPath, 'main.log');
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    
    const logToFile = (message) => {
        if (logStream) {
            logStream.write(`${new Date().toISOString()} - ${message}\n`);
        }
    };

    // Redireciona console.log/error
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    console.log = (...args) => {
        originalConsoleLog(...args);
        logToFile(`LOG: ${args.join(' ')}`);
    };
    console.error = (...args) => {
        originalConsoleError(...args);
        logToFile(`ERROR: ${args.join(' ')}`);
    };

    // Captura exceções não tratadas
    process.on('uncaughtException', (error, origin) => {
        console.error('--- UNCAUGHT EXCEPTION ---');
        console.error(error.stack || error);
        console.error('--- ORIGIN ---');
        console.error(origin);
        // Garante que o log seja escrito antes de sair
        if (logStream) {
            logStream.end(() => {
                app.quit();
            });
        } else {
            app.quit();
        }
    });

    console.log('Logger inicializado.');
}
// --- Fim do Logger de Arquivo Simples ---

console.log("main.js is being executed");

const database = require("./database.js");
const {
  getServicosParaPagamentos,
  getServicoComPagamentos,
  adicionarPagamento,
  getDadosDashboard,
  getPlanoContas,
  addDespesa,
  addReceitaAvulsa,
  getDespesas,
  deleteDespesa,
  getReceitasAvulsas,
  deleteReceitaAvulsa,
} = database; // Importa a instância do DB

// Função auxiliar para criar pagamentos parcelados
function createInstallmentPayments(
  servicoId,
  valorTotal,
  numeroParcelas,
  dataEntradaServico,
  dataCompetenciaServico,
  idPlanoContasServico,
  metodoPagamento
) {
  const configPrazoRow = database.db
    .prepare("SELECT valor FROM configuracoes WHERE chave = ?")
    .get("prazoLiquidacaoCartao");
  const prazoLiquidacao = configPrazoRow
    ? parseInt(configPrazoRow.valor, 10)
    : 30;

  const valorParcela = parseFloat((valorTotal / numeroParcelas).toFixed(2));
  let somaParcelas = 0;

  const pagtoStmt = database.db.prepare(
    "INSERT INTO pagamentos (servico_id, valor, data_vencimento, metodo, anotacao, data_liquidacao, data_competencia, id_plano_contas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  for (let i = 1; i <= numeroParcelas; i++) {
    let valorDaParcelaAtual = valorParcela;
    if (i === numeroParcelas) {
      valorDaParcelaAtual = valorTotal - somaParcelas;
    }
    somaParcelas += valorDaParcelaAtual;

    const dataBase = new Date(dataEntradaServico + "T00:00:00");
    dataBase.setDate(dataBase.getDate() + prazoLiquidacao + (i - 1) * 30);
    const vencimentoParcela = dataBase.toISOString().split("T")[0];

    pagtoStmt.run(
      servicoId,
      valorDaParcelaAtual,
      vencimentoParcela,
      metodoPagamento,
      `Parcela ${i} de ${numeroParcelas}`,
      null, // data_liquidacao é nula até a confirmação
      dataCompetenciaServico,
      idPlanoContasServico
    );
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
}

// Handlers IPC para Clientes
ipcMain.handle("get-clientes", () => {
  const stmt = database.db.prepare(
    "SELECT * FROM clientes WHERE is_deleted = 0 ORDER BY nome"
  );
  return stmt.all();
});

ipcMain.handle("add-cliente", (event, cliente) => {
  const stmt = database.db.prepare(
    "INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)"
  );
  const result = stmt.run(
    cliente.nome,
    cliente.cpf_cnpj,
    cliente.telefone,
    cliente.email,
    cliente.endereco
  );
  return { id: result.lastInsertRowid, ...cliente };
});

ipcMain.handle("update-cliente", (event, cliente) => {
  const stmt = database.db.prepare(
    "UPDATE clientes SET nome = ?, cpf_cnpj = ?, telefone = ?, email = ?, endereco = ? WHERE id = ?"
  );
  const result = stmt.run(
    cliente.nome,
    cliente.cpf_cnpj,
    cliente.telefone,
    cliente.email,
    cliente.endereco,
    cliente.id
  );
  return result.changes > 0;
});

ipcMain.handle("delete-cliente", (event, id) => {
  // Soft delete do cliente e dos seus veículos associados
  const transaction = database.db.transaction((clienteId) => {
    const stmtVeiculos = database.db.prepare(
      "UPDATE veiculos SET is_deleted = 1 WHERE cliente_id = ?"
    );
    stmtVeiculos.run(clienteId);

    const stmtCliente = database.db.prepare(
      "UPDATE clientes SET is_deleted = 1 WHERE id = ?"
    );
    const result = stmtCliente.run(clienteId);

    return result.changes > 0;
  });

  try {
    return transaction(id);
  } catch (error) {
    console.error("Erro ao arquivar cliente:", error);
    return false;
  }
});

// Handlers IPC para Veículos
ipcMain.handle("get-veiculos", () => {
  const stmt = database.db.prepare(`
    SELECT v.*, c.nome as cliente_nome 
    FROM veiculos v
    JOIN clientes c ON v.cliente_id = c.id
    WHERE v.is_deleted = 0 AND c.is_deleted = 0
    ORDER BY c.nome, v.modelo
  `);
  return stmt.all();
});

ipcMain.handle("add-veiculo", (event, veiculo) => {
  const stmt = database.db.prepare(
    "INSERT INTO veiculos (cliente_id, placa, marca, modelo, ano, cor, quilometragem) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(
    veiculo.cliente_id,
    veiculo.placa,
    veiculo.marca,
    veiculo.modelo,
    veiculo.ano,
    veiculo.cor,
    veiculo.quilometragem
  );
  return { id: result.lastInsertRowid, ...veiculo };
});

ipcMain.handle("update-veiculo", (event, veiculo) => {
  const stmt = database.db.prepare(
    "UPDATE veiculos SET cliente_id = ?, placa = ?, marca = ?, modelo = ?, ano = ?, cor = ?, quilometragem = ? WHERE id = ?"
  );
  const result = stmt.run(
    veiculo.cliente_id,
    veiculo.placa,
    veiculo.marca,
    veiculo.modelo,
    veiculo.ano,
    veiculo.cor,
    veiculo.quilometragem,
    veiculo.id
  );
  return result.changes > 0;
});

ipcMain.handle("delete-veiculo", (event, id) => {
  const stmt = database.db.prepare("UPDATE veiculos SET is_deleted = 1 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

// Handlers IPC para Orçamentos/Serviços
ipcMain.handle("add-orcamento", (event, orcamento) => {
  const transaction = database.db.transaction((orc) => {
    const servicoStmt = database.db.prepare(
      "INSERT INTO servicos (cliente_id, veiculo_id, data_entrada, descricao_problema, valor_total, status, id_plano_contas) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const servicoResult = servicoStmt.run(
      orc.cliente_id,
      orc.veiculo_id,
      orc.data_entrada,
      orc.descricao_problema,
      orc.valor_total,
      "Pendente", // Status inicial padrão para orçamentos
      111 // Default to 'Serviços de Mecânica Geral'
    );
    const servicoId = servicoResult.lastInsertRowid;

    const configRow = database.db
      .prepare("SELECT valor FROM configuracoes WHERE chave = ?")
      .get("percentualLucroPecas");
    const percentualLucro = configRow ? parseFloat(configRow.valor) : 0;

    const itemStmt = database.db.prepare(
      "INSERT INTO itens_servico (servico_id, descricao, tipo, quantidade, valor_unitario, valor_custo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const item of orc.itens) {
      let valorCusto = null;
      if (item.tipo === "Peça" && percentualLucro > 0) {
        valorCusto = item.valor_unitario * (1 - percentualLucro / 100);
      }
      itemStmt.run(
        servicoId,
        item.descricao,
        item.tipo,
        item.quantidade,
        item.valor_unitario,
        valorCusto
      );
    }

    // Atualiza a quilometragem do veículo (somente se for maior que a atual)
    if (orc.quilometragem && orc.veiculo_id) {
      const kmAtual = database.db
        .prepare("SELECT quilometragem FROM veiculos WHERE id = ?")
        .get(orc.veiculo_id);
      const kmAtualValor =
        kmAtual && kmAtual.quilometragem ? parseInt(kmAtual.quilometragem) : 0;

      // Só atualiza se a nova quilometragem for maior (se igual, não atualiza mas não gera erro)
      if (orc.quilometragem > kmAtualValor) {
        database.db.prepare("UPDATE veiculos SET quilometragem = ? WHERE id = ?").run(
          orc.quilometragem,
          orc.veiculo_id
        );
      }
    }

    return servicoId;
  });

  try {
    const newId = transaction(orcamento);
    return { success: true, id: newId };
  } catch (error) {
    console.error("Erro ao adicionar orçamento:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-orcamentos", () => {
  const stmt = database.db.prepare(`
    SELECT s.*, c.nome as cliente_nome, v.placa as veiculo_placa
    FROM servicos s
    JOIN clientes c ON s.cliente_id = c.id
    JOIN veiculos v ON s.veiculo_id = v.id
    WHERE s.is_deleted = 0 AND s.status IN ('Pendente', 'Aprovado', 'Recusado')
    ORDER BY s.data_entrada DESC
  `);
  return stmt.all();
});

ipcMain.handle("update-orcamento-status", (event, { id, status }) => {
  const stmt = database.db.prepare("UPDATE servicos SET status = ? WHERE id = ?");
  const result = stmt.run(status, id);
  return result.changes > 0;
});

ipcMain.handle("delete-orcamento", (event, id) => {
  // Orçamentos são apenas serviços com status específico, então apenas arquivamos
  const stmt = database.db.prepare("UPDATE servicos SET is_deleted = 1 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("get-orcamento-itens", (event, servicoId) => {
  const stmt = database.db.prepare("SELECT * FROM itens_servico WHERE servico_id = ?");
  return stmt.all(servicoId);
});

ipcMain.handle("get-orcamento-by-id", (event, id) => {
  const orcamento = database.db.prepare("SELECT * FROM servicos WHERE id = ?").get(id);
  if (orcamento) {
    orcamento.itens = database.db
      .prepare("SELECT * FROM itens_servico WHERE servico_id = ?")
      .all(id);
  }
  return orcamento;
});

ipcMain.handle("update-orcamento", (event, orcamento) => {
  const transaction = database.db.transaction((orc) => {
    const servicoStmt = database.db.prepare(
      "UPDATE servicos SET cliente_id = ?, veiculo_id = ?, data_entrada = ?, descricao_problema = ?, valor_total = ?, status = ? WHERE id = ?"
    );
    servicoStmt.run(
      orc.cliente_id,
      orc.veiculo_id,
      orc.data_entrada,
      orc.descricao_problema,
      orc.valor_total,
      orc.status,
      orc.id
    );

    database.db.prepare("DELETE FROM itens_servico WHERE servico_id = ?").run(orc.id);

    const configRow = database.db
      .prepare("SELECT valor FROM configuracoes WHERE chave = ?")
      .get("percentualLucroPecas");
    const percentualLucro = configRow ? parseFloat(configRow.valor) : 0;

    const itemStmt = database.db.prepare(
      "INSERT INTO itens_servico (servico_id, descricao, tipo, quantidade, valor_unitario, valor_custo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const item of orc.itens) {
      let valorCusto = null;
      if (item.tipo === "Peça" && percentualLucro > 0) {
        valorCusto = item.valor_unitario * (1 - percentualLucro / 100);
      }
      itemStmt.run(
        orc.id,
        item.descricao,
        item.tipo,
        item.quantidade,
        item.valor_unitario,
        valorCusto
      );
    }

    // Atualiza a quilometragem do veículo (somente se for maior que a atual)
    if (orc.quilometragem && orc.veiculo_id) {
      const kmAtual = database.db
        .prepare("SELECT quilometragem FROM veiculos WHERE id = ?")
        .get(orc.veiculo_id);
      const kmAtualValor =
        kmAtual && kmAtual.quilometragem ? parseInt(kmAtual.quilometragem) : 0;

      // Só atualiza se a nova quilometragem for maior (se igual, não atualiza mas não gera erro)
      if (orc.quilometragem > kmAtualValor) {
        database.db.prepare("UPDATE veiculos SET quilometragem = ? WHERE id = ?").run(
          orc.quilometragem,
          orc.veiculo_id
        );
      }
    }

    return orc.id;
  });

  try {
    const updatedId = transaction(orcamento);
    return { success: true, id: updatedId };
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("add-servico", (event, servico) => {
  const transaction = database.db.transaction((s) => {
    // Etapa 1: Inserir o serviço principal com dados simplificados
    const servicoStmt = database.db.prepare(
      `INSERT INTO servicos (
        cliente_id, veiculo_id, data_entrada, descricao_problema, mecanico_responsavel, 
        valor_total, status, valor_original, valor_desconto, forma_pagamento, 
        numero_parcelas, status_pagamento, data_competencia, id_plano_contas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    // Define o status de pagamento inicial
    let statusPagamento = "Pendente";
    if (s.forma_pagamento === "Cartão de Crédito") {
      statusPagamento = "Aguardando Liquidação";
    }

    const servicoResult = servicoStmt.run(
      s.cliente_id,
      s.veiculo_id,
      s.data_entrada,
      s.problema_relatado,
      s.mecanico,
      s.valor_total,
      s.status,
      s.valor_original,
      s.valor_desconto,
      s.forma_pagamento,
      s.numero_parcelas,
      statusPagamento, // Novo status de pagamento
      s.data_competencia,
      111 // id_plano_contas hardcoded
    );
    const servicoId = servicoResult.lastInsertRowid;

    // Etapa 2: Inserir os itens do serviço
    const configRow = database.db
      .prepare("SELECT valor FROM configuracoes WHERE chave = ?")
      .get("percentualLucroPecas");
    const percentualLucro = configRow ? parseFloat(configRow.valor) : 0;
    const itemStmt = database.db.prepare(
      "INSERT INTO itens_servico (servico_id, descricao, tipo, quantidade, valor_unitario, valor_custo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const item of s.itens) {
      let valorCusto = null;
      if (item.tipo === "Peça" && percentualLucro > 0) {
        valorCusto = item.valor_unitario * (1 - percentualLucro / 100);
      }
      itemStmt.run(
        servicoId,
        item.descricao,
        item.tipo,
        item.quantidade,
        item.valor_unitario,
        valorCusto
      );
    }

    // Etapa 3: Lógica de Pagamento Refatorada
    if (s.forma_pagamento === "Cartão de Crédito" && s.numero_parcelas > 0) {
      createInstallmentPayments(
        servicoId,
        s.valor_total,
        s.numero_parcelas,
        s.data_entrada,
        s.data_competencia,
        s.id_plano_contas,
        s.forma_pagamento
      );
    } else if (s.pagamento_inicial) {
      // Mantém a lógica para outros pagamentos imediatos se necessário
      const pagtoStmt = database.db.prepare(
        "INSERT INTO pagamentos (servico_id, metodo, valor, data_liquidacao, data_competencia, id_plano_contas) VALUES (?, ?, ?, ?, ?, ?)"
      );
      pagtoStmt.run(
        servicoId,
        s.pagamento_inicial.forma,
        s.pagamento_inicial.valor,
        s.pagamento_inicial.data_liquidacao,
        s.data_competencia,
        s.id_plano_contas
      );
      // Atualiza o status do serviço principal se o pagamento inicial quitar o valor
      const { totalPago } = database.db
        .prepare(
          "SELECT SUM(valor) as totalPago FROM pagamentos WHERE servico_id = ?"
        )
        .get(servicoId);
      if (totalPago >= s.valor_total) {
        database.db.prepare("UPDATE servicos SET status_pagamento = ? WHERE id = ?").run(
          "Pago",
          servicoId
        );
      } else {
        database.db.prepare("UPDATE servicos SET status_pagamento = ? WHERE id = ?").run(
          "Parcialmente Pago",
          servicoId
        );
      }
    }

    // Etapa 4: Atualizar quilometragem (somente se for maior que a atual)
    if (s.quilometragem && s.veiculo_id) {
      const kmAtual = database.db
        .prepare("SELECT quilometragem FROM veiculos WHERE id = ?")
        .get(s.veiculo_id);
      const kmAtualValor =
        kmAtual && kmAtual.quilometragem ? parseInt(kmAtual.quilometragem) : 0;

      // Só atualiza se a nova quilometragem for maior (se igual, não atualiza mas não gera erro)
      if (s.quilometragem > kmAtualValor) {
        database.db.prepare("UPDATE veiculos SET quilometragem = ? WHERE id = ?").run(
          s.quilometragem,
          s.veiculo_id
        );
      }
    }

    return servicoId;
  });

  try {
    const newId = transaction(servico);
    return { success: true, id: newId };
  } catch (error) {
    console.error("Erro ao adicionar serviço:", error);
    return { success: false, error: error.message };
  }
});


// Handlers para Configurações (Banco de Dados)
ipcMain.handle("get-all-configs", () => {
  const stmt = database.db.prepare("SELECT chave, valor FROM configuracoes");
  const rows = stmt.all();
  const config = {};
  for (const row of rows) {
    config[row.chave] = row.valor;
  }

  // Converter caminhos de imagem para URLs de arquivo para que o renderer possa exibi-los
  const userDataPath = app.getPath("userData");
  if (config.logoPath) {
    const absolutePath = path.join(userDataPath, config.logoPath);
    config.logoPath = require("url").pathToFileURL(absolutePath).href;
  }
  if (config.assinaturaPath) {
    const absolutePath = path.join(userDataPath, config.assinaturaPath);
    config.assinaturaPath = require("url").pathToFileURL(absolutePath).href;
  }

  return config;
});

ipcMain.handle("save-configs", (event, configData) => {
  const stmt = database.db.prepare(
    "INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)"
  );
  const transaction = database.db.transaction((configs) => {
    const userDataPath = app.getPath("userData");
    // Converte URLs de arquivo de volta para caminhos relativos para armazenamento
    if (configs.logoPath && configs.logoPath.startsWith("file:///")) {
      const filePath = require("url").fileURLToPath(configs.logoPath);
      configs.logoPath = path
        .relative(userDataPath, filePath)
        .replace(/\\/g, "/");
    }
    if (
      configs.assinaturaPath &&
      configs.assinaturaPath.startsWith("file:///")
    ) {
      const filePath = require("url").fileURLToPath(configs.assinaturaPath);
      configs.assinaturaPath = path
        .relative(userDataPath, filePath)
        .replace(/\\/g, "/");
    }

    for (const chave in configs) {
      stmt.run(chave, configs[chave]);
    }
  });
  try {
    transaction(configData);
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return { success: false, error: error.message };
  }
});

// O handler save-file pode ser mantido se for para outros propósitos (ex: logo, assinatura)
ipcMain.handle("save-file", (event, fileBuffer, destinationFilename) => {
  const dataDir = path.join(app.getPath("userData"), "data");
  if (!require("fs").existsSync(dataDir)) {
    require("fs").mkdirSync(dataDir);
  }
  const destPath = path.join(dataDir, destinationFilename);
  try {
    require("fs").writeFileSync(destPath, Buffer.from(fileBuffer));
    return path.join("data", destinationFilename).replace(/\\/g, "/");
  } catch (error) {
    console.error("Erro ao salvar arquivo:", error);
    return null;
  }
});

// Handlers IPC para Gerenciar Serviços

// Handlers IPC para Pagamentos
ipcMain.handle("get-servicos-para-pagamentos", (event, busca) => {
  return getServicosParaPagamentos(busca);
});

ipcMain.handle("get-servico-com-pagamentos", (event, servicoId) => {
  return getServicoComPagamentos(servicoId);
});

ipcMain.handle("adicionar-pagamento", (event, pagamento) => {
  return adicionarPagamento(pagamento);
});

ipcMain.handle("confirmar-pagamento", async (event, pagamentoId) => {
  try {
    return database.confirmarPagamento(pagamentoId);
  } catch (error) {
    console.error("Failed to confirm payment:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-pagamentos", () => {
  const stmt = database.db.prepare("SELECT * FROM pagamentos ORDER BY data_liquidacao");
  return stmt.all();
});

ipcMain.handle("get-dados-dashboard", (event, filtros) => {
  return getDadosDashboard(filtros);
});

ipcMain.handle("get-servicos", () => {
  // A consulta principal busca os serviços
  const stmt = database.db.prepare(`
    SELECT 
      s.id,
      COALESCE(s.cliente_nome_manual, c.nome) as clienteNome,
      COALESCE(s.veiculo_desc_manual, v.placa) as placaVeiculo,
      s.data_entrada as dataEntrada,
      s.data_conclusao as dataConclusao,
      s.valor_total as valorTotal,
      s.mecanico_responsavel as mecanico,
      s.status,
      s.status_pagamento as statusPagamento,
      s.data_competencia as data_competencia,
      s.data_vencimento as data_vencimento,
      s.id_plano_contas as id_plano_contas
    FROM servicos s
    LEFT JOIN clientes c ON s.cliente_id = c.id
    LEFT JOIN veiculos v ON s.veiculo_id = v.id
    WHERE s.is_deleted = 0 AND s.status NOT IN ('Pendente', 'Recusado')
    ORDER BY s.id DESC
  `);
  const servicos = stmt.all();

  // A função de edição no frontend precisa dos itens, então vamos buscá-los
  const stmtItens = database.db.prepare(
    "SELECT * FROM itens_servico WHERE servico_id = ?"
  );
  for (const servico of servicos) {
    servico.itens = stmtItens.all(servico.id).map((item) => ({
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario, // Padronizado para valor_unitario
      valor_custo: item.valor_custo,
    }));
  }
  return servicos;
});

ipcMain.handle("get-servico-by-id", (event, id) => {
  const servico = database.db
    .prepare(
      `
    SELECT 
      s.id, s.data as dataEntrada, s.data_conclusao as dataConclusao, s.mecanico_responsavel as mecanico, 
      s.status, s.status_pagamento as statusPagamento, s.valor_total as valorTotal,
      COALESCE(s.cliente_nome_manual, c.nome) as clienteNome,
      COALESCE(s.veiculo_desc_manual, v.placa) as placaVeiculo
    FROM servicos s
    LEFT JOIN clientes c ON s.cliente_id = c.id
    LEFT JOIN veiculos v ON s.veiculo_id = v.id
    WHERE s.id = ?
  `
    )
    .get(id);

  if (servico) {
    servico.itens = database.db
      .prepare(
        "SELECT *, valor_unitario FROM itens_servico WHERE servico_id = ?"
      )
      .all(id);
    servico.pagamentos = database.db
      .prepare("SELECT * FROM pagamentos WHERE servico_id = ?")
      .all(id);
  }
  return servico;
});

ipcMain.handle("update-servico", (event, servico) => {
  const transaction = database.db.transaction((s) => {
    // 1. Atualiza a tabela principal de serviços
    // Mapeia os nomes do frontend (ex: dataEntrada) para os nomes do DB (ex: data)
    const servicoStmt = database.db.prepare(
      `UPDATE servicos 
       SET data_entrada = ?, mecanico_responsavel = ?, status = ?, valor_total = ?, data_conclusao = ?, data_competencia = ?, data_vencimento = ?, id_plano_contas = ?
       WHERE id = ?`
    );
    servicoStmt.run(
      s.dataEntrada,
      s.mecanico,
      s.status,
      s.valorTotal,
      s.dataConclusao,
      s.data_competencia,
      s.data_vencimento,
      s.id_plano_contas,
      s.id
    );

    // 2. Apaga os itens antigos para substituir pelos novos
    database.db.prepare("DELETE FROM itens_servico WHERE servico_id = ?").run(s.id);

    // 3. Insere os novos itens
    const configRow = database.db
      .prepare("SELECT valor FROM configuracoes WHERE chave = ?")
      .get("percentualLucroPecas");
    const percentualLucro = configRow ? parseFloat(configRow.valor) : 0;

    const itemStmt = database.db.prepare(
      "INSERT INTO itens_servico (servico_id, descricao, tipo, quantidade, valor_unitario, valor_custo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const item of s.itens) {
      let valorCusto = null;
      if (item.tipo === "Peça" && percentualLucro > 0) {
        valorCusto = item.valor_unitario * (1 - percentualLucro / 100);
      }
      // Mapeia 'valor_unitario' do frontend para 'valor_unitario' do DB
      itemStmt.run(
        s.id,
        item.descricao,
        item.tipo,
        item.quantidade,
        item.valor_unitario,
        valorCusto
      );
    }
    return s.id;
  });

  try {
    transaction(servico);
    return true; // Retorna sucesso
  } catch (error) {
    console.error("Erro ao atualizar serviço:", error);
    return false; // Retorna falha
  }
});

ipcMain.handle("delete-servico", (event, id) => {
  try {
    const stmt = database.db.prepare("UPDATE servicos SET is_deleted = 1 WHERE id = ?");
    const result = stmt.run(id);
    if (result.changes > 0) {
      return { success: true };
    } else {
      return {
        success: false,
        error: "Serviço não encontrado com o ID fornecido.",
      };
    }
  } catch (error) {
    console.error("Erro ao arquivar serviço:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("print-orcamento", async (event, id) => {
  // 1. Get all data
  const budget = database.db.prepare("SELECT * FROM servicos WHERE id = ?").get(id);
  if (!budget) return false;

  budget.itens = database.db
    .prepare("SELECT * FROM itens_servico WHERE servico_id = ?")
    .all(id);

  let client = {};
  let vehicle = {};

  // If a client is linked, fetch their data.
  if (budget.cliente_id) {
    client =
      database.db
        .prepare("SELECT * FROM clientes WHERE id = ?")
        .get(budget.cliente_id) || {};
    vehicle =
      database.db
        .prepare("SELECT * FROM veiculos WHERE id = ?")
        .get(budget.veiculo_id) || {};
  }

  // If it's a manual service, overwrite with manual data for the template
  if (budget.cliente_nome_manual) {
    client.nome = budget.cliente_nome_manual;
    client.cpf_cnpj = "";
    client.telefone = "";
    client.email = "";
    client.endereco = "";
  }
  if (budget.veiculo_desc_manual) {
    vehicle.placa = budget.veiculo_desc_manual;
    vehicle.marca = "";
    vehicle.modelo = "";
    vehicle.ano = "";
    vehicle.cor = "";
  }

  const configRows = database.db.prepare("SELECT chave, valor FROM configuracoes").all();
  const config = configRows.reduce((acc, row) => {
    acc[row.chave] = row.valor;
    return acc;
  }, {});

  // Convert relative image paths to absolute file URLs
  const userDataPath = app.getPath("userData");
  if (config.logoPath) {
    const absolutePath = path.join(userDataPath, config.logoPath);
    config.logoPath = require("url").pathToFileURL(absolutePath).href;
  }
  if (config.assinaturaPath) {
    const absolutePath = path.join(userDataPath, config.assinaturaPath);
    config.assinaturaPath = require("url").pathToFileURL(absolutePath).href;
  }

  // 2. Create a new hidden window
  const printWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true, // Show the window to act as a preview
    webPreferences: {
      preload: path.join(__dirname, "print-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  printWindow.loadFile("template-orcamento.html");

  // 3. Send data and print
  printWindow.webContents.on("did-finish-load", () => {
    printWindow.webContents.send("print-data", {
      budget,
      client,
      vehicle,
      config,
    });
  });

  // 4. Listen for ready signal from template
  ipcMain.removeHandler("ready-to-print");
  ipcMain.handleOnce("ready-to-print", () => {
    printWindow.webContents.print({}, (success, errorType) => {
      if (!success) console.log(`Print failed: ${errorType}`);
      printWindow.close();
    });
  });

  ipcMain.removeHandler("print-error");
  ipcMain.handleOnce("print-error", (event, error) => {
    console.error("Error in print template:", error);
    printWindow.close();
  });

  return true;
});

// Handlers for Archived Data
ipcMain.handle("get-archived-clientes", () => {
  const stmt = database.db.prepare(
    "SELECT * FROM clientes WHERE is_deleted = 1 ORDER BY nome"
  );
  return stmt.all();
});

ipcMain.handle("get-archived-veiculos", () => {
  const stmt = database.db.prepare(
    "SELECT v.*, c.nome as cliente_nome FROM veiculos v JOIN clientes c ON v.cliente_id = c.id WHERE v.is_deleted = 1 ORDER BY c.nome, v.modelo"
  );
  return stmt.all();
});

ipcMain.handle("get-archived-servicos", () => {
  const stmt = database.db.prepare(`
    SELECT 
      s.id,
      COALESCE(s.cliente_nome_manual, c.nome) as clienteNome,
      COALESCE(s.veiculo_desc_manual, v.placa) as placaVeiculo,
      s.data_entrada as dataEntrada
    FROM servicos s
    LEFT JOIN clientes c ON s.cliente_id = c.id
    LEFT JOIN veiculos v ON s.veiculo_id = v.id
    WHERE s.is_deleted = 1
    ORDER BY s.id DESC
  `);
  return stmt.all();
});

ipcMain.handle("restore-cliente", (event, id) => {
  // When restoring a client, also restore their vehicles that were not individually archived
  const transaction = database.db.transaction((clienteId) => {
    const stmtVeiculos = database.db.prepare(
      "UPDATE veiculos SET is_deleted = 0 WHERE cliente_id = ?"
    );
    stmtVeiculos.run(clienteId);

    const stmtCliente = database.db.prepare(
      "UPDATE clientes SET is_deleted = 0 WHERE id = ?"
    );
    const result = stmtCliente.run(clienteId);

    return result.changes > 0;
  });

  try {
    return transaction(id);
  } catch (error) {
    console.error("Erro ao restaurar cliente:", error);
    return false;
  }
});

ipcMain.handle("restore-veiculo", (event, id) => {
  const stmt = database.db.prepare("UPDATE veiculos SET is_deleted = 0 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("restore-servico", (event, id) => {
  const stmt = database.db.prepare("UPDATE servicos SET is_deleted = 0 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("permanently-delete-cliente", (event, id) => {
  // ON DELETE CASCADE will handle vehicles
  const stmt = database.db.prepare("DELETE FROM clientes WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("permanently-delete-veiculo", (event, id) => {
  const stmt = database.db.prepare("DELETE FROM veiculos WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("permanently-delete-servico", (event, id) => {
  // ON DELETE CASCADE will handle items and payments
  const stmt = database.db.prepare("DELETE FROM servicos WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("get-plano-contas", () => {
  return getPlanoContas();
});

ipcMain.handle("add-despesa", (event, despesa) => {
  return addDespesa(despesa);
});

ipcMain.handle("add-receita-avulsa", async (event, receita) => {
  try {
    // Define o status de pagamento inicial
    let statusPagamento = "Pendente";
    if (receita.metodo_pagamento === "Cartão de Crédito") {
      statusPagamento = "Aguardando Liquidação";
    } else if (receita.data_conclusao) {
      statusPagamento = "Pago";
    }

    const servicoResult = database.db
      .prepare(
        `INSERT INTO servicos (
            id_plano_contas, valor_total, descricao_problema, data_competencia, 
            data_vencimento, data_entrada, data_conclusao, status, status_pagamento,
            cliente_id, veiculo_id, is_deleted, metodo_pagamento, numero_parcelas_servico
        ) VALUES (
            @id_plano_contas, @valor_total, @descricao_problema, @data_competencia,
            @data_vencimento, @data_entrada, @data_conclusao, @status, @status_pagamento,
            NULL, NULL, 0, @metodo_pagamento, @numero_parcelas
        )`
      )
      .run({ ...receita, status_pagamento: statusPagamento });
    const servicoId = servicoResult.lastInsertRowid;

    if (
      receita.metodo_pagamento === "Cartão de Crédito" &&
      receita.numero_parcelas > 0
    ) {
      createInstallmentPayments(
        servicoId,
        receita.valor_total,
        receita.numero_parcelas,
        receita.data_entrada, // Usar data_entrada como base para cálculo
        receita.data_competencia,
        receita.id_plano_contas,
        receita.metodo_pagamento
      );
    } else if (receita.data_conclusao) {
      // Para pagamentos à vista (não cartão de crédito) que já foram liquidados
      database.db.prepare(
        "INSERT INTO pagamentos (servico_id, valor, data_liquidacao, metodo, anotacao, data_competencia, id_plano_contas) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(
        servicoId,
        receita.valor_total,
        receita.data_conclusao,
        receita.metodo_pagamento,
        receita.descricao_problema,
        receita.data_competencia,
        receita.id_plano_contas
      );
    }

    return { success: true, id: servicoId };
  } catch (error) {
    console.error("Failed to add miscellaneous revenue:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-despesas", async (event, filtros) => {
  try {
    console.log("Filtros recebidos no main.js:", filtros);
    return getDespesas(filtros);
  } catch (error) {
    console.error("Failed to get expenses:", error);
    return [];
  }
});

ipcMain.handle("delete-despesa", async (event, id) => {
  try {
    return deleteDespesa(id);
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-receitas-avulsas", async (event, filtros) => {
  try {
    return getReceitasAvulsas(filtros);
  } catch (error) {
    console.error("Failed to get miscellaneous revenues:", error);
    return [];
  }
});

ipcMain.handle("delete-receita-avulsa", async (event, id) => {
  try {
    return deleteReceitaAvulsa(id);
  } catch (error) {
    console.error("Failed to delete miscellaneous revenue:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("print-relatorio-financeiro", async (event, reportData) => {
  const printWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // Janela oculta
    webPreferences: {
      preload: path.join(__dirname, "print-relatorio-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  printWindow.loadFile("template-relatorio-financeiro.html");

  printWindow.webContents.on("did-finish-load", () => {
    printWindow.webContents.send("print-data", reportData);
  });

  ipcMain.removeHandler("ready-to-print");
  ipcMain.handleOnce("ready-to-print", () => {
    printWindow.webContents.print({}, (success, errorType) => {
      if (!success) console.log(`Print failed: ${errorType}`);
      printWindow.close();
    });
  });

  ipcMain.removeHandler("print-error");
  ipcMain.handleOnce("print-error", (event, error) => {
    console.error("Error in print template:", error);
    printWindow.close();
  });

  return true;
});

app.whenReady().then(() => {
  initializeLogger(app.getPath('userData'));
  console.log('App is ready. Initializing DB...');
  database.initDb(app.getPath('userData'));
  console.log('DB initialized successfully.');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' file: data: *;",
        ],
      },
    });
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
