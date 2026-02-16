/* Scripts globais da aplicação (ex: sidebar) */

/* Scripts globais da aplicação (ex: sidebar) */

document.addEventListener('DOMContentLoaded', async () => {
  // Check Login Status
  if (window.api && window.api.getCurrentUser) {
    const user = await window.api.getCurrentUser();
    if (!user) {
      // Not logged in? Redirect to login if checking from a protected page
      // But main process should have handled this.
      // If we are here, we might need to display user info.
      console.warn("Nenhum usuário logado detectado.");
      // window.location.href = 'login.html'; // Optional safety
    } else {
      console.log("Usuário:", user.username, user.role);
      applyPermissions(user);
      setupLogout();
    }
  }

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return; // Don't run if sidebar isn't on the page

  const toggleBtn = document.getElementById('sidebar-toggle');
  const toggleIcon = toggleBtn.querySelector('i');
  const navbarBrand = document.querySelector('.sidebar-header .navbar-brand');

  function updateSidebar() {
    const isCollapsed = sidebar.classList.contains('collapsed');
    if (isCollapsed) {
      toggleIcon.classList.remove('bi-x-lg');
      toggleIcon.classList.add('bi-list');
    } else {
      toggleIcon.classList.remove('bi-list');
      toggleIcon.classList.add('bi-x-lg');
    }
  }

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    updateSidebar();
  });

  navbarBrand.addEventListener('click', (e) => {
    if (sidebar.classList.contains('collapsed')) {
      e.preventDefault();
      sidebar.classList.remove('collapsed');
      updateSidebar();
    }
  });

  // Set initial state in case it starts collapsed
  updateSidebar();

  // Initialize custom tooltips
  setupSidebarTooltips();

  // Initialize Custom Title Bar (Win 10 Fix)
  setupTitleBar();

  // Update App Version Display
  if (window.api && window.api.getAppVersion) {
    try {
      const version = await window.api.getAppVersion();

      // 1. Update element with specific ID (Login page)
      const versionEl = document.getElementById('app-version');
      if (versionEl) {
        versionEl.textContent = `Versão ${version}`;
      }

      // 2. Update Sidebar (Footer)
      // Structure: .sidebar-footer .small p:first-child
      const sidebarFooterText = document.querySelector('.sidebar-footer .small p:first-child');
      if (sidebarFooterText) {
        // Check if it currently says "Versão Beta" or similar to avoid overwriting wrong p
        if (sidebarFooterText.textContent.includes('Versão')) {
          sidebarFooterText.textContent = `Versão ${version}`;
        }
      }
    } catch (err) {
      console.error("Failed to get app version:", err);
    }
  }
});

function setupTitleBar() {
  // 1. Inject CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'public/css/titlebar.css';
  document.head.appendChild(link);

  // 2. Wrap existing content in #app-container if not already
  if (!document.getElementById('app-container')) {
    const bodyContent = Array.from(document.body.childNodes);
    const appContainer = document.createElement('div');
    appContainer.id = 'app-container';

    // Remove script tags from "moving" to avoid re-execution if they are in body?
    // Actually scripts in body might re-run if moved.
    // Safer: Insert Titlebar at top, and wrap everything else?
    // Or just prepend titlebar and use fixed positioning?
    // "main.css" defines #sidebar as sticky.
    // Let's go with a fixed overlay titlebar? No, it pushes content.

    // Better strategy: Create the container, move everything inside it.
    // BUT: Scripts (main.js itself) might be in body.

    // Let's just Prepend the titlebar and let CSS handle the rest?
    // If we want rounded corners on the WHOLE app, we need a wrapper.

    // Let's create the wrapper structure:
    /*
      <div id="app-container">
         <div class="custom-titlebar">...</div>
         <div class="app-content-wrapper">
            [Existing Body Content like .d-flex]
         </div>
      </div>
    */

    // However, moving DOM nodes can break event listeners attached to them (if not delegated).
    // SetupSidebarTooltips delegates to sidebar.
    // Main.js listeners are attached to elements found by ID. If we move them, the references held in variables (toggleBtn) might still be valid, but DOM position changes.

    // Let's try to be less invasive:
    // 1. Add class 'win10-rounded' to body.
    // 2. Prepend Titlebar.
    // 3. Adjust CSS to account for Titlebar height in body padding or margins.
  }

  // Actually, the user wants rounded corners. 
  // Electron transparent window + rounded body is the key.
  // We MUST wrap the content to clip it.

  // Implementation:
  // Create Titlebar
  const titlebar = document.createElement('div');
  titlebar.className = 'custom-titlebar';
  titlebar.innerHTML = `
    <div class="window-title">
        <i class="bi bi-tools me-2"></i> Oficina Mecânica - Sistema
    </div>
    <div class="window-controls">
        <div class="control" id="min-btn"><i class="bi bi-dash"></i></div>
        <div class="control" id="max-btn"><i class="bi bi-square"></i></div>
        <div class="control close-btn" id="close-btn"><i class="bi bi-x-lg"></i></div>
    </div>
  `;

  // We need to put everything currently in body into a new wrapper, EXCEPT scripts?
  // Use a simple approach: 
  // document.body.classList.add('custom-frame');
  // document.body.prepend(titlebar);

  // Check if we can just set body border-radius? 
  // If we set body { overflow: hidden; border-radius: 10px; background: white; height: 100vh; display:flex; flexDirection: column; }
  // And titlebar is first child.
  // The rest of content (e.g. .d-flex) needs to flex-grow.

  document.body.classList.add('has-custom-titlebar');
  document.body.insertBefore(titlebar, document.body.firstChild);

  // Wire events
  document.getElementById('min-btn').addEventListener('click', () => window.api.minimizeApp());
  document.getElementById('max-btn').addEventListener('click', () => window.api.maximizeApp());
  document.getElementById('close-btn').addEventListener('click', () => window.api.closeApp());
}

