# IA Manicuristas — MVP

Miniweb y panel profesional existentes, conectados a Supabase con JavaScript
nativo. Se conservan la estructura HTML y el diseño; no requiere compilación.

## Activación

1. Ejecuta `supabase/001_connect_existing_web.sql` en Supabase SQL Editor.
   Añade `businesses.booking_url` y `portfolio.service`, sin borrar datos.
   También permite que cada usuario autenticado lea sus propias asociaciones en
   `business_users`: faltaba esa política en el esquema revisado.
2. Sirve estos archivos por HTTP/HTTPS, por ejemplo con `python -m http.server 8000`.
   Abre `http://localhost:8000/panel.html`. No abras los HTML mediante `file://`,
   porque la web usa módulos JavaScript.
3. Inicia sesión con el correo y contraseña de la cuenta ya creada en Supabase.
   El usuario DEMO ya está asociado a su negocio; no hay credenciales incrustadas.
4. Guarda un cambio y abre «Ver miniweb». El enlace incluye `?business=<uuid>`.
   Ese parámetro selecciona la miniweb; nunca concede acceso al panel.

La configuración pública está en `supabase-client.js`. La biblioteca oficial de
Supabase se carga desde jsDelivr con una versión fija. No hay claves secretas ni
`service_role`. El despliegue estático necesita acceso a ese CDN y a Supabase.

## Acceso y lectura pública

El panel obtiene el usuario de Supabase Auth y consulta sus asociaciones en
`business_users`. Si hay varios negocios accesibles, ofrece un selector. Si no
hay ninguno, muestra un aviso y no permite editar. Cada escritura comprueba la
sesión y la asociación, filtra por el negocio y verifica que la base de datos
devuelva el registro modificado. RLS es quien impone los permisos en el servidor.

Las políticas existentes, revisadas con el esquema facilitado, restringen
`businesses`, `services`, `portfolio` y `appointments` mediante `auth.uid()`.
Esta entrega no modifica esas políticas ni añade altas de cuentas o negocios.

Con las políticas actuales, la miniweb solo se puede leer con una sesión que
tenga acceso. Una visita anónima muestra «La miniweb no está disponible…».
Si quieres publicar únicamente el negocio DEMO, revisa y ejecuta una vez
`supabase/002_optional_public_demo.sql`. Ese archivo es opcional y no se ejecuta
desde la web: abre lectura del DEMO, sus servicios y su portfolio; no abre citas,
asociaciones, escrituras ni otros negocios. Todo contenido futuro del mismo
negocio DEMO será público. Para otros negocios habrá que decidir su publicación
antes de añadir permisos de lectura pública.

## Datos y compatibilidad

- Negocio: nombre, descripción, ubicación (`address`), horario, redes, WhatsApp y
  enlace de reservas (`booking_url`). Los dos botones guardan únicamente sus campos.
- Servicios: nombre y precio numérico; el precio admite cero y dos decimales.
  No se presupone una moneda que el esquema no define.
- Portfolio: título, servicio, imagen (`image_url`) y nota (`description`).
- Citas: se conserva el enlace externo de reservas. La tabla `appointments` no se
  lee ni modifica porque la web original todavía no tiene gestión de citas.

Los datos del negocio ya no se guardan en `localStorage`. Supabase Auth utiliza
su almacenamiento de sesión habitual para mantener el acceso y renovar el token;
eso no almacena los servicios ni el portfolio. El botón de salida cierra la
sesión de este navegador y limpia el panel.

Los datos de la versión anterior, bajo `ia-manicuristas-demo-v1`, se dejan intactos
en el navegador. No se migran automáticamente para evitar asignar datos locales
al negocio equivocado. Se retira «Restablecer DEMO»: no debe borrar datos remotos.
No se insertan datos de ejemplo en Supabase.

## Organización

- `index.html` y `panel.html`: páginas originales con estados de carga y acceso.
- `styles.css`: diseño original formateado y estilos de los controles nuevos.
- `app.js`: renderizado de la miniweb y el panel, con texto escapado y enlaces validados.
- `main.js`: sesión, eventos de formularios y estados de la interfaz.
- `data.js`: consultas, mapeo de columnas y operaciones por negocio.
- `supabase-client.js`: configuración pública y cliente compartido.
- `supabase/`: ajuste mínimo del esquema y publicación opcional del DEMO.

## Verificación

Las dependencias de desarrollo son opcionales; no se necesitan para servir la web.
Para repetir las pruebas: `npm install`, `npx playwright install chromium` y
`npm test`. `npm run format:check` comprueba la indentación. Las pruebas normales
simulan Supabase; no envían credenciales ni modifican datos remotos. Para comprobar
también la carga anónima real, establece `LIVE_SUPABASE_CHECK=1` antes de ejecutarlas.
`BROWSER_CHANNEL=chrome` permite usar una instalación local de Chrome.

Pruebas de navegador realizadas con datos simulados, sin escribir en Supabase:
login correcto e incorrecto, negocio derivado de la sesión aunque se manipule la
URL, altas y bajas, filtros de las escrituras, errores y cero filas afectadas,
conservación de borradores, URLs no seguras, escape de HTML, cambio de cuenta,
salida, cuenta sin negocio y visualización móvil.

Se comprobó también la carga del SDK y del login contra el Supabase real sin
autenticación. Las pruebas simuladas no verifican las políticas del servidor.
Antes de fusionar o publicar, aplicar el SQL y comprobar con dos cuentas propias:

1. Cada cuenta ve únicamente sus negocios asociados y puede guardar sus cambios.
2. Una consulta o escritura autenticada contra un negocio ajeno resulta denegada
   o no afecta filas; probar también cambiando `business_id` en la petición.
3. `business_users` solo devuelve las asociaciones propias y no permite crearlas.
4. Al salir no quedan formularios con datos privados visibles.
5. Sin sesión, la miniweb sigue privada salvo que se aplique el SQL público opcional.

Referencias: [Supabase Auth](https://supabase.com/docs/guides/auth/passwords),
[claves públicas](https://supabase.com/docs/guides/getting-started/api-keys) y
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
