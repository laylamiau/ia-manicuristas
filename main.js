import { DEMO_BUSINESS_ID, getClient } from "./supabase-client.js";
import { validateImage } from "./portfolio-storage.js";
import {
  getData,
  getMemberships,
  updateBusiness,
  addService,
  addPortfolio,
  deleteItem,
} from "./data.js";
import {
  renderPublic,
  renderPanel,
  renderPanelLists,
  safeUrl,
  toast,
} from "./app.js";

const $ = (id) => document.getElementById(id);
const isPanel = document.body.dataset.page === "panel";
let currentUserId = null;
let currentBusinessId = null;
let currentData = null;
let generation = 0;
let busy = false;
let previewUrl = null;
let previewVersion = 0;

function clearImagePreview() {
  ++previewVersion;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  $("portfolioPreview").removeAttribute("src");
  $("portfolioPreview").hidden = true;
  $("portfolioFile").setCustomValidity("");
  $("portfolioImageStatus").textContent = "";
}

async function previewImage() {
  clearImagePreview();
  const version = previewVersion;
  const input = $("portfolioFile");
  const file = input.files[0];
  if (!file) return;
  try {
    validateImage(file);
    input.setCustomValidity("Espera a que termine la previsualización.");
    previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = previewUrl;
    await image.decode();
    if (version !== previewVersion) return;
    $("portfolioPreview").src = previewUrl;
    $("portfolioPreview").hidden = false;
    input.setCustomValidity("");
    $("portfolioImageStatus").textContent =
      `${file.name} · Lista para subir al guardar.`;
  } catch (error) {
    if (version !== previewVersion) return;
    clearImagePreview();
    const message =
      error instanceof DOMException
        ? "No se puede abrir esta imagen. Elige otro archivo."
        : error.message;
    input.setCustomValidity(message);
    $("portfolioImageStatus").textContent = message;
  }
}

function status(message, retry = false) {
  $("pageStatus").textContent = message;
  $("retryLoad").hidden = !retry;
}

function clearPanel() {
  clearImagePreview();
  currentBusinessId = null;
  currentData = null;
  $("panelContent").hidden = true;
  $("previewLink").hidden = true;
  $("businessChooser").hidden = true;
  $("businessChoices").replaceChildren();
  $("panelContent")
    .querySelectorAll("input")
    .forEach((input) => {
      input.value = "";
    });
  $("panelServices").replaceChildren();
  $("panelPortfolio").replaceChildren();
  $("toast").classList.remove("is-visible");
}

async function loadBusiness(businessId, expectedGeneration) {
  status("Cargando tu negocio…");
  const data = await getData(businessId);
  if (expectedGeneration !== generation) return;
  currentBusinessId = businessId;
  currentData = data;
  renderPanel(data);
  $("businessChooser").hidden = true;
  $("panelContent").hidden = false;
  $("previewLink").href =
    `index.html?business=${encodeURIComponent(businessId)}`;
  $("previewLink").hidden = false;
  status("");
}

async function refreshPanel(user) {
  const expectedGeneration = ++generation;
  currentUserId = user?.id ?? null;
  clearPanel();
  $("loginSection").hidden = Boolean(user);
  $("signOut").hidden = !user;
  if (!user) {
    status("Inicia sesión para gestionar tu negocio.");
    return;
  }

  status("Buscando tus negocios…");
  try {
    const businesses = await getMemberships(user.id);
    if (expectedGeneration !== generation) return;
    if (!businesses.length) {
      status(
        "No hay ningún negocio accesible asociado a tu cuenta. Contacta con quien administra la web.",
        true,
      );
      return;
    }
    if (businesses.length === 1) {
      await loadBusiness(businesses[0].id, expectedGeneration);
      return;
    }

    for (const business of businesses) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button--secondary";
      button.textContent = business.name;
      button.addEventListener("click", async () => {
        const buttons = $("businessChoices").querySelectorAll("button");
        buttons.forEach((item) => {
          item.disabled = true;
        });
        try {
          await loadBusiness(business.id, expectedGeneration);
        } catch (error) {
          if (expectedGeneration === generation) status(error.message, true);
        } finally {
          buttons.forEach((item) => {
            item.disabled = false;
          });
        }
      });
      $("businessChoices").append(button);
    }
    $("businessChooser").hidden = false;
    status("Selecciona el negocio que quieres gestionar.");
  } catch (error) {
    if (expectedGeneration === generation) status(error.message, true);
  }
}

function value(id) {
  return $(id).value.trim();
}

function required(id, label) {
  const text = value(id);
  if (!text) throw new Error(`Completa el campo ${label}.`);
  return text;
}

function urlValue(id, label) {
  const text = value(id);
  if (text && !safeUrl(text))
    throw new Error(
      `${label} debe ser una dirección que empiece por https:// o http://.`,
    );
  return text;
}