function applyPermissions(user) {
  // Hide sidebar items based on role
  // Role: mecanico -> Hide Financeiro, Dashboards, Configs?
  // Role: financeiro -> Hide Configs?

  // We need to identify sidebar items. Ideally they have IDs or data attributes.
  // Since they might not, we might need to rely on text content or hrefs.
  // Let's assume we will add data-role attributes to sidebar items in index.html soon.
  // Or we filter by href.

  const role = user.role;
  const sidebarItems = document.querySelectorAll('#sidebar .nav-link');

  const rules = {
    'admin': [], // Hide nothing
    'financeiro': ['configuracoes.html'], // Hide Configs
    'mecanico': ['historico-servicos.html', 'gerenciar-pagamentos.html', 'gerenciar-orcamentos.html', 'despesas.html', 'receitas-avulsas.html', 'configuracoes.html']
    // Mechanic sees: Clientes, Veiculos, Manual OS, Gerenciar Servicos (Maybe restricted view)
  };

  const hiddenPages = rules[role] || [];

  sidebarItems.forEach(item => {
    const href = item.getAttribute('href');
    if (hiddenPages.includes(href)) {
      item.parentElement.style.display = 'none';
    }
  });

  // Special case: "Gerenciar Orçamentos" - Mechanics might need to create budgets?
  // User said: Mechanic = "Orçamentos e OS: Criar/Editar (Técnico)".
  // So distinct from "Financeiro".
  // Let's refine based on user table:
  /*
  Mecânico:
  - Orçamentos e OS (Sim)
  - Clientes e Veículos (Sim)
  - Financeiro (Não) -> Despesas, Receitas, Pagamentos
  - Dashboard (Não) -> Historico
  - Config (Não)
  */

  if (role === 'mecanico') {
    // Hide Financeiro items
    hideSidebarItem('despesas.html');
    hideSidebarItem('receitas-avulsas.html');
    hideSidebarItem('gerenciar-pagamentos.html');
    hideSidebarItem('historico-servicos.html'); // This is the Dashboard
    hideSidebarItem('configuracoes.html');
  } else if (role === 'financeiro') {
    hideSidebarItem('configuracoes.html');
  }

  // Also apply to Dashboard Cards (if on index.html)
  // Cards are wrapped in <a href="...">
  const dashboardLinks = document.querySelectorAll('.card').length > 0 ? document.querySelectorAll('main a[href]') : [];
  dashboardLinks.forEach(link => {
    const href = link.getAttribute('href');
    // Use the generic logic first
    if (hiddenPages.includes(href)) {
      link.parentElement.style.display = 'none'; // The column (col-md-6) is usually the parent of the <a> wrapper or the <a> itself wraps the card
      // Bootstrap grid: <div class="col..."><a href...><div class="card"...></a></div>
      // So we should hide the col parent if possible, or just the link.
      // Let's hide the closest column div to avoid layout gaps
      const col = link.closest('.col-md-6, .col-lg-3');
      if (col) col.style.display = 'none';
      else link.style.display = 'none';
    }

    // Specific logic for Mecanico/Financeiro if generic list missed anything
    if (role === 'mecanico') {
      if (['despesas.html', 'receitas-avulsas.html', 'gerenciar-pagamentos.html', 'historico-servicos.html', 'configuracoes.html'].includes(href)) {
        const col = link.closest('.col-md-6, .col-lg-3');
        if (col) col.style.display = 'none';
      }
    } else if (role === 'financeiro') {
      if (href === 'configuracoes.html') {
        const col = link.closest('.col-md-6, .col-lg-3');
        if (col) col.style.display = 'none';
      }
    }
  });

  // Display User Name
  // Create an element if not exists or update existing
}

