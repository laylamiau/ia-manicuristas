const STORAGE_KEY = 'ia-manicuristas-demo-v1';

const demoData = {
  business: {
    name: 'Maura Nails — DEMO',
    tagline: 'Página de prueba. Datos no reales.',
    location: 'Ubicación DEMO',
    schedule: 'Horario DEMO',
    instagram: '',
    tiktok: '',
    whatsapp: '',
    bookingUrl: ''
  },
  services: [
    { id: crypto.randomUUID(), name: 'Servicio DEMO 1', price: 'Precio DEMO' },
    { id: crypto.randomUUID(), name: 'Servicio DEMO 2', price: 'Precio DEMO' }
  ],
  portfolio: [
    { id: crypto.randomUUID(), title: 'Diseño DEMO', service: 'Servicio DEMO', image: '', note: 'Referencia de prueba' }
  ]
};

function cloneDemoData() {
  return JSON.parse(JSON.stringify(demoData));
}

function getData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = cloneDemoData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(saved);
  } catch {
    const fallback = cloneDemoData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function whatsappUrl(number) {
  const clean = (number || '').replace(/[^\d]/g, '');
  return clean ? `https://wa.me/${clean}` : '';
}

function renderPublic() {
  const data = getData();
  const b = data.business;
  document.getElementById('businessName').textContent = b.name;
  document.getElementById('businessTagline').textContent = b.tagline;
  document.getElementById('location').textContent = b.location;
  document.getElementById('schedule').textContent = b.schedule;

  const whatsappButton = document.getElementById('whatsappButton');
  const waUrl = whatsappUrl(b.whatsapp);
  if (waUrl) {
    whatsappButton.href = waUrl;
    whatsappButton.textContent = 'Hablar por WhatsApp';
  } else {
    whatsappButton.href = '#';
    whatsappButton.textContent = 'WhatsApp · configurar en panel';
  }

  const bookingUrl = safeUrl(b.bookingUrl);
  [document.getElementById('bookingButton'), document.getElementById('bookingLink')].forEach((el) => {
    el.href = bookingUrl || '#reservas';
    if (bookingUrl) {
      el.target = '_blank';
      el.rel = 'noopener';
    }
  });
  document.getElementById('bookingLink').textContent = bookingUrl ? 'Abrir reservas' : 'Reservas · configurar en panel';

  const servicesGrid = document.getElementById('servicesGrid');
  servicesGrid.innerHTML = data.services.length ? data.services.map(service => `
    <article class="service-card">
      <span class="demo-badge">DEMO</span>
      <h3>${escapeHtml(service.name)}</h3>
      <div class="service-price">${escapeHtml(service.price)}</div>
    </article>`).join('') : '<p class="muted">Todavía no hay servicios configurados.</p>';

  const portfolioGrid = document.getElementById('portfolioGrid');
  portfolioGrid.innerHTML = data.portfolio.length ? data.portfolio.map(item => {
    const image = safeUrl(item.image);
    return `<article class="portfolio-card">
      ${image ? `<img src="${image}" alt="${escapeHtml(item.title)}" />` : '<div class="portfolio-placeholder">✦</div>'}
      <div class="portfolio-card__body">
        <span class="demo-badge">DEMO</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.service)}</p>
        <small class="muted">${escapeHtml(item.note || '')}</small>
      </div>
    </article>`;
  }).join('') : '<p class="muted">Todavía no hay trabajos en el portfolio.</p>';

  const socialLinks = document.getElementById('socialLinks');
  const socials = [
    ['Instagram', safeUrl(b.instagram)],
    ['TikTok', safeUrl(b.tiktok)]
  ].filter(([, url]) => url);
  socialLinks.innerHTML = socials.length
    ? socials.map(([name, url]) => `<a class="button button--secondary" target="_blank" rel="noopener" href="${url}">${name}</a>`).join('')
    : '<span class="muted">Redes todavía no configuradas.</span>';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove('is-visible'), 1800);
}

