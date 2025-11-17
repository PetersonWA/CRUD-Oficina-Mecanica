const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Manter saveFile se ainda for útil para imagens, etc.
  saveFile: (fileBuffer, destinationFilename) => ipcRenderer.invoke('save-file', fileBuffer, destinationFilename),
  
  // CRUD Clientes
  getClientes: () => ipcRenderer.invoke('get-clientes'),
  addCliente: (cliente) => ipcRenderer.invoke('add-cliente', cliente),
  updateCliente: (cliente) => ipcRenderer.invoke('update-cliente', cliente),
  deleteCliente: (id) => ipcRenderer.invoke('delete-cliente', id),

  // CRUD Veículos
  getVeiculos: () => ipcRenderer.invoke('get-veiculos'),
  addVeiculo: (veiculo) => ipcRenderer.invoke('add-veiculo', veiculo),
  updateVeiculo: (veiculo) => ipcRenderer.invoke('update-veiculo', veiculo),
  deleteVeiculo: (id) => ipcRenderer.invoke('delete-veiculo', id),

  // CRUD Orçamentos
  addOrcamento: (orcamento) => ipcRenderer.invoke('add-orcamento', orcamento),
  getOrcamentos: () => ipcRenderer.invoke('get-orcamentos'),
  updateOrcamentoStatus: (id, status) => ipcRenderer.invoke('update-orcamento-status', { id, status }),
  deleteOrcamento: (id) => ipcRenderer.invoke('delete-orcamento', id),

  getOrcamentoItens: (servicoId) => ipcRenderer.invoke('get-orcamento-itens', servicoId),

  getOrcamentoById: (id) => ipcRenderer.invoke('get-orcamento-by-id', id),
  updateOrcamento: (orcamento) => ipcRenderer.invoke('update-orcamento', orcamento),
  printOrcamento: (id) => ipcRenderer.invoke('print-orcamento', id),

  addServico: (servico) => ipcRenderer.invoke('add-servico', servico),

  // Gerenciar Serviços
  getServicos: () => ipcRenderer.invoke('get-servicos'),
  updateServico: (servico) => ipcRenderer.invoke('update-servico', servico),
  deleteServico: (id) => ipcRenderer.invoke('delete-servico', id),
  getServicoById: (id) => ipcRenderer.invoke('get-servico-by-id', id),

  // Pagamentos
  getServicosParaPagamentos: (busca) => ipcRenderer.invoke('get-servicos-para-pagamentos', busca),
  getServicoComPagamentos: (servicoId) => ipcRenderer.invoke('get-servico-com-pagamentos', servicoId),
  adicionarPagamento: (pagamento) => ipcRenderer.invoke('adicionar-pagamento', pagamento),
  confirmarPagamento: (pagamentoId) => ipcRenderer.invoke('confirmar-pagamento', pagamentoId),

  getPagamentos: () => ipcRenderer.invoke('get-pagamentos'),

  getDadosDashboard: (filtros) => ipcRenderer.invoke('get-dados-dashboard', filtros),

  getPlanoContas: () => ipcRenderer.invoke('get-plano-contas'),

  addDespesa: (despesa) => ipcRenderer.invoke('add-despesa', despesa),

  getDespesas: (filtros) => ipcRenderer.invoke('get-despesas', filtros),
  deleteDespesa: (id) => ipcRenderer.invoke('delete-despesa', id),

  addReceitaAvulsa: (receita) => ipcRenderer.invoke('add-receita-avulsa', receita),

  getReceitasAvulsas: (filtros) => ipcRenderer.invoke('get-receitas-avulsas', filtros),
  deleteReceitaAvulsa: (id) => ipcRenderer.invoke('delete-receita-avulsa', id),

  printRelatorioFinanceiro: (reportData) => ipcRenderer.invoke('print-relatorio-financeiro', reportData),

  getAllConfigs: () => ipcRenderer.invoke('get-all-configs'),
  saveConfigs: (configs) => ipcRenderer.invoke('save-configs', configs),

  // Archived Data Management
  getArchivedClientes: () => ipcRenderer.invoke('get-archived-clientes'),
  restoreCliente: (id) => ipcRenderer.invoke('restore-cliente', id),
  permanentlyDeleteCliente: (id) => ipcRenderer.invoke('permanently-delete-cliente', id),
  getArchivedVeiculos: () => ipcRenderer.invoke('get-archived-veiculos'),
  restoreVeiculo: (id) => ipcRenderer.invoke('restore-veiculo', id),
  permanentlyDeleteVeiculo: (id) => ipcRenderer.invoke('permanently-delete-veiculo', id),
  getArchivedServicos: () => ipcRenderer.invoke('get-archived-servicos'),
  restoreServico: (id) => ipcRenderer.invoke('restore-servico', id),
  permanentlyDeleteServico: (id) => ipcRenderer.invoke('permanently-delete-servico', id),

  // Adicionar um placeholder para Buffer se necessário em algum outro lugar
  Buffer: Buffer
});
