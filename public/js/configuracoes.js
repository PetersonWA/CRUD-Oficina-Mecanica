/* Scripts específicos para a página de configurações */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('config-form');
  if (!form) return; // Exit if not on the settings page

  const logoPreview = document.getElementById('logo-preview');
  const logoInput = document.getElementById('logo');
  const deleteLogoBtn = document.getElementById('delete-logo');
  const assinaturaPreview = document.getElementById('assinatura-preview');
  const assinaturaInput = document.getElementById('assinatura');
  const deleteAssinaturaBtn = document.getElementById('delete-assinatura');

  const placeholderLogo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect fill='%23F8F9FA' width='200' height='150'/%3E%3Ctext fill='rgba(0,0,0,0.4)' font-family='sans-serif' font-size='16' dy='5.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ELogo%3C/text%3E%3C/svg%3E";
  const placeholderAssinatura = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'%3E%3Crect fill='%23F8F9FA' width='200' height='80'/%3E%3Ctext fill='rgba(0,0,0,0.4)' font-family='sans-serif' font-size='14' dy='5.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3EAssinatura%3C/text%3E%3C/svg%3E";
  
  let confirmacaoCallback = () => {};

  const modalConfirmacaoEl = document.getElementById('modalConfirmarExclusao');
  const modalConfirmacao = new bootstrap.Modal(modalConfirmacaoEl);
  const corpoModalConfirmacao = document.getElementById('corpoModalConfirmacao');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

  btnConfirmarExclusao.addEventListener('click', () => {
    if(confirmacaoCallback) confirmacaoCallback();
    modalConfirmacao.hide();
  });

  function showConfirm(message, callback) {
    corpoModalConfirmacao.textContent = message;
    confirmacaoCallback = callback;
    modalConfirmacao.show();
  }

  // Expor a função para o escopo global para que o Cypress possa stubá-la
  window.showConfirm = showConfirm;

  // Carregar dados existentes
  async function carregarConfiguracoes() {
    try {
      const config = await window.api.readData('configuracao.json');
      if (config) {
        document.getElementById('nomeOficina').value = config.nomeOficina || '';
        document.getElementById('endereco').value = config.endereco || '';
        document.getElementById('telefone').value = config.telefone || '';
        document.getElementById('email').value = config.email || '';
        document.getElementById('cnpj').value = config.cnpj || '';
        document.getElementById('nomeResponsavel').value = config.nomeResponsavel || '';
        document.getElementById('maxParcelas').value = config.maxParcelas || 12;
        document.getElementById('jurosInicial').value = config.jurosInicial || 0;
        document.getElementById('acrescimoParcela').value = config.acrescimoParcela || 0;
        document.getElementById('parcelasSemJuros').value = config.parcelasSemJuros || 0;
        if (config.logoPath) {
          logoPreview.src = config.logoPath + '?t=' + new Date().getTime();
        } else {
          logoPreview.src = placeholderLogo;
        }
        if (config.assinaturaPath) {
          assinaturaPreview.src = config.assinaturaPath + '?t=' + new Date().getTime();
        } else {
          assinaturaPreview.src = placeholderAssinatura;
        }
      }
    } catch (error) {
      console.warn('Arquivo de configuração ainda não existe. Será criado ao salvar.');
    }
  }

  // Preview da imagem do logo
  logoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        logoPreview.src = e.target.result;
      }
      reader.readAsDataURL(file);
    }
  });

  // Preview da imagem da assinatura
  assinaturaInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        assinaturaPreview.src = e.target.result;
      }
      reader.readAsDataURL(file);
    }
  });

  // Botão de excluir logo
  deleteLogoBtn.addEventListener('click', () => {
    showConfirm('Tem certeza que deseja excluir a imagem do logotipo?', () => {
      logoPreview.src = placeholderLogo;
      logoInput.value = null; // Limpa o campo de seleção de arquivo
    });
  });

  // Botão de excluir assinatura
  deleteAssinaturaBtn.addEventListener('click', () => {
    showConfirm('Tem certeza que deseja excluir a imagem da assinatura?', () => {
      assinaturaPreview.src = placeholderAssinatura;
      assinaturaInput.value = null; // Limpa o campo de seleção de arquivo
    });
  });

  // Salvar formulário
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const configData = {
      nomeOficina: document.getElementById('nomeOficina').value,
      endereco: document.getElementById('endereco').value,
      telefone: document.getElementById('telefone').value,
      email: document.getElementById('email').value,
      cnpj: document.getElementById('cnpj').value,
      nomeResponsavel: document.getElementById('nomeResponsavel').value,
      maxParcelas: document.getElementById('maxParcelas').value,
      jurosInicial: document.getElementById('jurosInicial').value,
      acrescimoParcela: document.getElementById('acrescimoParcela').value,
      parcelasSemJuros: document.getElementById('parcelasSemJuros').value,
    };

    const logoFile = logoInput.files[0];
    const assinaturaFile = assinaturaInput.files[0];
    
    try {
      const oldConfig = await lerDados('configuracao.json').catch(() => ({}));

      // Lógica para salvar/excluir logo
      if (logoFile) {
        const fileBuffer = await logoFile.arrayBuffer();
        const logoPath = await window.api.saveFile(fileBuffer, 'logo.' + logoFile.name.split('.').pop());
        if (!logoPath) throw new Error('O caminho do logo não foi retornado.');
        configData.logoPath = logoPath;
      } else if (logoPreview.src === placeholderLogo) {
        configData.logoPath = ''; // Imagem foi excluída
      } else if (oldConfig.logoPath) {
        configData.logoPath = oldConfig.logoPath; // Mantém a antiga se nenhuma nova foi enviada
      }

      // Lógica para salvar/excluir assinatura
      if (assinaturaFile) {
        const fileBuffer = await assinaturaFile.arrayBuffer();
        const assinaturaPath = await window.api.saveFile(fileBuffer, 'assinatura.' + assinaturaFile.name.split('.').pop());
        if (!assinaturaPath) throw new Error('O caminho da assinatura não foi retornado.');
        configData.assinaturaPath = assinaturaPath;
      } else if (assinaturaPreview.src === placeholderAssinatura) {
        configData.assinaturaPath = ''; // Imagem foi excluída
      } else if (oldConfig.assinaturaPath) {
        configData.assinaturaPath = oldConfig.assinaturaPath; // Mantém a antiga se nenhuma nova foi enviada
      }

      await salvarDados('configuracao.json', configData);
      showAlert('✅ Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showAlert('Erro ao salvar configurações. Verifique o console para mais detalhes (Ctrl+Shift+I).', 'danger');
    }
  });

  // Initial load
  carregarConfiguracoes();
});
