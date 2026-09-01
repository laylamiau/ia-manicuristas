import { DEMO_BUSINESS_ID } from "./supabase-client.js";

function formatPrice(price) {
  return price == null
    ? "Consultar precio"
    : new Intl.NumberFormat("es", { maximumFractionDigits: 2 }).format(price);
}

export function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function whatsappUrl(number) {
  const clean = (number || "").replace(/[^\d]/g, "");
  return clean ? `https://wa.me/${clean}` : "";
}

export function renderPublic(data) {
  const b = data.business;
  document.getElementById("businessName").textContent = b.name;
  document.getElementById("businessTagline").textContent = b.tagline;
  document.getElementById("location").textContent =
    b.location || "Ubicación pendiente de configurar";
  document.getElementById("schedule").textContent =
    b.schedule || "Horario pendiente de configurar";

  const whatsappButton = document.getElementById("whatsappButton");
  const waUrl = whatsappUrl(b.whatsapp);
  if (waUrl) {
    whatsappButton.href = waUrl;
    whatsappButton.textContent = "Hablar por WhatsApp";
  } else {
    whatsappButton.href = "#";
    whatsappButton.textContent = "WhatsApp no disponible";
  }

  const bookingUrl = safeUrl(b.bookingUrl);
  [
    document.getElementById("bookingButton"),
    document.getElementById("bookingLink"),
  ].forEach((el) => {
    el.removeAttribute("target");
    el.removeAttribute("rel");
    el.href = bookingUrl || "#reservas";
    if (bookingUrl) {
      el.target = "_blank";
      el.rel = "noopener";
    }
  });
  document.getElementById("bookingLink").textContent = bookingUrl
    ? "Abrir reservas"
    : "Reservas no disponibles";

  const servicesGrid = document.getElementById("servicesGrid");
  servicesGrid.innerHTML = data.services.length
    ? data.services
        .map(
          (service) => `
    <article class="service-card">
      ${b.id === DEMO_BUSINESS_ID ? '<span class="demo-badge">DEMO</span>' : ""}
      <h3>${escapeHtml(service.name)}</h3>
      <div class="service-price">${escapeHtml(formatPrice(service.price))}</div>
    </article>`,
        )
        .join("")
    : '<p class="muted">Todavía no hay servicios configurados.</p>';

  const portfolioGrid = document.getElementById("portfolioGrid");
  portfolioGrid.innerHTML = data.portfolio.length
    ? data.portfolio
        .map((item) => {
          const image = safeUrl(item.image);
          return `<article class="portfolio-card">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" />` : '<div class="portfolio-placeholder">✦</div>'}
      <div class="portfolio-card__body">
        ${b.id === DEMO_BUSINESS_ID ? '<span class="demo-badge">DEMO</span>' : ""}
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.service)}</p>
        <small class="muted">${escapeHtml(item.note || "")}</small>
      </div>
    </article>`;
        })
        .join("")
    : '<p class="muted">Todavía no hay trabajos en el portfolio.</p>';

  const socialLinks = document.getElementById("socialLinks");
  const socials = [
    ["Instagram", safeUrl(b.instagram)],
    ["TikTok", safeUrl(b.tiktok)],
  ].filter(([, url]) => url);
  socialLinks.innerHTML = socials.length
    ? socials
        .map(
          ([name, url]) =>
            `<a class="button button--secondary" target="_blank" rel="noopener" href="${escapeHtml(url)}">${name}</a>`,
        )
        .join("")
    : '<span class="muted">Redes todavía no configuradas.</span>';
}

export function escapeHtml(value = "") {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
}

export function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(
    () => el.classList.remove("is-visible"),
    1800,
  );
}

export function renderPanel(data) {
  const b = data.business;
  document.getElementById("inputBusinessName").value = b.name;
  document.getElementById("inputTagline").value = b.tagline;
  document.getElementById("inputLocation").value = b.location;
  document.getElementById("inputSchedule").value = b.schedule;
  document.getElementById("inputInstagram").value = b.instagram;
  document.getElementById("inputTiktok").value = b.tiktok;
  document.getElementById("inputWhatsapp").value = b.whatsapp;
  document.getElementById("inputBooking").value = b.bookingUrl;

  renderPanelLists(data);
}

export function renderPanelLists(data) {
  document.getElementById("panelServices").innerHTML = data.services.length
    ? data.services
        .map(
          (service) => `
    <div class="admin-item">
      <div><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(formatPrice(service.price))}</small></div>
      <button class="icon-button" data-delete-service="${escapeHtml(service.id)}" type="button">Eliminar</button>
    </div>`,
        )
        .join("")
    : '<p class="muted">No hay servicios.</p>';

  document.getElementById("panelPortfolio").innerHTML = data.portfolio.length
    ? data.portfolio
        .map(
          (item) => `
    <div class="admin-item">
      <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.service)} · ${escapeHtml(item.note || "")}</small></div>
      <button class="icon-button" data-delete-portfolio="${escapeHtml(item.id)}" type="button">Eliminar</button>
    </div>`,
        )
        .join("")
    : '<p class="muted">No hay trabajos.</p>';
}
