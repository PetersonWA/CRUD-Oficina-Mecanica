console.log("main.js is being executed");

const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const database = require("./database.js");
const { db, getServicosParaPagamentos, getServicoComPagamentos, adicionarPagamento, getDadosDashboard, getPlanoContas, addDespesa } = database; // Importa a instância do DB

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
  const stmt = db.prepare("SELECT * FROM clientes WHERE is_deleted = 0 ORDER BY nome");
  return stmt.all();
});

ipcMain.handle("add-cliente", (event, cliente) => {
  const stmt = db.prepare(
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
  const stmt = db.prepare(
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
  const transaction = db.transaction((clienteId) => {
    const stmtVeiculos = db.prepare("UPDATE veiculos SET is_deleted = 1 WHERE cliente_id = ?");
    stmtVeiculos.run(clienteId);
    
    const stmtCliente = db.prepare("UPDATE clientes SET is_deleted = 1 WHERE id = ?");
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
  const stmt = db.prepare(`
    SELECT v.*, c.nome as cliente_nome 
    FROM veiculos v
    JOIN clientes c ON v.cliente_id = c.id
    WHERE v.is_deleted = 0 AND c.is_deleted = 0
    ORDER BY c.nome, v.modelo
  `);
  return stmt.all();
});

ipcMain.handle("add-veiculo", (event, veiculo) => {
  const stmt = db.prepare(
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
  const stmt = db.prepare(
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
  const stmt = db.prepare("UPDATE veiculos SET is_deleted = 1 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

// Handlers IPC para Orçamentos/Serviços
ipcMain.handle("add-orcamento", (event, orcamento) => {
  const transaction = db.transaction((orc) => {
    const servicoStmt = db.prepare(
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

    const configRow = db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get('percentualLucroPecas');
    const percentualLucro = configRow ? parseFloat(configRow.valor) : 0;

    const itemStmt = db.prepare(
      "INSERT INTO itens_servico (servico_id, descricao, tipo, quantidade, valor_unitario, valor_custo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const item of orc.itens) {
      let valorCusto = null;
      if (item.tipo === 'Peça' && percentualLucro > 0) {
        valorCusto = item.valor_unitario * (1 - (percentualLucro / 100));
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

    // Atualiza a quilometragem do veículo se a nova for maior
    if (orc.quilometragem) {
      db.prepare(
        "UPDATE veiculos SET quilometragem = ? WHERE id = ? AND (? > quilometragem OR quilometragem IS NULL)"
      ).run(orc.quilometragem, orc.veiculo_id, orc.quilometragem);
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
  const stmt = db.prepare(`
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
  const stmt = db.prepare("UPDATE servicos SET status = ? WHERE id = ?");
  const result = stmt.run(status, id);
  return result.changes > 0;
});

ipcMain.handle("delete-orcamento", (event, id) => {
  // Orçamentos são apenas serviços com status específico, então apenas arquivamos
  const stmt = db.prepare("UPDATE servicos SET is_deleted = 1 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("get-orcamento-itens", (event, servicoId) => {
  const stmt = db.prepare("SELECT * FROM itens_servico WHERE servico_id = ?");
  return stmt.all(servicoId);
});

ipcMain.handle("get-orcamento-by-id", (event, id) => {
  const orcamento = db.prepare("SELECT * FROM servicos WHERE id = ?").get(id);
  if (orcamento) {
    orcamento.itens = db
      .prepare("SELECT * FROM itens_servico WHERE servico_id = ?")
      .all(id);
  }
  return orcamento;
});

ipcMain.handle("update-orcamento", (event, orcamento) => {
  const transaction = db.transaction((orc) => {
    const servicoStmt = db.prepare(
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

    db.prepare("DELETE FROM itens_servico WHERE servico_id = ?").run(orc.id);

    const configRow = db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get('percentualLucroPecas');
    const percentualLucro = configRow ? parseFloat(configRow.valor) : 0;

    const itemStmt = db.prepare(
      "INSERT INTO itens_servico (servico_id, descricao, tipo, quantidade, valor_unitario, valor_custo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const item of orc.itens) {
      let valorCusto = null;
      if (item.tipo === 'Peça' && percentualLucro > 0) {
        valorCusto = item.valor_unitario * (1 - (percentualLucro / 100));
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

    // Atualiza a quilometragem do veículo se a nova for maior
    if (orc.quilometragem) {
      db.prepare(
        "UPDATE veiculos SET quilometragem = ? WHERE id = ? AND (? > quilometragem OR quilometragem IS NULL)"
      ).run(orc.quilometragem, orc.veiculo_id, orc.quilometragem);
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
  const transaction = db.transaction((s) => {
    const servicoStmt = db.prepare(
      `INSERT INTO servicos (
        cliente_id, veiculo_id, data_entrada, descricao_problema, mecanico_responsavel, 
        valor_total, status, valor_original, valor_desconto, forma_pagamento, 
        numero_parcelas, status_pagamento, data_competencia, data_vencimento, id_plano_contas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const servicoResult = servicoStmt.run(
      s.cliente_id,
      s.veiculo_id,
      s.data_entrada,
      s.problema_relatado,      // Frontend sends problema_relatado
      s.mecanico,               // Frontend sends mecanico
      s.valor_total,
      s.status,
      s.valor_original,
      s.valor_desconto,
      s.forma_pagamento,
      s.numero_parcelas,
      s.status_pagamento,
      s.data_competencia,
      s.data_vencimento,
      s.id_plano_contas || 111 // Use provided or default
    );
    const servicoId = servicoResult.lastInsertRowid;

    const configRow = db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get('percentualLucroPecas');
    const percentualLucro = configRow ? parseFloat(configRow.valor) : 0;

    const itemStmt = db.prepare(
      "INSERT INTO itens_servico (servico_id, descricao, tipo, quantidade, valor_unitario, valor_custo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const item of s.itens) {
      let valorCusto = null;
      if (item.tipo === 'Peça' && percentualLucro > 0) {
        valorCusto = item.valor_unitario * (1 - (percentualLucro / 100));
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

    if (s.pagamento_inicial) {
      const pagtoStmt = db.prepare(
        "INSERT INTO pagamentos (servico_id, metodo, valor, data_liquidacao) VALUES (?, ?, ?, ?)"
      );
      pagtoStmt.run(
        servicoId,
        s.pagamento_inicial.forma,
        s.pagamento_inicial.valor,
        s.pagamento_inicial.data_liquidacao
      );
    }

    if (s.quilometragem && s.veiculo_id) {
      db.prepare(
        "UPDATE veiculos SET quilometragem = ? WHERE id = ? AND (? > quilometragem OR quilometragem IS NULL)"
      ).run(s.quilometragem, s.veiculo_id, s.quilometragem);
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
  const stmt = db.prepare("SELECT chave, valor FROM configuracoes");
  const rows = stmt.all();
  const config = {};
  for (const row of rows) {
    config[row.chave] = row.valor;
  }

  // Converter caminhos de imagem para URLs de arquivo para que o renderer possa exibi-los
  const userDataPath = app.getPath("userData");
  if (config.logoPath) {
    const absolutePath = path.join(userDataPath, config.logoPath);
    config.logoPath = require('url').pathToFileURL(absolutePath).href;
  }
  if (config.assinaturaPath) {
    const absolutePath = path.join(userDataPath, config.assinaturaPath);
    config.assinaturaPath = require('url').pathToFileURL(absolutePath).href;
  }

  return config;
});

ipcMain.handle("save-configs", (event, configData) => {
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)"
  );
      const transaction = db.transaction((configs) => {
          const userDataPath = app.getPath("userData");
          // Converte URLs de arquivo de volta para caminhos relativos para armazenamento
          if (configs.logoPath && configs.logoPath.startsWith('file:///')) {
              const filePath = require('url').fileURLToPath(configs.logoPath);
              configs.logoPath = path.relative(userDataPath, filePath).replace(/\\/g, "/");
          }
          if (configs.assinaturaPath && configs.assinaturaPath.startsWith('file:///')) {
              const filePath = require('url').fileURLToPath(configs.assinaturaPath);
              configs.assinaturaPath = path.relative(userDataPath, filePath).replace(/\\/g, "/");
          }
  
          for (const chave in configs) {
              stmt.run(chave, configs[chave]);
          }
      });  try {
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

ipcMain.handle("get-pagamentos", () => {
  const stmt = db.prepare("SELECT * FROM pagamentos ORDER BY data_liquidacao");
  return stmt.all();
});

ipcMain.handle('get-dados-dashboard', (event, filtros) => {
  return getDadosDashboard(filtros);
});

ipcMain.handle("get-servicos", () => {
  // A consulta principal busca os serviços
  const stmt = db.prepare(`
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
  const stmtItens = db.prepare(
    "SELECT * FROM itens_servico WHERE servico_id = ?"
  );
  for (const servico of servicos) {
    servico.itens = stmtItens.all(servico.id).map((item) => ({
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario, // Padronizado para valor_unitario
      valor_custo: item.valor_custo
    }));
  }
  return servicos;
});

ipcMain.handle("get-servico-by-id", (event, id) => {
  const servico = db.prepare(`
    SELECT 
      s.id, s.data as dataEntrada, s.data_conclusao as dataConclusao, s.mecanico_responsavel as mecanico, 
      s.status, s.status_pagamento as statusPagamento, s.valor_total as valorTotal,
      COALESCE(s.cliente_nome_manual, c.nome) as clienteNome,
      COALESCE(s.veiculo_desc_manual, v.placa) as placaVeiculo
    FROM servicos s
    LEFT JOIN clientes c ON s.cliente_id = c.id
    LEFT JOIN veiculos v ON s.veiculo_id = v.id
    WHERE s.id = ?
  `).get(id);

  if (servico) {
    servico.itens = db.prepare("SELECT *, valor_unitario FROM itens_servico WHERE servico_id = ?").all(id);
    servico.pagamentos = db.prepare("SELECT * FROM pagamentos WHERE servico_id = ?").all(id);
  }
  return servico;
});

ipcMain.handle("update-servico", (event, servico) => {
  const transaction = db.transaction((s) => {
    // 1. Atualiza a tabela principal de serviços
    // Mapeia os nomes do frontend (ex: dataEntrada) para os nomes do DB (ex: data)
    const servicoStmt = db.prepare(
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
    db.prepare("DELETE FROM itens_servico WHERE servico_id = ?").run(s.id);

    // 3. Insere os novos itens
    const configRow = db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get('percentualLucroPecas');
    const percentualLucro = configRow ? parseFloat(configRow.valor) : 0;

    const itemStmt = db.prepare(
      "INSERT INTO itens_servico (servico_id, descricao, tipo, quantidade, valor_unitario, valor_custo) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const item of s.itens) {
      let valorCusto = null;
      if (item.tipo === 'Peça' && percentualLucro > 0) {
        valorCusto = item.valor_unitario * (1 - (percentualLucro / 100));
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
    const stmt = db.prepare("UPDATE servicos SET is_deleted = 1 WHERE id = ?");
    const result = stmt.run(id);
    if (result.changes > 0) {
        return { success: true };
    } else {
        return { success: false, error: "Serviço não encontrado com o ID fornecido." };
    }
  } catch (error) {
    console.error("Erro ao arquivar serviço:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("print-orcamento", async (event, id) => {
  // 1. Get all data
  const budget = db.prepare("SELECT * FROM servicos WHERE id = ?").get(id);
  if (!budget) return false;

  budget.itens = db
    .prepare("SELECT * FROM itens_servico WHERE servico_id = ?")
    .all(id);
  
  let client = {};
  let vehicle = {};

  // If a client is linked, fetch their data.
  if (budget.cliente_id) {
    client = db.prepare("SELECT * FROM clientes WHERE id = ?").get(budget.cliente_id) || {};
    vehicle = db.prepare("SELECT * FROM veiculos WHERE id = ?").get(budget.veiculo_id) || {};
  }

  // If it's a manual service, overwrite with manual data for the template
  if (budget.cliente_nome_manual) {
    client.nome = budget.cliente_nome_manual;
    client.cpf_cnpj = '';
    client.telefone = '';
    client.email = '';
    client.endereco = '';
  }
  if (budget.veiculo_desc_manual) {
    vehicle.placa = budget.veiculo_desc_manual;
    vehicle.marca = '';
    vehicle.modelo = '';
    vehicle.ano = '';
    vehicle.cor = '';
  }

  const configRows = db.prepare("SELECT chave, valor FROM configuracoes").all();
  const config = configRows.reduce((acc, row) => {
    acc[row.chave] = row.valor;
    return acc;
  }, {});

  // Convert relative image paths to absolute file URLs
  const userDataPath = app.getPath("userData");
  if (config.logoPath) {
    const absolutePath = path.join(userDataPath, config.logoPath);
    config.logoPath = require('url').pathToFileURL(absolutePath).href;
  }
  if (config.assinaturaPath) {
    const absolutePath = path.join(userDataPath, config.assinaturaPath);
    config.assinaturaPath = require('url').pathToFileURL(absolutePath).href;
  }

  // 2. Create a new hidden window
  const printWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true, // Show the window to act as a preview
        webPreferences: {
            preload: path.join(__dirname, 'print-preload.js'),
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
  ipcMain.removeHandler('ready-to-print');
  ipcMain.handleOnce("ready-to-print", () => {
    printWindow.webContents.print({}, (success, errorType) => {
      if (!success) console.log(`Print failed: ${errorType}`);
      printWindow.close();
    });
  });

  ipcMain.removeHandler('print-error');
  ipcMain.handleOnce("print-error", (event, error) => {
    console.error("Error in print template:", error);
    printWindow.close();
  });

  return true;
});

// Handlers for Archived Data
ipcMain.handle("get-archived-clientes", () => {
  const stmt = db.prepare("SELECT * FROM clientes WHERE is_deleted = 1 ORDER BY nome");
  return stmt.all();
});

ipcMain.handle("get-archived-veiculos", () => {
  const stmt = db.prepare("SELECT v.*, c.nome as cliente_nome FROM veiculos v JOIN clientes c ON v.cliente_id = c.id WHERE v.is_deleted = 1 ORDER BY c.nome, v.modelo");
  return stmt.all();
});

ipcMain.handle("get-archived-servicos", () => {
  const stmt = db.prepare(`
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
  const transaction = db.transaction((clienteId) => {
    const stmtVeiculos = db.prepare("UPDATE veiculos SET is_deleted = 0 WHERE cliente_id = ?");
    stmtVeiculos.run(clienteId);
    
    const stmtCliente = db.prepare("UPDATE clientes SET is_deleted = 0 WHERE id = ?");
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
  const stmt = db.prepare("UPDATE veiculos SET is_deleted = 0 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("restore-servico", (event, id) => {
  const stmt = db.prepare("UPDATE servicos SET is_deleted = 0 WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("permanently-delete-cliente", (event, id) => {
  // ON DELETE CASCADE will handle vehicles
  const stmt = db.prepare("DELETE FROM clientes WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("permanently-delete-veiculo", (event, id) => {
  const stmt = db.prepare("DELETE FROM veiculos WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("permanently-delete-servico", (event, id) => {
  // ON DELETE CASCADE will handle items and payments
  const stmt = db.prepare("DELETE FROM servicos WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
});

ipcMain.handle("get-plano-contas", () => {
  return getPlanoContas();
});

ipcMain.handle("add-despesa", (event, despesa) => {
  return addDespesa(despesa);
});

app.whenReady().then(() => {
  database.initDb();

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
