# IA Manicuristas — MVP

Primera versión del producto para profesionales de uñas y pestañas.

## Incluye ahora

- Miniweb pública (`index.html`)
- Panel profesional (`panel.html`)
- Servicios y precios
- Portfolio
- WhatsApp
- Enlace de reservas
- Ubicación, horarios y redes
- Persistencia local con `localStorage`

## Panel profesional

Navegación por Inicio, Mi negocio, Servicios y precios, Portfolio, Reservas,
WhatsApp y Configuración. El diseño se adapta a móvil y escritorio.

Inicio muestra citas y mensajes ficticios con la etiqueta DEMO. Los contadores
LOCAL reflejan los servicios y trabajos guardados, incluidos los ejemplos iniciales.
Las reservas y WhatsApp mantienen enlaces externos; no existe una agenda ni una
bandeja de mensajes conectada.

Se conserva la clave de almacenamiento original y los datos ya guardados.
El enlace antiguo `#contacto` sigue abriendo WhatsApp. Cambiar de sección o añadir
elementos no borra los borradores del negocio. Restablecer pide confirmación.
Los estilos del panel están separados en `panel.css` y su navegación en `panel.js`.

## Importante

Todos los datos incluidos por defecto están marcados como **DEMO**. No representan datos reales de Maura Nails.

Esta versión no tiene todavía backend, cuentas, base de datos, WhatsApp Business Platform/API, IA real, análisis de imágenes ni automatizaciones.

## Cómo probarlo

Abre `panel.html`, modifica los datos y guárdalos. Después abre `index.html` en el mismo navegador. Los cambios se conservan mediante `localStorage`.

## Próximos pasos previstos

1. Validar el flujo con una profesional real.
2. Mejorar la miniweb y el panel según sus necesidades.
3. Añadir backend, cuentas y base de datos.
4. Integrar reservas y WhatsApp Business Platform.
5. Añadir IA y análisis de imágenes cuando el flujo básico esté validado.