async function mutate(operation, applyResult, message) {
  if (busy || !currentUserId || !currentBusinessId) return;
  busy = true;
  const expectedGeneration = generation;
  const context = { userId: currentUserId, businessId: currentBusinessId };
  const controls = [...$("panelContent").querySelectorAll("button, input")];
  controls.forEach((control) => {
    control.disabled = true;
  });
  status("Guardando…");
  try {
    const result = await operation(context);
    if (expectedGeneration !== generation) return;
    applyResult(result);
    status("");
    toast(message);
  } catch (error) {
    if (expectedGeneration === generation) status(error.message);
  } finally {
    busy = false;
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function bindPanel() {
  $("portfolioFile").addEventListener("change", previewImage);
  $("saveBusiness").addEventListener("click", () =>
    mutate(
      (context) =>
        updateBusiness(context, {
          name: required("inputBusinessName", "nombre"),
          tagline: value("inputTagline"),
          location: value("inputLocation"),
          schedule: value("inputSchedule"),
          instagram: urlValue("inputInstagram", "Instagram"),
          tiktok: urlValue("inputTiktok", "TikTok"),
        }),
      (business) => {
        currentData.business = business;
      },
      "Negocio guardado",
    ),
  );

  $("saveContact").addEventListener("click", () =>
    mutate(
      (context) =>
        updateBusiness(context, {
          whatsapp: value("inputWhatsapp"),
          bookingUrl: urlValue("inputBooking", "El enlace de reservas"),
        }),
      (business) => {
        currentData.business = business;
      },
      "Contacto guardado",
    ),
  );

  $("serviceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    mutate(
      (context) => {
        const text = required("servicePrice", "precio");
        const price = Number(text);
        if (!Number.isFinite(price) || price < 0)
          throw new Error(
            "Introduce un precio válido, igual o mayor que cero.",
          );
        return addService(context, {
          name: required("serviceName", "servicio"),
          price,
        });
      },
      (service) => {
        currentData.services.push(service);
        $("serviceForm").reset();
        renderPanelLists(currentData);
      },
      "Servicio añadido",
    );
  });

  $("portfolioForm").addEventListener("submit", (event) => {
    event.preventDefault();
    mutate(
      (context) =>
        addPortfolio(context, {
          title: required("portfolioTitle", "título"),
          service: required("portfolioService", "servicio"),
          file: $("portfolioFile").files[0],
          image: $("portfolioFile").files.length
            ? ""
            : urlValue("portfolioImage", "La imagen"),
          note: value("portfolioNote"),
        }),
      (item) => {
        currentData.portfolio.push(item);
        $("portfolioForm").reset();
        clearImagePreview();
        renderPanelLists(currentData);
      },
      "Trabajo añadido",
    );
  });

  $("panelContent").addEventListener("click", (event) => {
    const button = event.target.closest(
      "button[data-delete-service], button[data-delete-portfolio]",
    );
    if (!button) return;
    const table = button.dataset.deleteService ? "services" : "portfolio";
    const id = button.dataset.deleteService || button.dataset.deletePortfolio;
    mutate(
      (context) => deleteItem(context, table, id),
      () => {
        currentData[table] = currentData[table].filter(
          (item) => item.id !== id,
        );
        renderPanelLists(currentData);
      },
      table === "services" ? "Servicio eliminado" : "Trabajo eliminado",
    );
  });

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    status("Iniciando sesión…");
    try {
      const client = await getClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: value("loginEmail"),
        password: $("loginPassword").value,
      });
      if (error)
        throw new Error(
          "No se pudo iniciar sesión. Comprueba tu correo, contraseña y conexión.",
        );
      $("loginPassword").value = "";
      // El evento de Auth carga el panel; no se guardan credenciales propias.
      if (!data.user) throw new Error("No se pudo verificar tu sesión.");
    } catch (error) {
      status(error.message);
    } finally {
      button.disabled = false;
    }
  });

  $("signOut").addEventListener("click", async () => {
    $("signOut").disabled = true;
    ++generation;
    clearPanel();
    status("Cerrando sesión…");
    try {
      const client = await getClient();
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error)
        throw new Error("No se pudo cerrar sesión. Vuelve a intentarlo.");
      $("loginForm").reset();
      await refreshPanel(null);
    } catch (error) {
      status(error.message, true);
    } finally {
      $("signOut").disabled = false;
    }
  });
}

async function refreshPublic() {
  const expectedGeneration = ++generation;
  $("publicContent").hidden = true;
  $("publicHero").hidden = true;
  status("Cargando miniweb…");
  const businessId =
    new URLSearchParams(location.search).get("business") ?? DEMO_BUSINESS_ID;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(businessId)) {
    status("El enlace del negocio no es válido.");
    return;
  }
  try {
    const data = await getData(businessId);
    if (expectedGeneration !== generation) return;
    renderPublic(data);
    document.title = data.business.name;
    document.querySelectorAll("[data-demo-only]").forEach((element) => {
      element.hidden = businessId !== DEMO_BUSINESS_ID;
    });
    $("publicContent").hidden = false;
    $("publicHero").hidden = false;
    status("");
  } catch (error) {
    if (expectedGeneration === generation) status(error.message, true);
  }
}

let subscribed = false;
async function start() {
  try {
    const client = await getClient();
    if (!subscribed) {
      client.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
        const userId = session?.user?.id ?? null;
        if (isPanel && userId === currentUserId) return;
        // Invalidar inmediatamente respuestas anteriores y diferir las consultas
        // hasta que finalice el callback síncrono de Supabase Auth.
        ++generation;
        if (isPanel) clearPanel();
        else {
          $("publicContent").hidden = true;
          $("publicHero").hidden = true;
        }
        setTimeout(() => {
          if (isPanel) refreshPanel(session?.user ?? null);
          else refreshPublic();
        }, 0);
      });
      subscribed = true;
    }
    const { data, error } = await client.auth.getSession();
    if (error)
      throw new Error("No se pudo recuperar tu sesión. Vuelve a intentarlo.");
    if (isPanel) await refreshPanel(data.session?.user ?? null);
    else await refreshPublic();
  } catch (error) {
    status(error.message, true);
    if (isPanel) $("loginSection").hidden = false;
  }
}

if (isPanel) bindPanel();
$("retryLoad").addEventListener("click", start);
start();
