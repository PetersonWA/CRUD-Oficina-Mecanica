/* Scripts globais da aplicação (ex: sidebar) */

document.addEventListener('DOMContentLoaded', () => {
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
});