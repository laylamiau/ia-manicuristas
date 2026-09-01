const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const server = http.createServer((req, res) => {
  const filename = path.resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  if (!filename.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    res.setHeader(
      "Content-Type",
      filename.endsWith(".js")
        ? "text/javascript"
        : filename.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(fs.readFileSync(filename));
  } catch {
    res.writeHead(404).end();
  }
});

function fixture() {
  const a = "117545fa-f439-4723-bbad-a80bde548581";
  const b = "22222222-2222-4222-8222-222222222222";
  let user = null;
  let callback;
  window.calls = [];
  window.failWrite = false;
  window.noRows = false;
  const rows = {
    business_users: [
      { user_id: "user-a", business_id: a },
      { user_id: "user-b", business_id: b },
    ],
    businesses: [
      {
        id: a,
        name: "Negocio de prueba A",
        address: "Dirección de prueba",
        booking_url: "",
        tagline: "",
        schedule: "",
        instagram: "",
        tiktok: "",
        whatsapp: "",
      },
      { id: b, name: "Negocio de prueba B", address: "", booking_url: "" },
    ],
    services: [
      {
        id: "service-a",
        business_id: a,
        name: "Servicio de prueba",
        price: 12.5,
      },
    ],
    portfolio: [],
  };
  window.setTestUser = (id) => {
    user = id ? { id } : null;
    callback?.(id ? "SIGNED_IN" : "SIGNED_OUT", user ? { user } : null);
  };
  const auth = {
    getSession: async () => ({ data: { session: user ? { user } : null } }),
    getUser: async () => ({ data: { user } }),
    onAuthStateChange: (fn) => {
      callback = fn;
      return { data: { subscription: {} } };
    },
    signInWithPassword: async ({ password }) => {
      if (password !== "test-only")
        return { data: {}, error: { message: "Invalid" } };
      window.setTestUser("user-a");
      return { data: { user } };
    },
    signOut: async () => {
      window.setTestUser(null);
      return {};
    },
  };
  window.mockClient = {
    auth,
    from(table) {
      let method = "select";
      let payload;
      let single = false;
      const filters = [];
      const query = {
        select() {
          return query;
        },
        eq(key, value) {
          filters.push([key, value]);
          return query;
        },
        in(key, value) {
          filters.push([key, value]);
          return query;
        },
        order() {
          return query;
        },
        maybeSingle() {
          single = true;
          return query;
        },
        insert(value) {
          method = "insert";
          payload = value;
          return query;
        },
        update(value) {
          method = "update";
          payload = value;
          return query;
        },
        delete() {
          method = "delete";
          return query;
        },
        then(resolve, reject) {
          window.calls.push({ table, method, payload, filters });
          const execute = () => {
            if (method !== "select" && window.failWrite)
              return { data: null, error: { code: "42501" } };
            let selected = rows[table].filter((row) =>
              filters.every(([key, value]) =>
                Array.isArray(value)
                  ? value.includes(row[key])
                  : row[key] === value,
              ),
            );
            if (table === "business_users")
              selected = selected.filter((row) => row.user_id === user?.id);
            else {
              const own = rows.business_users
                .filter((row) => row.user_id === user?.id)
                .map((row) => row.business_id);
              selected = selected.filter((row) =>
                own.includes(table === "businesses" ? row.id : row.business_id),
              );
            }
            if (method !== "select" && window.noRows)
              return { data: [], error: null };
            if (method === "insert") {
              const row = { id: "new-" + crypto.randomUUID(), ...payload };
              rows[table].push(row);
              selected = [row];
            }
            if (method === "update")
              selected.forEach((row) => Object.assign(row, payload));
            if (method === "delete")
              rows[table] = rows[table].filter(
                (row) => !selected.includes(row),
              );
            return {
              data: single ? (selected[0] ?? null) : structuredClone(selected),
              error: null,
            };
          };
          return Promise.resolve().then(execute).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

(async () => {
  fs.mkdirSync(path.join(root, ".test-results"), { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || undefined,
  });
  try {
    const context = await browser.newContext();
    await context.addInitScript(fixture);
    await context.route("https://cdn.jsdelivr.net/**", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "export const createClient = () => window.mockClient;",
      }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      base + "/panel.html?business=22222222-2222-4222-8222-222222222222",
    );
    await page.locator("#loginSection").waitFor({ state: "visible" });
    assert.equal(await page.locator("#panelContent").isVisible(), false);
    await page.fill("#loginEmail", "test@example.invalid");
    await page.fill("#loginPassword", "wrong");
    await page.locator("#loginForm button").click();
    await page.waitForFunction(() =>
      document
        .getElementById("pageStatus")
        .textContent.includes("No se pudo iniciar"),
    );
    await page.fill("#loginPassword", "test-only");
    await page.locator("#loginForm button").click();
    await page.locator("#panelContent").waitFor({ state: "visible" });
    assert.equal(
      await page.inputValue("#inputBusinessName"),
      "Negocio de prueba A",
    );
    assert.match(
      await page.locator("#previewLink").getAttribute("href"),
      /117545fa/,
    );
    assert.equal(await page.inputValue("#loginPassword"), "");

    await page.fill("#inputBusinessName", "Borrador sin guardar");
    await page.fill("#serviceName", "<img src=x onerror=alert(1)>");
    await page.fill("#servicePrice", "22.75");
    await page.locator("#serviceForm button").click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#panelServices .admin-item").length === 2,
    );
    assert.equal(await page.locator("#panelServices img").count(), 0);
    assert.equal(
      await page.inputValue("#inputBusinessName"),
      "Borrador sin guardar",
    );
    const insert = await page.evaluate(() =>
      calls.find((item) => item.method === "insert"),
    );
    assert.equal(
      insert.payload.business_id,
      "117545fa-f439-4723-bbad-a80bde548581",
    );
    assert.equal(insert.payload.price, 22.75);

    await page.evaluate(() => {
      window.failWrite = true;
    });
    await page.fill("#serviceName", "Conservar tras error");
    await page.fill("#servicePrice", "9");
    await page.locator("#serviceForm button").click();
    await page.waitForFunction(() =>
      document.getElementById("pageStatus").textContent.includes("permiso"),
    );
    assert.equal(await page.inputValue("#serviceName"), "Conservar tras error");
    await page.evaluate(() => {
      window.failWrite = false;
      window.noRows = true;
    });
    await page.click("#saveBusiness");
    await page.waitForFunction(() =>
      document
        .getElementById("pageStatus")
        .textContent.includes("No se guardó"),
    );
    await page.evaluate(() => {
      window.noRows = false;
    });

    await page.fill("#inputInstagram", "javascript:alert(1)");
    await page.click("#saveBusiness");
    await page.waitForFunction(() =>
      document.getElementById("pageStatus").textContent.includes("https://"),
    );
    await page.fill("#inputInstagram", "");
    await page.click("#saveBusiness");
    await page.waitForFunction(
      () => document.getElementById("pageStatus").textContent === "",
    );
    const update = await page.evaluate(() =>
      calls.find((item) => item.method === "update"),
    );
    assert.deepEqual(update.filters, [
      ["id", "117545fa-f439-4723-bbad-a80bde548581"],
    ]);
    assert.equal("booking_url" in update.payload, false);

    await page.fill("#portfolioTitle", "Trabajo de prueba");
    await page.fill("#portfolioService", "Servicio de prueba");
    await page.fill("#portfolioNote", "Nota de prueba");
    await page.locator("#portfolioForm button").click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#panelPortfolio .admin-item").length === 1,
    );
    await page.locator("#panelPortfolio button").click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#panelPortfolio .admin-item").length === 0,
    );
    const deletion = await page.evaluate(() =>
      calls.find((item) => item.method === "delete"),
    );
    assert.ok(
      deletion.filters.some(
        ([key, value]) =>
          key === "business_id" &&
          value === "117545fa-f439-4723-bbad-a80bde548581",
      ),
    );

    await page.evaluate(() => setTestUser("user-b"));
    await page.waitForFunction(
      () =>
        document.getElementById("inputBusinessName").value ===
        "Negocio de prueba B",
    );
    assert.equal(await page.locator("#panelServices .admin-item").count(), 0);
    await page.click("#signOut");
    await page.locator("#loginSection").waitFor({ state: "visible" });
    assert.equal(await page.inputValue("#inputBusinessName"), "");
    await page.evaluate(() => setTestUser("user-without-business"));
    await page.waitForFunction(() =>
      document
        .getElementById("pageStatus")
        .textContent.includes("No hay ningún negocio"),
    );
    assert.equal(await page.locator("#panelContent").isVisible(), false);

    await page.goto(base + "/index.html?business=invalid");
    await page.waitForFunction(() =>
      document
        .getElementById("pageStatus")
        .textContent.includes("no es válido"),
    );
    await page.goto(base + "/index.html");
    await page.waitForFunction(() =>
      document
        .getElementById("pageStatus")
        .textContent.includes("no está disponible"),
    );
    await page.evaluate(() => setTestUser("user-a"));
    await page.locator("#publicContent").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#businessName").textContent(),
      "Negocio de prueba A",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: path.join(root, ".test-results/public-mobile.png"),
      fullPage: true,
    });
    await page.evaluate(() => setTestUser(null));
    await page.locator("#publicContent").waitFor({ state: "hidden" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: login, sesión, negocio derivado de usuario, CRUD, filtros, errores sin pérdida de borrador, XSS, cierre de sesión, cuenta sin negocio y miniweb móvil.",
    );
    await context.close();

    if (process.env.LIVE_SUPABASE_CHECK !== "1") return;
    const live = await browser.newPage();
    await live.goto(base + "/panel.html");
    await live
      .locator("#loginSection")
      .waitFor({ state: "visible", timeout: 30000 });
    console.log(
      "LIVE anonymous panel:",
      await live.locator("#pageStatus").textContent(),
    );
    await live.screenshot({
      path: path.join(root, ".test-results/login.png"),
      fullPage: true,
    });
    await live.goto(base + "/index.html");
    await live.waitForFunction(
      () =>
        !document
          .getElementById("pageStatus")
          .textContent.startsWith("Cargando"),
      { timeout: 30000 },
    );
    console.log(
      "LIVE anonymous miniweb:",
      await live.locator("#pageStatus").textContent(),
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  server.close();
});