function renderPanel() {
  const data = getData();
  const b = data.business;
  document.getElementById('inputBusinessName').value = b.name;
  document.getElementById('inputTagline').value = b.tagline;
  document.getElementById('inputLocation').value = b.location;
  document.getElementById('inputSchedule').value = b.schedule;
  document.getElementById('inputInstagram').value = b.instagram;
  document.getElementById('inputTiktok').value = b.tiktok;
  document.getElementById('inputWhatsapp').value = b.whatsapp;
  document.getElementById('inputBooking').value = b.bookingUrl;

  document.getElementById('panelServices').innerHTML = data.services.length ? data.services.map(service => `
    <div class="admin-item">
      <div><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(service.price)}</small></div>
      <button class="icon-button" data-delete-service="${service.id}" type="button">Eliminar</button>
    </div>`).join('') : '<p class="muted">No hay servicios.</p>';

  document.getElementById('panelPortfolio').innerHTML = data.portfolio.length ? data.portfolio.map(item => `
    <div class="admin-item">
      <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.service)} · ${escapeHtml(item.note || '')}</small></div>
      <button class="icon-button" data-delete-portfolio="${item.id}" type="button">Eliminar</button>
    </div>`).join('') : '<p class="muted">No hay trabajos.</p>';
}

function initPanel() {
  renderPanel();

  document.getElementById('saveBusiness').addEventListener('click', () => {
    const data = getData();
    data.business.name = document.getElementById('inputBusinessName').value.trim() || 'Negocio DEMO';
    data.business.tagline = document.getElementById('inputTagline').value.trim();
    data.business.location = document.getElementById('inputLocation').value.trim() || 'Ubicación DEMO';
    data.business.schedule = document.getElementById('inputSchedule').value.trim() || 'Horario DEMO';
    data.business.instagram = document.getElementById('inputInstagram').value.trim();
    data.business.tiktok = document.getElementById('inputTiktok').value.trim();
    saveData(data);
    toast('Negocio guardado');
  });

  document.getElementById('saveContact').addEventListener('click', () => {
    const data = getData();
    data.business.whatsapp = document.getElementById('inputWhatsapp').value.trim();
    data.business.bookingUrl = document.getElementById('inputBooking').value.trim();
    saveData(data);
    toast('Contacto guardado');
  });

  document.getElementById('serviceForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = getData();
    data.services.push({
      id: crypto.randomUUID(),
      name: document.getElementById('serviceName').value.trim(),
      price: document.getElementById('servicePrice').value.trim()
    });
    saveData(data);
    event.target.reset();
    renderPanel();
    toast('Servicio añadido');
  });

  document.getElementById('portfolioForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = getData();
    data.portfolio.push({
      id: crypto.randomUUID(),
      title: document.getElementById('portfolioTitle').value.trim(),
      service: document.getElementById('portfolioService').value.trim(),
      image: document.getElementById('portfolioImage').value.trim(),
      note: document.getElementById('portfolioNote').value.trim()
    });
    saveData(data);
    event.target.reset();
    renderPanel();
    toast('Trabajo añadido');
  });

  document.addEventListener('click', (event) => {
    const serviceId = event.target.dataset.deleteService;
    const portfolioId = event.target.dataset.deletePortfolio;
    if (serviceId) {
      const data = getData();
      data.services = data.services.filter(item => item.id !== serviceId);
      saveData(data);
      renderPanel();
      toast('Servicio eliminado');
    }
    if (portfolioId) {
      const data = getData();
      data.portfolio = data.portfolio.filter(item => item.id !== portfolioId);
      saveData(data);
      renderPanel();
      toast('Trabajo eliminado');
    }
  });

  document.getElementById('resetDemo').addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloneDemoData()));
    renderPanel();
    toast('DEMO restablecida');
  });
}

const page = document.body.dataset.page;
if (page === 'public') renderPublic();
if (page === 'panel') initPanel();
