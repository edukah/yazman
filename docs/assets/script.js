function toggleMode () {
  const body = document.body;
  const switchButton = document.querySelector('.mode-toggle-switch');

  if (body.classList.contains('dark-mode')) {
    body.classList.remove('dark-mode');
    switchButton.classList.remove('active');
    sessionStorage.removeItem('dark-mode');
  } else {
    body.classList.add('dark-mode');
    switchButton.classList.add('active');
    sessionStorage.setItem('dark-mode', '1');
  }
}

// Restore dark mode state
if (sessionStorage.getItem('dark-mode')) {
  document.body.classList.add('dark-mode');
  document.querySelector('.mode-toggle-switch')?.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('currentYear')) {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
  }
});
