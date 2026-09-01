// Keep sections mounted so navigation preserves unfinished form entries.
const sectionNames = {
  inicio: 'Inicio',
  negocio: 'Mi negocio',
  servicios: 'Servicios y precios',
  portfolio: 'Portfolio',
  reservas: 'Reservas',
  whatsapp: 'WhatsApp',
  configuracion: 'Configuración'
};

function showSection(moveFocus = false) {
  const requested = window.location.hash.slice(1);
  // Preserve bookmarks from the original combined contact section.
  const section = requested === 'contacto' ? 'whatsapp'
    : Object.hasOwn(sectionNames, requested) ? requested : 'inicio';

  document.querySelectorAll('.panel-content > section').forEach((element) => {
    element.hidden = element.id !== section;
  });
  document.querySelectorAll('.panel-nav a').forEach((link) => {
    if (link.hash === `#${section}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.getElementById('currentSection').textContent = sectionNames[section];
  document.title = `${sectionNames[section]} — Panel IA Manicuristas`;
  if (moveFocus) document.getElementById('panelContent').focus({ preventScroll: true });
}

window.addEventListener('hashchange', () => showSection(true));
document.querySelectorAll('[data-focus]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    history.pushState(null, '', link.hash);
    showSection();
    document.getElementById(link.dataset.focus).focus();
  });
});
window.addEventListener('popstate', () => showSection(true));
showSection();

