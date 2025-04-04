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
});
