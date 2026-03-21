function toggleMode () {
  if (document.body.classList.contains('dark-mode')) {
    document.body.classList.remove('dark-mode');
    sessionStorage.removeItem('dark-mode');
  } else {
    document.body.classList.add('dark-mode');
    sessionStorage.setItem('dark-mode', '1');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('currentYear')) {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
  }

  const currentPage = new URL(globalThis.location.href).pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('nav a, .bottom-tab a').forEach(a => {
    const linkPage = new URL(a.href, globalThis.location.href).pathname.split('/').pop();
    if (linkPage === currentPage) {
      a.classList.add('active');
    }
  });
});
