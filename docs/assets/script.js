function toggleMode () {
  const body = document.body;
  const switchButton = document.querySelector('.mode-toggle-switch');

  if (body.classList.contains('dark-mode')) {
    body.classList.remove('dark-mode');
    switchButton.classList.remove('active');
  } else {
    body.classList.add('dark-mode');
    switchButton.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('currentYear')) {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
  }
});