function hideSidebarItem(href) {
  const item = document.querySelector(`#sidebar-nav .nav-link[href="${href}"]`);
  if (item) item.parentElement.style.display = 'none';
}

function setupLogout() {
  // Add logout button if not exists
  // Maybe append to sidebar footer or top
  const sidebar = document.getElementById('sidebar');
  // Check if logout btn exists
  if (!document.getElementById('logout-btn')) {
    const logoutDiv = document.createElement('div');
    logoutDiv.className = 'mt-auto p-3 border-top border-secondary';
    logoutDiv.innerHTML = `
            <button id="logout-btn" class="btn btn-outline-light w-100">
                <i class="bi bi-box-arrow-left me-2"></i> Sair
            </button>
        `;
    sidebar.appendChild(logoutDiv);

    document.getElementById('logout-btn').addEventListener('click', () => {
      showConfirm('Deseja realmente sair?', async () => {
        await window.api.logout();
        // Backend handles navigation to login.html to ensure clean state
      }, 'Sair do Sistema');
    });
  }
}

function setupSidebarTooltips() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Create tooltip element if not exists
  let tooltip = document.getElementById('sidebar-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'sidebar-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '0.9rem';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.pointerEvents = 'none'; // Passthrough clicks
    tooltip.style.zIndex = '9999';
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.2s';
    tooltip.style.display = 'none'; // Start hidden

    // Add arrow
    const arrow = document.createElement('div');
    arrow.style.position = 'absolute';
    arrow.style.left = '-5px';
    arrow.style.top = '50%';
    arrow.style.transform = 'translateY(-50%)';
    arrow.style.borderWidth = '5px 5px 5px 0';
    arrow.style.borderStyle = 'solid';
    arrow.style.borderColor = 'transparent #333 transparent transparent';
    tooltip.appendChild(arrow);

    document.body.appendChild(tooltip);
  }

  // Delegate events
  sidebar.addEventListener('mouseover', (e) => {
    // Only if collapsed
    if (!sidebar.classList.contains('collapsed')) return;

    const link = e.target.closest('.nav-link');
    if (!link) return;

    // Get text content (from the hidden span)
    const span = link.querySelector('span');
    if (!span) return;
    const text = span.textContent.trim();
    if (!text) return;

    // Show tooltip
    tooltip.firstChild.nodeValue = text; // Update text (keeping arrow element which is child 1 if appended last? wait, arrow is child)
    // Safer way to set text without killing arrow:
    // Actually, let's just use innerText and re-add arrow or use separate span inside tooltip
    // Simpler: Tooltip structure <div>Text <div arrow></div></div>

    // reset content
    tooltip.innerHTML = text;

    // Re-create arrow since innerHTML wiped it
    const arrow = document.createElement('div');
    arrow.style.position = 'absolute';
    arrow.style.left = '-5px';
    arrow.style.top = '50%';
    arrow.style.transform = 'translateY(-50%)';
    arrow.style.borderWidth = '5px 5px 5px 0';
    arrow.style.borderStyle = 'solid';
    arrow.style.borderColor = 'transparent #333 transparent transparent';
    tooltip.appendChild(arrow);

    const rect = link.getBoundingClientRect();

    // Position
    tooltip.style.display = 'block';
    // Force layout to get correct dim if needed, but display block is enough

    // Position: Right of the link item
    tooltip.style.left = (rect.right + 10) + 'px';
    tooltip.style.top = (rect.top + (rect.height / 2) - (tooltip.offsetHeight / 2)) + 'px';

    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
    });
  });

  sidebar.addEventListener('mouseout', (e) => {
    const link = e.target.closest('.nav-link');
    if (link) {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        if (tooltip.style.opacity === '0') tooltip.style.display = 'none';
      }, 200);
    }
  });

  // Hide on scroll
  sidebar.addEventListener('scroll', () => {
    tooltip.style.opacity = '0';
    tooltip.style.display = 'none';
  });
}